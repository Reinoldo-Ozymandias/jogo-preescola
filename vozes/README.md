# Vozes do Piper

Os modelos não ficam no repositório: são ~121 MB e podem ser baixados de novo.

```bash
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium
curl -L -O $BASE/pt_BR-faber-medium.onnx
curl -L -O $BASE/pt_BR-faber-medium.onnx.json
```

Só é preciso para **regerar** o áudio (`ferramentas/gerar-audio.py`). Para apenas
rodar o jogo, não: os MP3 já estão em `jogo/audio/`.

O Piper em si é instalado à parte:

```bash
python3 -m venv .venv && .venv/bin/pip install piper-tts
PIPER_BIN=.venv/bin/piper python3 ferramentas/gerar-audio.py
```
