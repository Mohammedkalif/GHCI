Important Notes
🔹 1. Python version MUST be 3.10

dlib & face_recognition break on Python 3.11+

torchaudio wheels fail on 3.12

numpy < 2 required by speechbrain

🔹 2. torchaudio must match PyTorch

Your versions should be:

torch 2.3.0+cu121
torchaudio 2.3.0+cu121

🔹 3. No NumPy 2.x allowed

This environment forces 1.26.4.

pip uninstall -y huggingface_hub
pip uninstall -y transformers
pip uninstall -y datasets
pip uninstall -y tokenizers
pip uninstall -y safetensors
pip uninstall -y accelerate
pip uninstall -y huggingface_hub
Run uninstall twice to ensure removal.

Install the correct working versions
These versions are 100% compatible with SpeechBrain:

bash
Copy code
pip install huggingface_hub==0.23.0
pip install transformers==4.41.2
pip install datasets==2.19.0
pip install safetensors==0.4.2
pip install tokenizers==0.19.1
pip install accelerate==0.30.0

