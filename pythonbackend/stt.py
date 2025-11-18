import sounddevice as sd
import numpy as np
from faster_whisper import WhisperModel
import queue
import threading
import time


SAMPLE_RATE = 16000
CHUNK_MS = 500
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_MS / 1000)

AUDIO_DEVICE = None
LANGUAGE = None
MODEL_NAME = "large-v3"


whisper_model = WhisperModel(
    MODEL_NAME,
    device="cuda",
    compute_type="float16"
)

audio_queue = queue.Queue()
full_transcript = ""
streaming_active = True


def audio_callback(indata, frames, time, status):
    if status:
        print("Audio status:", status)
    audio_queue.put(indata.copy())


def transcriber():
    global full_transcript, streaming_active

    audio_buffer = np.zeros((0,), dtype=np.float32)

    print("\n[READY] Speak now...\n")

    while streaming_active or not audio_queue.empty():
        try:
            chunk = audio_queue.get(timeout=0.1)
        except queue.Empty:
            continue
        chunk = chunk.flatten()

        audio_buffer = np.concatenate((audio_buffer, chunk))

        if len(audio_buffer) >= SAMPLE_RATE * 3:
            tmp = audio_buffer.copy()

            segments, _ = whisper_model.transcribe(
                tmp,
                beam_size=3,
                vad_filter=False,
                task="translate",
                language=LANGUAGE
            )

            partial_text = " ".join(seg.text for seg in segments).strip()
            print("\r[PARTIAL]: " + partial_text, end="")

    print("\n\n[FINALIZING...]")
    segments, _ = whisper_model.transcribe(
        audio_buffer,
        beam_size=5,
        vad_filter=True,
        task="translate",
        language=LANGUAGE
    )

    full_text = " ".join(seg.text for seg in segments)
    print("\n[FINAL OUTPUT]")
    print(full_text)

def main():
    global streaming_active

    print("Starting real-time Whisper Large-v3 (GPU)...")
    print("Press CTRL+C to stop recording.\n")
    t = threading.Thread(target=transcriber)
    t.start()

    try:
        with sd.InputStream(
                channels=1,
                samplerate=SAMPLE_RATE,
                device=AUDIO_DEVICE,
                dtype="float32",
                blocksize=CHUNK_SAMPLES,
                callback=audio_callback
        ):
            while True:
                time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n\nStopping audio...")
        streaming_active = False
        t.join()


if __name__ == "__main__":
    main()