import time
import cv2
import numpy as np
import joblib
from insightface.app import FaceAnalysis
from collections import defaultdict

# ---------- CONFIG ----------
DB_PATH = "face_db.joblib"
MODEL_NAME = "buffalo_s"
CTX_ID = 0
DET_SIZE = (640, 640)

AUTO_ENROLL_SAMPLES = 30
MIN_DET_CONFIDENCE = 0.4
SIMILARITY_THRESHOLD = 0.55
VERIFICATION_MAX_TRIES = 200

SAVE_AFTER_ENROLL = True
USE_DB_LOGGER = False

# ---------- Optional DB logger (your previous project had a db.py with FaceDBLoggerSQL) ----------
# If you want to enable logging (timestamps & confidence) integrate your logger here.
# I found a file called db.py in your project; you can plug it in. See README in your repo. :contentReference[oaicite:2]{index=2}
try:
    if USE_DB_LOGGER:
        from db import FaceDBLoggerSQL
        db_logger = FaceDBLoggerSQL()   # configure inside db.py
    else:
        db_logger = None
except Exception:
    db_logger = None

# ---------- Helpers ----------
def load_db(path=DB_PATH):
    try:
        db = joblib.load(path)
        print(f"[INFO] Loaded face DB from {path} (accounts: {len(db)})")
    except Exception:
        db = {}
        print("[INFO] No DB found, starting fresh.")
    return db

def save_db(db, path=DB_PATH):
    joblib.dump(db, path)
    print(f"[INFO] Saved face DB to {path} (accounts: {len(db)})")

def l2_normalize(x):
    x = np.array(x, dtype=np.float32)
    norm = np.linalg.norm(x)
    if norm == 0:
        return x
    return x / norm

def cosine_similarity(a, b):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    an = np.linalg.norm(a)
    bn = np.linalg.norm(b)
    if an == 0 or bn == 0:
        return 0.0
    return float(np.dot(a, b) / (an * bn))

# ---------- Init model ----------
print("[INFO] Initializing InsightFace model:", MODEL_NAME)
app = FaceAnalysis(name=MODEL_NAME)
app.prepare(ctx_id=CTX_ID, det_size=DET_SIZE)
print("[INFO] Model ready.")

# ---------- Load DB ----------
face_db = load_db(DB_PATH)   # dict: account -> list of embeddings (np arrays)

# ---------- Enrollment ----------
def auto_enroll(account_number: str, target_samples=AUTO_ENROLL_SAMPLES, show_feedback=True):
    if account_number in face_db:
        print(f"[WARN] Account {account_number} already in DB. New embeddings will be appended.")

    print("[INFO] Auto-enrollment started...")
    print("[INFO] Please slowly rotate head left/right/up/down, speak naturally.")
    cap = cv2.VideoCapture(0)
    collected = 0
    saved_embeddings = face_db.get(account_number, [])

    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Camera frame failed.")
            break

        # get detections + embedding
        faces = app.get(frame)

        # draw UI overlays
        overlay = frame.copy()
        h, w = frame.shape[:2]

        if len(faces) > 0:
            face = faces[0]  # take primary face
            box = face.bbox.astype(int)  # x1,y1,x2,y2
            x1, y1, x2, y2 = box
            score = float(face.det_score) if hasattr(face, "det_score") else 1.0

            # draw bounding box
            color = (50, 220, 50) if score >= MIN_DET_CONFIDENCE else (0, 140, 255)
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)

            # attempt to collect embedding if detection confidence ok
            if score >= MIN_DET_CONFIDENCE:
                emb = face.embedding
                emb = l2_normalize(emb)
                saved_embeddings.append(emb)
                collected += 1
                msg = f"Collected: {collected}/{target_samples}"
                cv2.putText(overlay, msg, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,255,255), 2)

            else:
                cv2.putText(overlay, "Face detected - low confidence", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,140,255), 2)

        else:
            cv2.putText(overlay, "No face detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,255,255), 2)

        # show instruction / elapsed
        elapsed = int(time.time() - start_time)
        cv2.putText(overlay, f"Enroll Account: {account_number}", (10, h-40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200,200,200), 2)
        cv2.putText(overlay, f"Elapsed: {elapsed}s", (10, h-15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200,200,200), 1)

        cv2.imshow("Auto-Enroll - rotate your face", overlay)

        # End when collected enough
        if collected >= target_samples:
            print(f"[SUCCESS] Enrollment complete! Collected {collected} samples.")
            break

        # allow user to cancel with 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("[INFO] Enrollment cancelled by user.")
            break

    cap.release()
    cv2.destroyAllWindows()

    # store embeddings (list of np arrays)
    face_db[account_number] = saved_embeddings
    if SAVE_AFTER_ENROLL:
        save_db(face_db, DB_PATH)
    return len(saved_embeddings)

# ---------- Verification ----------
def verify_account(account_number: str, similarity_threshold=SIMILARITY_THRESHOLD, max_tries=VERIFICATION_MAX_TRIES):
    """
    Verifies the given account_number by comparing live embeddings with stored centroid.
    Displays live matching % and bounding box overlay.
    Returns (match_bool, best_similarity)
    """
    if account_number not in face_db or len(face_db[account_number]) == 0:
        print("[ERROR] No enrolled embeddings for account:", account_number)
        return False, 0.0

    # compute centroid embedding for the account
    stored_list = np.stack(face_db[account_number], axis=0)
    centroid = np.mean(stored_list, axis=0)
    centroid = l2_normalize(centroid)

    cap = cv2.VideoCapture(0)
    best_sim = 0.0
    tries = 0
    print("[INFO] Verification started. Look at the camera.")

    while tries < max_tries:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Camera read failed.")
            break

        faces = app.get(frame)
        overlay = frame.copy()
        h, w = frame.shape[:2]

        if len(faces) > 0:
            face = faces[0]
            box = face.bbox.astype(int)
            x1, y1, x2, y2 = box
            score = float(face.det_score) if hasattr(face, "det_score") else 1.0

            # draw bbox
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (255, 200, 0), 2)

            if score >= MIN_DET_CONFIDENCE:
                new_emb = l2_normalize(face.embedding)
                sim = cosine_similarity(new_emb, centroid)   # between -1..1
                if sim > best_sim:
                    best_sim = sim

                match_pct = max(0.0, min(1.0, sim)) * 100.0
                text = f"Match: {match_pct:.1f}%  (score {sim:.3f})"
                cv2.putText(overlay, text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

                # optionally log to DB (if configured)
                if db_logger and db_logger.should_log_detection(account_number):
                    db_logger.log_detection(account_number, float(sim), camera=0)

                # immediate pass if above threshold
                if sim >= similarity_threshold:
                    cv2.putText(overlay, "VERIFIED", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,255,0), 3)
                    cv2.imshow("Verification", overlay)
                    cv2.waitKey(500)
                    cap.release()
                    cv2.destroyAllWindows()
                    print(f"[SUCCESS] Verified (sim={sim:.4f}).")
                    return True, sim

            else:
                cv2.putText(overlay, "Low detection confidence", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,140,255), 2)

        else:
            cv2.putText(overlay, "No face detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,255,255), 2)

        cv2.imshow("Verification", overlay)

        # quit early with 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        tries += 1

    cap.release()
    cv2.destroyAllWindows()
    print(f"[FAIL] Not Verified. Best similarity={best_sim:.4f}")
    return False, best_sim

# ---------- CLI ----------
def menu():
    print("Face verification pipeline")
    print("1 -> Auto Enroll")
    print("2 -> Verify")
    print("q -> Quit")
    choice = input("Choose: ").strip()
    return choice

if __name__ == "__main__":
    while True:
        c = menu()
        if c == "1":
            acc = input("Enter account number (id): ").strip()
            n = auto_enroll(acc, target_samples=AUTO_ENROLL_SAMPLES)
            print(f"Collected {n} embeddings for account {acc}.")

        elif c == "2":
            acc = input("Enter account number (id): ").strip()
            ok, sim = verify_account(acc, similarity_threshold=SIMILARITY_THRESHOLD)
            print("Verification result:", ok, " similarity:", sim)

        elif c.lower() == "q":
            print("Exit.")
            break

        else:
            print("Invalid choice.")
