import torch
from faster_whisper import WhisperModel
from TTS.api import TTS

device = "cuda" if torch.cuda.is_available() else "cpu"

print("Loading Whisper distil-large-v3...")
whisper = WhisperModel(
    "large-v3",
    device=device,
    compute_type="float16"
)
print("Whisper loaded.\n")


TTS_MODELS = {
    "hi": "silero_tts",
    "bn": "silero_tts",
    "ta": "tamil_vits.pth",
    "te": "telugu_vits.pth",
    "kn": "kannada_vits.pth",
    "ml": "malayalam_vits.pth",
    "mr": "marathi_vits.pth",
}

def tts_generate(text, lang):
    model_path = TTS_MODELS.get(lang)
    if model_path is None:
        print("No TTS model available.")
        return

    if model_path == "silero_tts":
        tts = TTS("tts_models/en/multi-tts").to(device)
        tts.tts_to_file(text=text, file_path="output.wav")
    else:
        tts = TTS(model_path=model_path, model_type="vits").to(device)
        tts.tts_to_file(text=text, file_path="output.wav")

def run_pipeline(audio):

    print("\nRunning Whisper...")
    segments, info = whisper.transcribe(audio, beam_size=3)
    lang = info.language
    print("Detected language:", lang)

    transcript = " ".join(seg.text for seg in segments)
    print("Transcript:", transcript)

    print("\nSynthesizing speech...")
    tts_generate(transcript, lang)

# ----------------------------
if __name__ == "__main__":
    run_pipeline("Audio/audio.wav")
