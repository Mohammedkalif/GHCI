import time
import cv2
import numpy as np
import json
from insightface.app import FaceAnalysis

# ---------- CONFIG ----------
DB_PATH = "face_data.json"
MODEL_NAME = "buffalo_s"
CTX_ID = 0
DET_SIZE = (640, 640)

AUTO_ENROLL_SAMPLES = 30
MIN_DET_CONFIDENCE = 0.4
SIMILARITY_THRESHOLD = 0.55
VERIFICATION_MAX_TRIES = 200


# ---------- Helpers ----------
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


def save_db(emb_list):
    data = {"embeddings": [e.tolist() for e in emb_list]}
    with open(DB_PATH, "w") as f:
        json.dump(data, f)
    print("[INFO] Saved embeddings to JSON.")


def load_db():
    try:
        with open(DB_PATH, "r") as f:
            data = json.load(f)
        print("[INFO] Loaded registered user data.")
        return [np.array(e, dtype=np.float32) for e in data["embeddings"]]
    except:
        print("[INFO] No user registered yet.")
        return None


# ---------- Initialize Model ----------
print("[INFO] Initializing InsightFace model:", MODEL_NAME)
app = FaceAnalysis(name=MODEL_NAME)
app.prepare(ctx_id=CTX_ID, det_size=DET_SIZE)
print("[INFO] Face model loaded.")


# ---------------------------------------------------------
#                 USER REGISTRATION
# ---------------------------------------------------------
def register_user(target_samples=AUTO_ENROLL_SAMPLES):
    print("\n[INFO] Starting registration — look at camera and rotate face.\n")

    cap = cv2.VideoCapture(0)
    collected = 0
    embeddings = []

    start = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Camera error.")
            break

        faces = app.get(frame)
        overlay = frame.copy()

        if len(faces) > 0:
            face = faces[0]
            box = face.bbox.astype(int)
            x1, y1, x2, y2 = box
            score = float(face.det_score)

            # draw box
            color = (0, 255, 0) if score >= MIN_DET_CONFIDENCE else (0, 165, 255)
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)

            if score >= MIN_DET_CONFIDENCE:
                emb = l2_normalize(face.embedding)
                embeddings.append(emb)
                collected += 1

                cv2.putText(
                    overlay,
                    f"Collected {collected}/{target_samples}",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (255, 255, 255),
                    2
                )
        else:
            cv2.putText(
                overlay, "No face detected", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,255), 2
            )

        cv2.imshow("Registration", overlay)

        if collected >= target_samples:
            print("[SUCCESS] Registration complete.")
            break

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("[INFO] Cancelled by user.")
            break

    cap.release()
    cv2.destroyAllWindows()

    if len(embeddings) > 0:
        save_db(embeddings)

    return len(embeddings)

def verify_user(similarity_threshold=SIMILARITY_THRESHOLD, max_tries=VERIFICATION_MAX_TRIES):
    stored = load_db()

    if stored is None:
        print("[ERROR] No registered user found. Register first.")
        return False, 0.0

    centroid = l2_normalize(np.mean(np.stack(stored), axis=0))

    print("\n[INFO] Verification started. Look at the camera.\n")

    cap = cv2.VideoCapture(0)
    best_sim = 0.0
    tries = 0

    while tries < max_tries:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] Camera read failed.")
            break

        faces = app.get(frame)
        overlay = frame.copy()

        if len(faces) > 0:
            face = faces[0]
            x1, y1, x2, y2 = face.bbox.astype(int)
            score = float(face.det_score)

            cv2.rectangle(overlay, (x1, y1), (x2, y2), (255, 200, 0), 2)

            if score >= MIN_DET_CONFIDENCE:
                emb = l2_normalize(face.embedding)
                sim = cosine_similarity(emb, centroid)
                best_sim = max(best_sim, sim)

                match_pct = max(0, min(1, sim)) * 100
                cv2.putText(
                    overlay,
                    f"Match {match_pct:.1f}%  (sim={sim:.3f})",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0,255,0),
                    2
                )

                if sim >= similarity_threshold:
                    cv2.putText(
                        overlay,
                        "VERIFIED",
                        (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1.2,
                        (0,255,0),
                        3
                    )
                    cv2.imshow("Verify", overlay)
                    cv2.waitKey(500)
                    cap.release()
                    cv2.destroyAllWindows()
                    print(f"[SUCCESS] Verified! Similarity = {sim:.4f}")
                    return True, sim

        else:
            cv2.putText(
                overlay,
                "No face detected",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255,255,255),
                2
            )

        cv2.imshow("Verify", overlay)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        tries += 1

    cap.release()
    cv2.destroyAllWindows()
    print(f"[FAIL] Verification failed. Best similarity = {best_sim:.4f}")

    return False, best_sim


verify_user()
