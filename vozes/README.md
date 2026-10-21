# Vozes do Kokoro

Os modelos não ficam no repositório: são ~338 MB e podem ser baixados de novo.

```bash
cd vozes
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
curl -L -O $BASE/kokoro-v1.0.onnx
curl -L -O $BASE/voices-v1.0.bin
```

**Por que Kokoro.** Até 2026-10-21 a locução era do Piper, voz `faber`: melhor prosódia
em frase, mas lia o **"lh" como "l"** — "coelho" saía "coelo", e o mesmo valia para
telhado, folhinhas, colher. A edresson (a voz das palavras) acertava o lh, mas em frase
soava travada. O Kokoro-82M acerta o lh e é natural na mesma velocidade, em 24 kHz, e é
**Apache 2.0** — o que importa aqui: os MP3s vão ser distribuídos num site público.

As vozes pt-BR do pacote são `pf_dora` (feminina, a usada), `pm_alex` e `pm_santa`.
A troca é uma linha em `ferramentas/gerar-audio.py` (`VOZ`), mas muda o timbre do jogo
inteiro — não é decisão estética isolada.

**Ritmo.** O Kokoro usa `speed`: `1.0` é o natural (~17 caracteres/s), rápido demais para
5–6 anos. O gerador usa **0.85** (~15 caracteres/s) e **0.8** em palavra/sílaba isolada.
O controle "Ritmo da fala" do professor aplica `playbackRate` em cima disso.

Só é preciso para **regerar** o áudio (`ferramentas/gerar-audio.py`). Para apenas rodar
o jogo, não: os MP3 já estão em `jogo/audio/`.

O motor em si é instalado à parte:

```bash
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx
.venv/bin/python ferramentas/gerar-audio.py
```

Modelo e vozes em `vozes/kokoro-v1.0.onnx` e `vozes/voices-v1.0.bin` (gitignorados).
Licença: Apache 2.0, em [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M).
