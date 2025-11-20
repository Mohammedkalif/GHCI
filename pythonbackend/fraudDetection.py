from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

# ============================================================
# LOAD MODEL + ENCODER
# ============================================================
MODEL_PATH = "/mnt/D/GHCI-25/pythonbackend/models/fraud_model.joblib"
ENC_PATH   = "/mnt/D/GHCI-25/pythonbackend/models/encoder.joblib"

model = joblib.load(MODEL_PATH)
encoder = joblib.load(ENC_PATH)

# Force CPU to remove CUDA warning
model.get_booster().set_param({"device": "cpu"})

# ============================================================
# FASTAPI APP
# ============================================================
app = FastAPI(title="Fraud Detection API", version="1.0")

# ============================================================
# INPUT FORMAT (ONLY BASIC FIELDS)
# ============================================================
class TxInput(BaseModel):
    type: str
    amount: float
    oldbalanceOrg: float
    newbalanceOrig: float
    oldbalanceDest: float
    newbalanceDest: float
    step: int    # Required for odd_hour


# ============================================================
# PREPROCESSING
# ============================================================
SUP_COLS = [
    "type","amount","oldbalanceOrg","newbalanceOrig",
    "oldbalanceDest","newbalanceDest","balanceOrgDiff",
    "balanceDestDiff","is_risky_type","odd_hour",
    "amountOverBalance","inconsistent"
]

def preprocess(tx: dict):
    df = pd.DataFrame([tx])

    df["balanceOrgDiff"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
    df["balanceDestDiff"] = df["oldbalanceDest"] - df["newbalanceDest"]
    df["dest_zero_before"] = (df["oldbalanceDest"] == 0).astype(int)
    df["is_risky_type"] = df["type"].isin(["TRANSFER", "CASH_OUT"]).astype(int)

    # --- NEW: odd hour from timestamp ---
    hour = tx["timestamp"].hour
    df["odd_hour"] = int(hour in [1, 2, 3, 4])

    df["amountOverBalance"] = df["amount"] / (df["oldbalanceOrg"] + 1)
    df["inconsistent"] = (
        (df["oldbalanceOrg"] - df["amount"]) != df["newbalanceOrig"]
    ).astype(int)

    # Encode categorical type
    df["type"] = encoder.transform(df["type"])

    return df[SUP_COLS]


# ============================================================
# EXPLANATION LABELS
# ============================================================
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
    "odd_hour": "Performed during suspicious night hours",
    "amountOverBalance": "Amount too high relative to balance",
    "inconsistent": "Balance does not match amount transferred",
}


# ============================================================
# SUPERVISED PREDICTOR
# ============================================================
def model_predict(df_sup):
    prob = model.predict_proba(df_sup)[0][1]
    flag = int(prob > 0.50)

    # SHAP-like explanation
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


# ============================================================
# API ENDPOINT
# ============================================================
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

"""The json input format for testing the /predict endpoint:
{
  "type": "TRANSFER",
  "amount": 120000,
  "oldbalanceOrg": 800000,
  "newbalanceOrig": 680000,
  "oldbalanceDest": 1000000,
  "newbalanceDest": 1120000,
  "step": 125
}

Endpoint :POST http://localhost:8000/predict
"""