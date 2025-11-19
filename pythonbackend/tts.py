from TTS.api import TTS
import requests
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"

# ---------------------------
# Load XTTS v2
# ---------------------------
print("Loading XTTS...")
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
print("XTTS loaded.\n")

# ---------------------------
# Translation using LibreTranslate API
# ---------------------------
def translate(text: str, target_lang: str):
    url = "https://libretranslate.com/translate"

    payload = {
        "q": text,
        "source": "en",       # English input
        "target": target_lang,  # Output language
        "format": "text"
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return response.json().get("translatedText", text)

    except Exception as e:
        print("Translation API error:", e)
        return text   # fallback → use English


# ---------------------------
# MAIN FUNCTION
# ---------------------------
def speak(text: str, lang_code: str):
    print("English:", text)

    translated = translate(text, lang_code)
    print("Translated:", translated)

    tts.tts_to_file(
        text=translated,
        file_path="output.wav",
        language=lang_code,
        speaker="female_en"      # REQUIRED for XTTS v2
    )

    print("\n✔ Audio saved to output.wav")


# ---------------------------
# DEMO
# ---------------------------
if __name__ == "__main__":
    speak("Hello, how are you?", "ta")
