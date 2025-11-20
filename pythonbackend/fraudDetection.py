import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from datetime import datetime

MODEL_PATH = "/mnt/D/GHCI-25/pythonbackend/models/fraud_model.joblib"
model = joblib.load(MODEL_PATH)
le = joblib.load("/mnt/D/GHCI-25/pythonbackend/models/encoder.joblib")


def preprocess_transaction(tx):

    df = pd.DataFrame([tx])
    df["type"] = le.transform(df["type"])
    df["balanceOrgDiff"] = df["amount"]
    df["balanceDestDiff"] = df["newbalanceDest"] - df["oldbalanceDest"]
    df["is_risky_type"] = df["type"].isin([2, 3]).astype(int)
    hour = pd.to_datetime(df["timestamp"]).dt.hour.iloc[0]
    df["odd_hour"] = 1 if hour in [0, 1, 2, 3, 4] else 0
    df["amountOverBalance"] = df.apply(
        lambda row: row["amount"] / (row["oldbalanceOrg"] + 1)
        if row["oldbalanceOrg"] > 0 else row["amount"],
        axis=1
    )
    df["inconsistent"] = (
        ((df["oldbalanceOrg"] == 0) & (df["newbalanceOrig"] == 0) & (df["amount"] > 0))
        |
        ((df["oldbalanceDest"] == 0) & (df["newbalanceDest"] == 0) & (df["amount"] > 0))
    ).astype(int)
    df = df.drop(columns=["timestamp"])

    return df


EXPLANATION = {
    "odd_hour": "Transaction at unusual time (midnight–4 AM)",
    "is_risky_type": "Risky transaction type (Transfer / Cash-out)",
    "amountOverBalance": "Amount unusually large compared to balance",
    "inconsistent": "Balance change inconsistent with transaction",
    "balanceOrgDiff": "Sender balance drops unusually",
    "balanceDestDiff": "Receiver balance changes unexpectedly",
    "type": "Suspicious transaction type",
    "amount": "Large transaction amount"
}


def predict_fraud(tx_dict):

    processed = preprocess_transaction(tx_dict)

    prob = model.predict_proba(processed)[0][1]
    is_fraud = int(prob > 0.5)

    dmat = xgb.DMatrix(
        processed.values,
        feature_names=list(processed.columns)
    )

    booster = model.get_booster()
    shap_values = booster.predict(dmat, pred_contribs=True)[0][:-1]

    feature_names = list(processed.columns)
    contrib_list = sorted(
        zip(feature_names, shap_values),
        key=lambda x: abs(x[1]),
        reverse=True
    )

    top_reasons = contrib_list[:5]

    return {
        "fraud_probability": float(prob),
        "fraud_prediction": is_fraud,
        "top_reasons": top_reasons
    }


sample_tx = {
    "type": "CASH_IN",
    "amount": 1871553.73,
    "oldbalanceOrg": 1871553.73,
    "newbalanceOrig": 0.0,
    "oldbalanceDest": 0.0,
    "newbalanceDest": 0.0,
    "timestamp": "2024-02-01 14:32:00"
}

result = predict_fraud(sample_tx)

print("\n=== Prediction Result ===")
print("Fraud Probability:", result["fraud_probability"])
print("Predicted Fraud:", "YES" if result["fraud_prediction"] else "NO")

print("\nTop contributing features:")
for feature, value in result["top_reasons"]:
    human = EXPLANATION.get(feature, feature)
    print(f"{human} → impact: {value:.4f}")
