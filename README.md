📱 AI Banking Assistant – Full Project README

This repository contains the complete source code for the AI Banking Assistant, including:

Mobile App (React Native)

Python Backend API (FastAPI)

Face Authentication API (dlib + face_recognition)

Agentic AI Modules

SpeechBrain Voice Biometric

Gemini 2.5 Flash / Flash-Lite Integration

🚀 Project Structure
root/
│
├── application/               # React Native application
│   ├── client/                # Frontend mobile app
│   └── server/                # Node server (optional, if used)
│
├── python-backend/            # Main Python API (FastAPI)
│   ├── api.py                 # Banking assistant backend
│   ├── agent/                 # AI agent logic
│   ├── speech/                # ASR + TTS + voice biometrics
│   └── requirements.txt
│
└── face-auth-api/             # Face authentication microservice
    ├── face_api.py
    └── requirements.txt

⚠️ Important Notes (MUST READ Before Setup)
🔹 Python version MUST be 3.10

dlib, face_recognition break on Python 3.11+

torchaudio wheels unavailable for 3.12

numpy must be < 2.0 because SpeechBrain requires it

🔹 PyTorch & torchaudio must match CUDA version

Required versions:

torch==2.3.0+cu121
torchaudio==2.3.0+cu121

🔹 Do NOT use NumPy 2.x

The environment forces:

numpy==1.26.4

🔹 Remove conflicting HuggingFace libraries

Run this twice:

pip uninstall -y huggingface_hub
pip uninstall -y transformers
pip uninstall -y datasets
pip uninstall -y tokenizers
pip uninstall -y safetensors
pip uninstall -y accelerate
pip uninstall -y huggingface_hub

📦 Install Compatible Versions (Working Build)

Use this exactly (tested & stable):

pip install huggingface_hub==0.23.0
pip install transformers==4.41.2
pip install datasets==2.19.0
pip install safetensors==0.4.2
pip install tokenizers==0.19.1
pip install accelerate==0.30.0

pip install numpy==1.26.4
pip install scipy
pip install pandas

✅ Install PyTorch + torchaudio (GPU – CUDA 12.1)
pip install torch==2.3.0+cu121 \
  torchaudio==2.3.0+cu121 \
  --extra-index-url https://download.pytorch.org/whl/cu121

🎤 Audio & Speech
pip install soundfile sounddevice
pip install speechbrain==0.5.16

🤖 AI + LLM Frameworks
pip install google-genai
pip install langchain-google-genai
pip install langchain langgraph langchain-community

🛢️ Database & Essentials
pip install sqlalchemy typing_extensions requests psycopg2

📱 1. Running the Mobile App (React Native)
Navigate to the app folder:
cd application/client

Install dependencies:
npm install

Start Metro:
npm start

Run on Android:
npm run android

Run on iOS (macOS only):
npm run ios

🐍 2. Running the Python Backend (Main FastAPI Server)
Navigate:
cd python-backend

Install dependencies:
pip install -r requirements.txt

Run server:
uvicorn api:app --host 0.0.0.0 --port 8000 --reload

API will be live at:
http://localhost:8000

👤 3. Running the Face Authentication API
Navigate:
cd face-auth-api

Install dependencies:
pip install -r requirements.txt

Start service:
uvicorn face_api:app --host 0.0.0.0 --port 9000 --reload

API URL:
http://localhost:9000/face-verify

🔌 4. Connecting the Mobile App → Python Backend

Inside application/client/config.js (or env file):

export const API_BASE_URL = "http://YOUR_LOCAL_IP:8000";
export const FACE_API_BASE_URL = "http://YOUR_LOCAL_IP:9000";


To find IP:

ipconfig


Use Wi-Fi IPv4 Address.

🤖 5. Core Features Included

Voice biometrics using SpeechBrain ECAPA model

Face authentication using dlib + face_recognition

Gemini 2.5 Flash-Lite STT/Intent

Agentic pipeline (LangGraph)

Secure transaction intent classification

TTS via Google GenAI

Audio recording utilities

Fund-transfer workflow

OTP + multi-factor authentication

🧩 6. Troubleshooting
❌ dlib installation fails

→ Ensure Python 3.10
→ Install this:

pip install cmake==3.26.4

❌ Face recognition fails to import
pip install face_recognition
pip install dlib-bin

❌ PyTorch "No matching wheels"

Install exactly:

torch==2.3.0+cu121
torchaudio==2.3.0+cu121

❌ NumPy errors
pip install numpy==1.26.4 --force-reinstall

🏁 7. Summary of What to Run
Start React Native App
cd application/client
npm start
npm run android

Start Main Python Backend
cd python-backend
uvicorn api:app --reload

Start Face Authentication API
cd face-auth-api
uvicorn face_api:app --reload