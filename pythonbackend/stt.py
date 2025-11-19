import os
from faster_whisper import WhisperModel

AUDIO_PATH = "Audio/Audio2.mp3"

whisper_model = WhisperModel(
    "large-v3",
    device="cuda",
    compute_type="float16"
)

def whisper_stt_and_translate(audio_path):
    print("\n[WHISPER GPU ASR + TRANSLATION]\n----------------------------------")

    segments, info = whisper_model.transcribe(
        audio_path,
        beam_size=5,
        best_of=5,
        vad_filter=True,
        task="translate",
        language=None
    )

    print(f"\nDetected Language: {info.language.upper()} | Probability: {round(info.language_probability, 3)}")
    print("---------------\n")

    final_transcript = ""

    for seg in segments:
        print(f"PARTIAL: {seg.text}")
        final_transcript += seg.text + " "

    final_transcript = final_transcript.strip()

    print("\nFINAL ENGLISH TRANSLATION:\n", final_transcript)

    return final_transcript, info.language


def main():
    print("Running Whisper Large-v3 GPU Pipeline...\n")
    english_text, detected_lang = whisper_stt_and_translate(AUDIO_PATH)

    print("\n[FINAL OUTPUT]\n---------------------")
    print("Detected Language :", detected_lang)
    print("English Output :", english_text)


if __name__ == "__main__":
    main()
