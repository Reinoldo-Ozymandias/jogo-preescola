# Vozes do Piper

Os modelos não ficam no repositório: são ~121 MB e podem ser baixados de novo.

São **duas**, e cada uma tem um trabalho:

```bash
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR
# frase corrida: enunciados, retornos, histórias
curl -L -O $BASE/faber/medium/pt_BR-faber-medium.onnx
curl -L -O $BASE/faber/medium/pt_BR-faber-medium.onnx.json
# palavra e sílaba ISOLADAS (o botão "Ouvir" dos eixos de consciência)
curl -L -O $BASE/edresson/low/pt_BR-edresson-low.onnx
curl -L -O $BASE/edresson/low/pt_BR-edresson-low.onnx.json
```

**Por que duas.** A faber é melhor em frase, mas engole a consoante inicial de
palavra isolada: medindo o trecho audível antes da vogal, "mala" saía com 10 ms
de /m/ e se ouvia "ala". A edresson dá 90 ms na mesma palavra. Testado e
descartado antes de trocar: `--length-scale` até 2.0, `--noise-w-scale`,
consoante dobrada no texto, ponto de exclamação e pôr a palavra como segunda
frase depois de uma pausa — nenhum passou de 20 ms.

Só é preciso para **regerar** o áudio (`ferramentas/gerar-audio.py`). Para apenas
rodar o jogo, não: os MP3 já estão em `jogo/audio/`.

O Piper em si é instalado à parte:

```bash
python3 -m venv .venv && .venv/bin/pip install piper-tts
PIPER_BIN=.venv/bin/piper python3 ferramentas/gerar-audio.py
```
