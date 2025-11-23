# ===========================
# 0. IMPORTS & ENV SETUP
# ===========================
import os
import wave
import time
import numpy as np
import sounddevice as sd
import requests

from google import genai
from google.genai import types as genai_types

from speechbrain.pretrained import SpeakerRecognition
# import face_recognition

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
# 1. CONFIG
# ===========================

# 🔑 Set your Google API key
os.environ["GOOGLE_API_KEY"] = "YOUR_API"  # <-- replace

# Paths for biometric verification files
REGISTERED_VOICE = "registered.wav"
LIVE_VOICE = "live.wav"
REGISTERED_FACE = "registered.jpg"
LIVE_FACE = "image.jpeg"  # You said you will provide this manually

# ===========================
# 2. GOOGLE GENAI CLIENTS
# ===========================
genai_client = genai.Client()
llm_model = ChatGoogleGenerativeAI(model="gemini-2.5-flash")  # for LangChain + LangGraph

# ===========================
# 3. BASIC AUDIO HELPERS
# ===========================
def record_audio_to_wav(filename: str, duration: float = 5.0, samplerate: int = 16000):
    """Record audio from microphone and save to WAV."""
    print(f"[Mic] Recording {duration} seconds...")
    audio = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype="int16")
    sd.wait()
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(samplerate)
        wf.writeframes(audio.tobytes())
    print(f"[Mic] Saved to {filename}")

def tts_to_wav(text: str, filename: str = "response.wav"):
    """Use Gemini TTS to synthesize Tamil/English/etc response."""
    print("[TTS] Generating speech...")
    response = genai_client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=text,
        config=genai_types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=genai_types.SpeechConfig(
                voice_config=genai_types.VoiceConfig(
                    prebuilt_voice_config=genai_types.PrebuiltVoiceConfig(
                        voice_name="Orus"  # Tamil-capable voice
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
    print(f"[TTS] Saved to {filename}")
    # Optionally: play sound here using simpleaudio / pydub if you want.


def stt_from_wav(filename: str) -> str:
    """Use Gemini to transcribe speech from WAV into text."""
    print("[STT] Transcribing audio...")
    f = genai_client.files.upload(file=filename)
    prompt = "transcript the given speech to text, don't need the timestampe."
    response = genai_client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=[prompt, f],
    )
    text = response.text.strip()
    print(f"[STT] Transcript: {text}")
    return text

# ===========================
# 4. BIOMETRICS
# ===========================
print("[Auth] Loading speaker recognition model...")
speaker_model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb"
)

def verify_voice(registered_path: str = REGISTERED_VOICE, live_path: str = LIVE_VOICE) -> bool:
    """Verify that live voice matches registered voice."""
    print("[VoiceAuth] Verifying speaker...")
    score, prediction = speaker_model.verify_files(registered_path, live_path)
    print(f"[VoiceAuth] Match Score: {score}, Verified: {prediction}")
    return bool(prediction)

# def verify_face(registered_img: str = REGISTERED_FACE, live_img: str = LIVE_FACE) -> bool:
#     """Verify that live face matches registered face."""
#     print("[FaceAuth] Verifying face...")
#     known = face_recognition.load_image_file(registered_img)
#     known_encoding = face_recognition.face_encodings(known)[0]

#     live = face_recognition.load_image_file(live_img)
#     live_encoding = face_recognition.face_encodings(live)[0]

#     results = face_recognition.compare_faces([known_encoding], live_encoding)
#     distance = np.linalg.norm(known_encoding - live_encoding)
#     print(f"[FaceAuth] Match: {results[0]}, Distance: {distance}")
#     return bool(results[0])

# ===========================
# 5. TOOLS (BACKEND APIS + DB)
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

# 🔗 PostgreSQL + SQL Toolkit
db = SQLDatabase.from_uri(
    "postgresql://ghci_mobile_user:SN857Nb2Rj6iqjXcst9CQ7bntvnpbcx6@dpg-d4eb03fgi27c73cjeqm0-a.singapore-postgres.render.com/ghci_mobile"
)
sql_toolkit = SQLDatabaseToolkit(db=db, llm=llm_model)
db_tools = sql_toolkit.get_tools()

@tool
def transfer_funds(
    email: str,
    phone: str,
    from_acc: str,
    to_acc: str,
    amount: float,
    receiver_name: str,
    description: str = "Fund Transfer",
    from_upi: str = "8825728740@ibl",
    to_upi: str = ""
):
    """
    Transfer money between bank accounts using backend API.
    The LLM MUST first fetch the recipient's account number using name.
    Then call this tool with the correct payload.
    """

    url = "https://ghci-mobile-server.onrender.com/api/transaction/transferMoney"

    # Construct payload exactly as backend requires
    payload = {
        "email": email,
        "phone": phone,
        "account_no": from_acc,               # main account number
        "name": f"Money Transfer to {receiver_name}",
        "from_acc": from_acc,
        "to_acc": to_acc,
        "amount": amount,
        "sender_details": "Bhadri",           # Replace with actual sender name if available
        "type": "Debit",
        "description": description,
        "from_upi": from_upi,
        "to_upi": to_upi,
        "pin": "1234"                       # Default PIN for testing
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()

    except Exception as e:
        return {"error": f"Transfer Error: {str(e)}"}


# Combine all tools
tools = db_tools + [
    get_account_balance,
    transfer_funds,
    get_user_info,
    get_card_details,
    get_load_details,
    get_available_loans,
    get_mypolicies,
    get_available_policies,
    get_myinsurance_details,
    get_available_insurances,
    get_transaction_history,
]

model_with_tools = llm_model.bind_tools(tools)

# ===========================
# 6. LANGGRAPH AGENT (BRAIN + TOOLS + REPHRASE)
# ===========================
class State(TypedDict):
    messages: Annotated[List[AnyMessage], operator.add]

SYSTEM_PROMPT = """
You are a Financial AI Agent for a banking system.
Your job is to assist the user by calling the correct backend APIs through tools.
You MUST NOT answer from your own knowledge. You MUST ALWAYS use the correct tool for any banking-related request.

---

### USER'S DEFAULT ACCOUNT DETAILS (Use these automatically when needed):
- email: bhadri@gmail.com
- phone: 9876543210
- account_no: ACC1001
- from_upi: 8825728740@ibl
- sender_name: Bhadri

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


def brain(state: State):
    return {
        "messages": [
            model_with_tools.invoke(
                [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
            )
        ]
    }

def rephrase(state: State):
    last = state["messages"][-1]  # typically ToolMessage or AIMessage
    system_msg = SystemMessage(
        content=(
            "You are a banking assistant. Convert the following tool result or internal message "
            "into a short, clear, friendly answer for the user. Do NOT hallucinate. "
            "Use only the data given."
        )
    )
    user_msg = {"role": "user", "content": f"Tool Output:\n{last.content}"}
    response = llm_model.invoke([system_msg, user_msg])
    return {"messages": [response]}

def route_after_brain(state: State):
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return "rephrase"

def route_after_tools(state: State):
    last_ai = None
    for msg in reversed(state["messages"]):
        if isinstance(msg, AIMessage):
            last_ai = msg
            break
    if last_ai and last_ai.tool_calls:
        return "brain"
    return "rephrase"

agent_graph = StateGraph(State)
agent_graph.add_node("brain", brain)
agent_graph.add_node("tools", ToolNode(tools))
agent_graph.add_node("rephrase", rephrase)

agent_graph.add_edge(START, "brain")
agent_graph.add_conditional_edges("brain", route_after_brain, ["tools", "rephrase"])
agent_graph.add_conditional_edges("tools", route_after_tools, ["brain", "rephrase"])
agent_graph.add_edge("rephrase", END)

agent = agent_graph.compile()

conversation_state = {"messages": []}

def run_agent(text: str) -> str:
    res = agent.invoke({
            "messages": conversation_state["messages"] + [
                {"type": "human", "content": text}
            ]
        })
    return res["messages"][-1].content

# ===========================
# 7. INTENT HELPER (SENSITIVE ACTIONS)
# ===========================
def classify_intent(text: str) -> str:
    """
    Returns: "sensitive" or "safe"
    """

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


def verify_face_api(image_path: str = "image.jpeg") -> bool:
    """
    Sends an image to the local face verification API.
    Expects response format:
       {"verified": true, "similarity": 0.5567}

    Returns:
        True  → Face matches
        False → Face mismatch / API error
    """
    url = "http://10.210.4.16:8000/face-verify-frame"

    try:
        with open(image_path, "rb") as f:
            files = {"file": f}
            response = requests.post(url, files=files, timeout=10)

        response.raise_for_status()
        data = response.json()

        verified = data.get("verified", False)
        similarity = data.get("similarity", None)

        print(f"[FaceAuth] Verified: {verified}, Similarity: {similarity}")
        return bool(verified)

    except Exception as e:
        print(f"[FaceAuth] API error: {e}")
        return False


# ===========================
# 8. MAIN LOOP: CONTINUOUS VOICE ASSISTANT
# ===========================
print("\n=== Secure Banking Voice Assistant Started ===")
print("Say 'exit' or 'quit' to stop.\n")

while True:
    user_input=int(input("Press 1 to continue or 0 to exit: "))
    if user_input==1:
        # 1) Record audio from mic
        record_audio_to_wav(LIVE_VOICE, duration=5.0)

        # 2) Voice verification
        if not verify_voice(REGISTERED_VOICE, LIVE_VOICE):
            msg = "Voice verification failed. Please try again."
            print("[Auth] " + msg)
            # tts_to_wav(msg, "auth_failed.wav")
            # (Optionally play auth_failed.wav here)
            continue

        # 3) STT → text
        user_text = stt_from_wav(LIVE_VOICE)
        print(f"\nUser (transcribed): {user_text}")

        ##4) If sensitive → require face verification
        if classify_intent(user_text) == "sensitive":
            print("[Flow] Sensitive action detected. Running face verification...")

            if not verify_face_api(LIVE_FACE):  
                msg = "Face verification failed. Cannot proceed with this action."
                print("[Auth] " + msg)
                # tts_to_wav(msg, "face_failed.wav")
                continue

            print("[Auth] Face verified successfully.")


        
        # 5) Run agent (LangGraph)
        print("[Agent] Thinking...")
        agent_reply = run_agent(user_text)
        print("Agent:", agent_reply)

        # 6) TTS for reply
        tts_to_wav(agent_reply, "agent_reply.wav")
        # (Optionally play agent_reply.wav here)

        print("--------------------------------------------------")
        time.sleep(1)
    else:
        print("Exiting assistant.")
        break
