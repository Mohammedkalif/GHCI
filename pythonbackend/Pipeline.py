import time
import cv2
import numpy as np
import json
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel

# ============================================================
# FACE RECOGNITION CONFIG
# ============================================================
from insightface.app import FaceAnalysis

DB_PATH = "face_data.json"
MODEL_NAME = "buffalo_s"
CTX_ID = 0
DET_SIZE = (640, 640)
MIN_DET_CONFIDENCE = 0.40
SIMILARITY_THRESHOLD = 0.55


# ============================================================
# LOAD REGISTERED USER
# ============================================================
def l2_normalize(x):
    x = np.array(x, dtype=np.float32)
    norm = np.linalg.norm(x)
    return x / norm if norm > 0 else x


def cosine_similarity(a, b):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    an = np.linalg.norm(a)
    bn = np.linalg.norm(b)
    return float(np.dot(a, b) / (an * bn)) if an > 0 and bn > 0 else 0.0


def load_registered_centroid():
    try:
        with open(DB_PATH, "r") as f:
            data = json.load(f)

        stored = [np.array(e, dtype=np.float32) for e in data["embeddings"]]
        centroid = np.mean(np.stack(stored), axis=0)
        print("[INFO] Registered user loaded.")
        return l2_normalize(centroid)

    except Exception as e:
        print("[WARN] No registered user found:", e)
        return None


CENTROID = load_registered_centroid()


# Load InsightFace
print("[INFO] Loading InsightFace model...")
face_app = FaceAnalysis(name=MODEL_NAME)
face_app.prepare(ctx_id=CTX_ID, det_size=DET_SIZE)
print("[INFO] InsightFace ready.")


# ============================================================
# FASTAPI APP
# ============================================================
app = FastAPI(title="Unified API Server", version="1.0")


# ============================================================
# FACE VERIFICATION FROM UPLOADED FRAME
# ============================================================
@app.post("/face-verify-frame")
async def face_verify_frame(file: UploadFile = File(...)):

    if CENTROID is None:
        return {"verified": False, "similarity": 0.0, "error": "No registered user"}

    # Read raw bytes → decode to image
    img_bytes = await file.read()
    npimg = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    faces = face_app.get(frame)

    if len(faces) == 0:
        return {
            "verified": False,
            "similarity": 0.0,
            "error": "No face detected"
        }

    face = faces[0]
    score = float(face.det_score)

    if score < MIN_DET_CONFIDENCE:
        return {
            "verified": False,
            "similarity": 0.0,
            "error": "Low detection confidence"
        }

    # Compute similarity
    live_emb = l2_normalize(face.embedding)
    sim = cosine_similarity(live_emb, CENTROID)

    return {
        "verified": sim >= SIMILARITY_THRESHOLD,
        "similarity": round(sim, 4)
    }


# ============================================================
# FRAUD DETECTION MODEL
# ============================================================
import joblib
import pandas as pd
import xgboost as xgb

MODEL_PATH = "/mnt/D/GHCI-25/pythonbackend/models/fraud_model.joblib"
ENC_PATH = "/mnt/D/GHCI-25/pythonbackend/models/encoder.joblib"

model = joblib.load(MODEL_PATH)
encoder = joblib.load(ENC_PATH)
model.get_booster().set_param({"device": "cpu"})

SUP_COLS = [
    "type","amount","oldbalanceOrg","newbalanceOrig",
    "oldbalanceDest","newbalanceDest","balanceOrgDiff",
    "balanceDestDiff","is_risky_type","odd_hour",
    "amountOverBalance","inconsistent"
]


class TxInput(BaseModel):
    type: str
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float
    timestamp: str


def preprocess(tx: dict):
    df = pd.DataFrame([tx])

    df["balanceOrgDiff"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
    df["balanceDestDiff"] = df["oldbalanceDest"] - df["newbalanceDest"]
    df["is_risky_type"] = df["type"].isin(["TRANSFER", "CASH_OUT"]).astype(int)

    from datetime import datetime
    hour = datetime.fromisoformat(tx["timestamp"]).hour
    df["odd_hour"] = int(hour in [1, 2, 3, 4])

    df["amountOverBalance"] = df["amount"] / (df["oldbalanceOrg"] + 1)
    df["inconsistent"] = (
        (df["oldbalanceOrg"] - df["amount"]) != df["newbalanceOrig"]
    ).astype(int)

    df["type"] = encoder.transform(df["type"])

    return df[SUP_COLS]


EXPLANATION = {
    "type": "Risky transaction type",
    "amount": "Unusually large transaction",
    "oldbalanceOrg": "Suspicious sender balance",
    "newbalanceOrig": "Unexpected sender ending balance",
    "oldbalanceDest": "Unusual receiver opening balance",
    "newbalanceDest": "Unexpected receiver ending balance",
    "balanceOrgDiff": "Sudden drop in sender balance",
    "balanceDestDiff": "Sudden increase in receiver balance",
    "is_risky_type": "High-risk transaction type",
    "odd_hour": "Activity during suspicious night hours",
    "amountOverBalance": "Amount too high relative to balance",
    "inconsistent": "Balance mismatch after transaction",
}


def model_predict(df_sup):
    prob = model.predict_proba(df_sup)[0][1]
    flag = int(prob > 0.50)

    booster = model.get_booster()
    dmat = xgb.DMatrix(df_sup.values, feature_names=df_sup.columns.tolist())
    shap_vals = booster.predict(dmat, pred_contribs=True)[0][:-1]

    features = df_sup.columns.tolist()
    ranked = sorted(
        zip(features, shap_vals),
        key=lambda x: abs(x[1]),
        reverse=True
    )

    top_reasons = [
        {
            "feature": fname,
            "reason": EXPLANATION.get(fname, fname),
            "impact": float(val)
        }
        for fname, val in ranked[:5]
    ]

    return prob, flag, top_reasons


@app.post("/predict")
def predict(tx: TxInput):
    tx_dict = tx.dict()
    df_sup = preprocess(tx_dict)
    prob, flag, reasons = model_predict(df_sup)

    return {
        "final_prediction": "FRAUD" if flag else "LEGIT",
        "probability": prob,
        "flag": flag,
        "explanations": reasons
    }


# ============================================================
# SERVER
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Pipeline:app", reload=True, host="0.0.0.0", port=8000)



"""
============================================================
          INPUT STRUCTURE & ENDPOINT SUMMARY
============================================================

1) FACE VERIFICATION USING A SINGLE FRAME
----------------------------------------
Endpoint:
    POST http://localhost:8000/face-verify-frame

Input:
    Multipart FormData:
        frame: <image-file>

Output:
{
  "verified": true,
  "similarity": 0.82
}


2) FRAUD PREDICTION
----------------------------------------
Endpoint:
    POST http://localhost:8000/predict

JSON Input:
{
  "type": "TRANSFER",
  "amount": 120000,
  "oldbalanceOrg": 800000,
  "newbalanceOrig": 680000,
  "oldbalanceDest": 1000000,
  "newbalanceDest": 1120000,
  "timestamp": "2024-06-15T02:30:00"
}

Output:
{
  "final_prediction": "FRAUD",
  "probability": 0.73,
  "flag": 1,
  "explanations": [...]
}
============================================================
"""
