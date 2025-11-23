# ===========================
# FastAPI Banking Voice Assistant
# ===========================

## TO RUN THIS FILE: uvicorn api:app --host 0.0.0.0 --port 8000 --reload


import os
import wave
import tempfile
import base64
import uuid
from typing import Optional
from contextlib import asynccontextmanager

import numpy as np
import requests
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from google import genai 
from google.genai import types as genai_types

from speechbrain.pretrained import SpeakerRecognition

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import tool
from langchain.messages import AnyMessage, SystemMessage, AIMessage, ToolMessage
  
from typing import List
from typing_extensions import TypedDict, Annotated
import operator

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit

# ===========================
# CONFIG
# ===========================
os.environ["GOOGLE_API_KEY"] = "YOUR_GOOGLE_API_KEY_HERE"

REGISTERED_VOICE = "registered.wav"
FACE_VERIFY_URL = "http://<FACE_AUTH_API>/face-verify-frame"

# ===========================
# GLOBAL OBJECTS
# ===========================
genai_client = None
llm_model = None
speaker_model = None
agent = None
db = None
conversation_states = {}  # session_id -> {"messages": []}


pending_requests = {}

# ===========================
# PYDANTIC MODELS
# ===========================
class TextQuery(BaseModel):
    text: str
    session_id: str = "default"

class TTSRequest(BaseModel):
    text: str
    voice_name: str = "Orus"

class AuthResponse(BaseModel):
    verified: bool
    message: str

class FaceVerifyRequest(BaseModel):
    request_id: str

# ===========================
# HELPER FUNCTIONS
# ===========================
def tts_to_wav(text: str, filename: str = "response.wav", voice_name: str = "Orus"):
    """Use Gemini TTS to synthesize speech."""
    response = genai_client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=text,
        config=genai_types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name=voice_name
                    )
                )
            ),
        ),
    )
    pcm = response.candidates[0].content.parts[0].inline_data.data
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(pcm)
    return filename
  
def stt_from_wav(filename: str) -> str:
    """Transcribe speech from WAV to text using Gemini."""
    f = genai_client.files.upload(file=filename)
    response = genai_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=["Transcribe the audio clearly. No timestamps.", f],
    )
    return response.text.strip()

def verify_voice(registered_path: str, live_path: str) -> tuple[bool, float]:
    """Verify speaker identity."""
    score, prediction = speaker_model.verify_files(registered_path, live_path)
    return bool(prediction), float(score)

def verify_face_api(image_path: str) -> tuple[bool, Optional[float]]:
    """Send image to face verification API."""
    try:
        with open(image_path, "rb") as f:
            files = {"file": f}
            response = requests.post(FACE_VERIFY_URL, files=files, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get("verified", False), data.get("similarity")
    except Exception as e:
        print(f"[FaceAuth] Error: {e}")
        return False, None

def classify_intent(text: str) -> str:
    """Classify user intent as sensitive or safe."""
    prompt = f"""
    Classify the user's intent STRICTLY into one category.

    Categories:
    1. sensitive → transferring money, paying, sending funds,
                   retrieving card details, loan details,
                   insurance details, policy details,
                   viewing transaction history.
    2. safe → checking account balance, asking about previous query,
              greetings, chit-chat, general bank info, user details.

    User query: {text}

    Return only one word: sensitive or safe.
    """
    result = llm_model.invoke(prompt).content.strip().lower()
    return "sensitive" if "sensitive" in result else "safe"

def get_conversation_state(session_id: str) -> dict:
    """Get or create conversation state for session."""
    if session_id not in conversation_states:
        conversation_states[session_id] = {"messages": []}
    return conversation_states[session_id]

def run_agent(text: str, session_id: str) -> str:
    """Run the LangGraph agent."""
    state = get_conversation_state(session_id)
    res = agent.invoke({
        "messages": state["messages"] + [{"type": "human", "content": text}]
    })
    state["messages"] = res["messages"]
    return res["messages"][-1].content

def create_pending_request(text: str, session_id: str, intent: str, voice_score: float = None) -> str:
    """Create a pending request waiting for face verification."""
    request_id = str(uuid.uuid4())
    pending_requests[request_id] = {
        "text": text,
        "session_id": session_id,
        "intent": intent,
        "voice_score": voice_score,
        "created_at": import_time()
    }
    return request_id

def import_time():
    import time
    return time.time()

def cleanup_old_pending_requests(max_age_seconds: int = 600):
    """Remove pending requests older than max_age_seconds (default 10 minutes)."""
    import time
    current_time = time.time()
    expired = [rid for rid, data in pending_requests.items() 
               if current_time - data.get("created_at", 0) > max_age_seconds]
    for rid in expired:
        del pending_requests[rid]
        print(f"[Cleanup] Removed expired request: {rid}")

# ===========================
# TOOLS (same as before)
# ===========================
@tool
def get_account_balance(email: str, phone: str, account_no: str):
    """Get the bank account balance by calling backend API."""
    url = "https://ghci-mobile-server.onrender.com/api/account/getAccountBalance"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Account Balance: {r.json()}"
    except Exception as e:
        return f"Error fetching balance: {str(e)}"

@tool
def get_user_info(email: str, phone: str, account_no: str):
    """Get the user details by email, phone and account number."""
    url = "https://ghci-mobile-server.onrender.com/api/account/getAccountDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"User Information: {r.json()}"
    except Exception as e:
        return f"Error fetching user info: {str(e)}"

@tool
def get_card_details(email: str, phone: str, account_no: str):
    """Get card details."""
    url = "https://ghci-mobile-server.onrender.com/api/cards/getCardsDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Card Details: {r.json()}"
    except Exception as e:
        return f"Error fetching card details: {str(e)}"

@tool
def get_load_details(email: str, phone: str, account_no: str):
    """Get loan details."""
    url = "https://ghci-mobile-server.onrender.com/api/loans/getLoanDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Loan Details: {r.json()}"
    except Exception as e:
        return f"Error fetching loan details: {str(e)}"

@tool
def get_available_loans(email: str, phone: str, account_no: str):
    """Get available loans."""
    url = "https://ghci-mobile-server.onrender.com/api/loan/getAvailLoanDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Available Offers: {r.json()}"
    except Exception as e:
        return f"Error fetching available offers: {str(e)}"

@tool
def get_mypolicies(email: str, phone: str, account_no: str):
    """Get user's policies."""
    url = "https://ghci-mobile-server.onrender.com/api/policy/getMyPolicyDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Insurance Policies: {r.json()}"
    except Exception as e:
        return f"Error fetching insurance policies: {str(e)}"

@tool
def get_available_policies(email: str, phone: str, account_no: str):
    """Get available policies."""
    url = "https://ghci-mobile-server.onrender.com/api/policy/getAvailPolicyDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Available Policies: {r.json()}"
    except Exception as e:
        return f"Error fetching available policies: {str(e)}"

@tool
def get_myinsurance_details(email: str, phone: str, account_no: str):
    """Get user insurance details."""
    url = "https://ghci-mobile-server.onrender.com/api/insurance/getMyInsuranceDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Insurance Details: {r.json()}"
    except Exception as e:
        return f"Error fetching insurance details: {str(e)}"

@tool
def get_available_insurances(email: str, phone: str, account_no: str):
    """Get available insurances."""
    url = "https://ghci-mobile-server.onrender.com/api/insurance/getAvailInsuranceDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Available Insurances: {r.json()}"
    except Exception as e:
        return f"Error fetching available insurances: {str(e)}"

@tool
def get_transaction_history(email: str, phone: str, account_no: str):
    """Get transaction history."""
    url = "https://ghci-mobile-server.onrender.com/api/transaction/getTransactionsDetails"
    payload = {"email": email, "phone": phone, "account_no": account_no}
    try:
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        return f"Transaction History: {r.json()}"
    except Exception as e:
        return f"Error fetching transaction history: {str(e)}"

@tool
def transfer_funds(
    email: str, phone: str, from_acc: str, to_acc: str,
    amount: float, receiver_name: str, description: str = "Fund Transfer",
    from_upi: str = "8825728740@ibl", to_upi: str = ""
):
    """Transfer money between bank accounts using backend API."""
    url = "https://ghci-mobile-server.onrender.com/api/transaction/transferMoney"
    payload = {
        "email": email, "phone": phone, "account_no": from_acc,
        "name": f"Money Transfer to {receiver_name}",
        "from_acc": from_acc, "to_acc": to_acc, "amount": amount,
        "sender_details": "Bhadri", "type": "Debit",
        "description": description, "from_upi": from_upi,
        "to_upi": to_upi, "pin": "1234"
    }
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": f"Transfer Error: {str(e)}"}

# ===========================
# LANGGRAPH SETUP
# ===========================
SYSTEM_PROMPT = """
You are a Financial AI Agent for a banking system.
Your job is to assist the user by calling the correct backend APIs through tools.
You MUST NOT answer from your own knowledge. You MUST ALWAYS use the correct tool for any banking-related request.

---

### USER'S DEFAULT ACCOUNT DETAILS:
If the user does not provide these details explicitly, you MUST use the above stored values by default.

---

### AVAILABLE OPERATIONS:
You can assist the user with:
- Fetching user details
- Fetching account details
- Getting account balance
- Getting card details
- Getting loan details and available loans
- Getting insurance details and available insurances
- Getting policy details and available policies
- Getting transaction history
- Fetching account number (via name lookup)
- Transferring funds between accounts

---

### IMPORTANT SECURITY & LOGIC RULES:

1. When the user asks for ANY financial information, ALWAYS call the correct tool.
2. Use the stored user details by default:
   - email → bhadri@gmail.com
   - phone → 9876543210
   - from_acc → ACC1001
   - from_upi → 8825728740@ibl
   - sender_name → "Bhadri"

3. FETCHING DATA FOR FUND TRANSFERS:
   - The **transfer_funds** tool requires:
        • email  
        • phone  
        • from_acc  
        • to_acc  
        • amount  
        • receiver_name  
        • description  
        • from_upi  
        • to_upi 

   - For ANY missing field, the LLM MUST:
       • FIRST call the appropriate tool to retrieve it from the backend  
       • NEVER guess or hallucinate  
       • Example: to_acc must be fetched using a tool (based on receiver_name)

4. TRANSFERRING FUNDS:
   - If user says:
       “Send ₹1500 to Ramesh”
       “Transfer money to Kalif”
       “Pay 500 to my friend Karthik”

   - You MUST:
       1. Extract receiver_name from the query
       2. Call the database tool to fetch:
            - receiver account number (to_acc)
            - receiver UPI if available (to_upi)
       3. Use sender details from defaults or from DB
       4. If amount is missing → ask “How much should I transfer?”
       5. Only AFTER collecting all required fields, call **transfer_funds**
 

5. Always extract additional required fields:
   - card_no
   - loan_id
   - policy_no
   - date ranges for transactions
   - receiver name (for fund transfers)

6. If the user gives incomplete details, ALWAYS ask for clarification first.

7. NEVER hallucinate or assume ANY values.
   ONLY use values returned by backend tools or explicitly given by the user.

8. After a tool returns, summarize it in a:
   - short
   - friendly
   - professional
   - accurate  
   way.

9. If any tool returns an error, clearly explain it and do not hallucinate results.

---

### EXAMPLE BEHAVIORS:

- “Get my balance”
  → Use getAccountBalance with account_no=ACC1001 (default).

- “Show my loan details”
  → Use getMyLoanDetails.

- “What is my transaction history for last month?”
  → Use getTransactionsDetails with correct date range.

- “What policies do I have?”
  → Use getMyPolicyDetails.

- “Transfer ₹500 to Ramesh”
  → Extract: receiver_name="Ramesh"
  → Call tool to fetch Ramesh's account_no and UPI
  → Then call transfer_funds with:
       email="bhadri@gmail.com"
       phone="9876543210"
       from_acc="ACC1001"
       to_acc=<fetched account number>
       amount=500
       receiver_name="Ramesh"
       description="Fund Transfer to Ramesh"
       from_upi="8825728740@ibl"
       to_upi=<fetched upi>

---

### MEMORY RULE:
You ARE allowed to use past messages from conversation_state["messages"]
to answer user questions such as:
- "What did I ask before?"
- "What was my last question?"
- "Repeat my previous query."
These are allowed even though they are not banking queries.
You should still follow all other banking rules,
but memory questions ARE allowed and should be answered.

Your ONLY job is to:
- Understand the user's intent
- Choose and call the correct tool
- Fetch ALL required fields from tools before calling transfer_funds
- NEVER hallucinate values
- Use stored account details by default
- Produce a short, friendly final response based only on tool outputs
"""

class State(TypedDict):
    messages: Annotated[List[AnyMessage], operator.add]

def create_agent():
    """Create and compile the LangGraph agent."""
    global db
    
    db = SQLDatabase.from_uri(
        "postgresql://ghci_mobile_user:SN857Nb2Rj6iqjXcst9CQ7bntvnpbcx6@dpg-d4eb03fgi27c73cjeqm0-a.singapore-postgres.render.com/ghci_mobile"
    )
    sql_toolkit = SQLDatabaseToolkit(db=db, llm=llm_model)
    db_tools = sql_toolkit.get_tools()
    
    tools = db_tools + [
        get_account_balance, transfer_funds, get_user_info,
        get_card_details, get_load_details, get_available_loans,
        get_mypolicies, get_available_policies, get_myinsurance_details,
        get_available_insurances, get_transaction_history,
    ]
    
    model_with_tools = llm_model.bind_tools(tools)
    
    def brain(state: State):
        return {
            "messages": [
                model_with_tools.invoke(
                    [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
                )
            ]
        }
    
    def rephrase(state: State):
        last = state["messages"][-1]
        system_msg = SystemMessage(content=(
            "You are a banking assistant. Convert the tool result into a short, "
            "clear, friendly answer. Do NOT hallucinate."
        ))
        user_msg = {"role": "user", "content": f"Tool Output:\n{last.content}"}
        response = llm_model.invoke([system_msg, user_msg])
        return {"messages": [response]}
    
    def route_after_brain(state: State):
        last = state["messages"][-1]
        if isinstance(last, AIMessage) and last.tool_calls:
            return "tools"
        return "rephrase"
    
    def route_after_tools(state: State):
        for msg in reversed(state["messages"]):
            if isinstance(msg, AIMessage):
                if msg.tool_calls:
                    return "brain"
                break
        return "rephrase"
    
    graph = StateGraph(State)
    graph.add_node("brain", brain)
    graph.add_node("tools", ToolNode(tools))
    graph.add_node("rephrase", rephrase)
    
    graph.add_edge(START, "brain")
    graph.add_conditional_edges("brain", route_after_brain, ["tools", "rephrase"])
    graph.add_conditional_edges("tools", route_after_tools, ["brain", "rephrase"])
    graph.add_edge("rephrase", END)
    
    return graph.compile()

# ===========================
# FASTAPI APP
# ===========================
@asynccontextmanager
async def lifespan(app: FastAPI):
    global genai_client, llm_model, speaker_model, agent
    
    print("[Startup] Initializing models...")
    genai_client = genai.Client()
    llm_model = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
    
    print("[Startup] Loading speaker recognition model...")
    speaker_model = SpeakerRecognition.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb"
    )
    
    print("[Startup] Creating LangGraph agent...")
    agent = create_agent()
    
    print("[Startup] Ready!")
    yield
    print("[Shutdown] Cleaning up...")

app = FastAPI(
    title="Banking Voice Assistant API",
    description="Secure banking assistant with voice/face authentication",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================
# ENDPOINTS
# ===========================
@app.get("/")
async def root():
    return {"message": "Banking Voice Assistant API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "models_loaded": agent is not None}

# --- Authentication Endpoints ---
@app.post("/auth/verify-voice", response_model=AuthResponse)
async def verify_voice_endpoint(audio: UploadFile = File(...)):
    """Verify speaker identity from audio file."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    
    try:
        verified, score = verify_voice(REGISTERED_VOICE, tmp_path)
        return AuthResponse(
            verified=verified,
            message=f"Voice verification {'passed' if verified else 'failed'}. Score: {score:.4f}"
        )
    finally:
        os.unlink(tmp_path)

@app.post("/auth/verify-face", response_model=AuthResponse)
async def verify_face_endpoint(image: UploadFile = File(...)):
    """Verify face identity from image file."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(await image.read())
        tmp_path = tmp.name
    
    try:
        verified, similarity = verify_face_api(tmp_path)
        return AuthResponse(
            verified=verified,
            message=f"Face verification {'passed' if verified else 'failed'}. Similarity: {similarity}"
        )
    finally:
        os.unlink(tmp_path)

# --- Speech Endpoints ---
@app.post("/speech/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """Convert speech audio to text."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    
    try:
        text = stt_from_wav(tmp_path)
        return {"text": text}
    finally:
        os.unlink(tmp_path)

@app.post("/speech/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech audio."""
    output_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    tts_to_wav(request.text, output_file, request.voice_name)
    return FileResponse(output_file, media_type="audio/wav", filename="response.wav")

# ===========================
# MAIN AGENT ENDPOINTS (TWO-STEP FLOW)
# ===========================

@app.post("/agent/text")
async def agent_text_query(
    text: str = Form(...),
    session_id: str = Form(default="default")
):
    """
    Text query endpoint - Step 1
    
    Flow:
    1. Classify intent (sensitive/safe)
    2. If SAFE → run agent immediately, return response
    3. If SENSITIVE → create pending request, return request_id for face verification
    
    Mobile app should:
    - If requires_face_auth=true → open camera, capture face, call /agent/verify-face
    - If requires_face_auth=false → display response directly
    """
    cleanup_old_pending_requests()
    
    # 1. Classify intent
    intent = classify_intent(text)
    
    # 2. If SAFE, process immediately
    if intent == "safe":
        response = run_agent(text, session_id)
        return {
            "status": "success",
            "requires_face_auth": False,
            "text": text,
            "intent": intent,
            "response": response,
            "session_id": session_id
        }
    
    # 3. If SENSITIVE, create pending request
    request_id = create_pending_request(text, session_id, intent)
    
    return {
        "status": "pending",
        "requires_face_auth": True,
        "request_id": request_id,
        "text": text,
        "intent": intent,
        "message": "Sensitive action detected. Please verify your face to continue.",
        "session_id": session_id
    }


@app.post("/agent/voice")
async def agent_voice_query(
    audio: UploadFile = File(...),
    session_id: str = Form(default="default")
):
    """
    Voice query endpoint - Step 1
    
    Flow:
    1. Verify voice (always required)
    2. Transcribe speech to text (STT)
    3. Classify intent (sensitive/safe)
    4. If SAFE → run agent immediately
    5. If SENSITIVE → create pending request, return request_id
    
    Mobile app should:
    - If requires_face_auth=true → open camera, capture face, call /agent/verify-face
    - If requires_face_auth=false → display response directly
    """
    cleanup_old_pending_requests()
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as audio_tmp:
        audio_tmp.write(await audio.read())
        audio_path = audio_tmp.name
    
    try:
        # 1. Voice verification
        voice_verified, voice_score = verify_voice(REGISTERED_VOICE, audio_path)
        if not voice_verified:
            return JSONResponse(
                status_code=401,
                content={
                    "status": "error",
                    "error": "Voice verification failed",
                    "voice_score": float(voice_score)
                }
            )
        
        # 2. Speech to text
        user_text = stt_from_wav(audio_path)
        
        # 3. Classify intent
        intent = classify_intent(user_text)
        
        # 4. If SAFE, process immediately
        if intent == "safe":
            response = run_agent(user_text, session_id)
            return {
                "status": "success",
                "requires_face_auth": False,
                "transcribed_text": user_text,
                "intent": intent,
                "response": response,
                "session_id": session_id,
                "voice_verified": True,
                "voice_score": float(voice_score)
            }
        
        # 5. If SENSITIVE, create pending request
        request_id = create_pending_request(
            text=user_text,
            session_id=session_id,
            intent=intent,
            voice_score=voice_score
        )
        
        return {
            "status": "pending",
            "requires_face_auth": True,
            "request_id": request_id,
            "transcribed_text": user_text,
            "intent": intent,
            "message": "Sensitive action detected. Please verify your face to continue.",
            "session_id": session_id,
            "voice_verified": True,
            "voice_score": float(voice_score)
        }
    
    finally:
        os.unlink(audio_path)


@app.post("/agent/verify-face")
async def agent_verify_face_and_process(
    request_id: str = Form(...),
    face_image: UploadFile = File(...)
):
    """
    Face verification endpoint - Step 2
    
    Called by mobile app after capturing face image.
    
    Flow:
    1. Get pending request by request_id
    2. Verify face image
    3. If verified → run agent with original query
    4. Return response or error
    """
    print(f"[FaceVerify] Received request_id: {request_id}")
    print(f"[FaceVerify] Current pending requests: {list(pending_requests.keys())}")
    
    # 1. Get pending request
    if request_id not in pending_requests:
        print(f"[FaceVerify] Request ID not found: {request_id}")
        return JSONResponse(
            status_code=404,
            content={
                "status": "error",
                "error": "Request not found or expired",
                "message": "Please submit your query again.",
                "available_requests": list(pending_requests.keys())
            }
        )
    
    pending = pending_requests[request_id]
    print(f"[FaceVerify] Found pending request: {pending['text'][:50]}")
    
    # Save face image
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as face_tmp:
        content = await face_image.read()
        face_tmp.write(content)
        face_path = face_tmp.name
        print(f"[FaceVerify] Saved face image to: {face_path}, size: {len(content)} bytes")
    
    try:
        # 2. Verify face
        print(f"[FaceVerify] Calling face verification API...")
        face_verified, similarity = verify_face_api(face_path)
        print(f"[FaceVerify] Result - Verified: {face_verified}, Similarity: {similarity}")
        
        if not face_verified:
            return JSONResponse(
                status_code=401,
                content={
                    "status": "error",
                    "error": "Face verification failed",
                    "similarity": similarity,
                    "text": pending["text"],
                    "intent": pending["intent"]
                }
            )
        
        # 3. Run agent with original query
        print(f"[FaceVerify] Running agent...")
        response = run_agent(pending["text"], pending["session_id"])
        print(f"[FaceVerify] Agent response: {response[:100]}")
        
        # 4. Clean up pending request
        del pending_requests[request_id]
        print(f"[FaceVerify] Cleaned up request_id: {request_id}")
        
        result = {
            "status": "success",
            "text": pending["text"],
            "intent": pending["intent"],
            "response": response,
            "session_id": pending["session_id"],
            "face_verified": True,
            "similarity": similarity
        }
        
        # Include voice score if it was a voice request
        if pending.get("voice_score") is not None:
            result["voice_score"] = pending["voice_score"]
        
        return result
    
    except Exception as e:
        print(f"[FaceVerify] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": str(e),
                "message": "Internal server error during face verification"
            }
        )
    
    finally:
        if os.path.exists(face_path):
            os.unlink(face_path)


# --- Session Management ---
@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get conversation history for a session."""
    if session_id not in conversation_states:
        raise HTTPException(status_code=404, detail="Session not found")
    
    state = conversation_states[session_id]
    return {
        "session_id": session_id,
        "message_count": len(state["messages"]),
        "messages": [
            {"type": type(m).__name__, "content": str(m.content)[:200]}
            for m in state["messages"]
        ]
    }

@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear conversation history for a session."""
    if session_id in conversation_states:
        del conversation_states[session_id]
    return {"message": f"Session {session_id} cleared"}

@app.get("/sessions")
async def list_sessions():
    """List all active sessions."""
    return {
        "sessions": [
            {"id": sid, "messages": len(state["messages"])}
            for sid, state in conversation_states.items()
        ]
    }

# --- Utility ---
@app.post("/classify-intent")
async def classify_intent_endpoint(text: str = Form(...)):
    """Classify user intent as sensitive or safe."""
    intent = classify_intent(text)
    return {"text": text, "intent": intent}

@app.get("/pending-requests")
async def list_pending_requests():
    """List pending requests (for debugging)."""
    cleanup_old_pending_requests()
    return {
        "count": len(pending_requests),
        "requests": [
            {"id": rid, "text": data["text"][:50], "intent": data["intent"]}
            for rid, data in pending_requests.items()
        ]
    }

# ===========================
# RUN
# ===========================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)