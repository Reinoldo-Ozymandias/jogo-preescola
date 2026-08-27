#!/usr/bin/env python3
"""Gera os arquivos de áudio do jogo.

Três categorias, com honestidade sobre o que dá e o que não dá:

1. FALA — os 120 enunciados, as palavras dos eixos de consciência fonológica e
   silábica, as sílabas isoladas e as duas histórias. Gerados com o Piper (TTS
   neural que roda LOCAL: nenhum texto sai da máquina).

2. SONS SINTETIZADOS — chuva, sirene, tambor, flauta, violão, chocalho, andamento
   e intensidade. Feitos com ffmpeg. São APROXIMAÇÕES: acertam o caráter (percussivo,
   sustentado, dedilhado) mas não o timbre real de um instrumento.

3. SONS QUE NÃO DÁ PARA GERAR — vaca e galo. Nenhum sintetizador faz isso. Precisam
   de gravação real, com licença compatível com uso público municipal.

Uso:
    python3 ferramentas/gerar-audio.py            # só o que falta
    python3 ferramentas/gerar-audio.py --force    # refaz tudo
    python3 ferramentas/gerar-audio.py --so fala  # fala | sons
"""
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "jogo" / "audio"
VOZ = RAIZ / "vozes" / "pt_BR-faber-medium.onnx"
PIPER = Path(sys.argv[0]).parent  # sobrescrito abaixo se vier por env

# o piper vive num venv fora do projeto; deixa configurável
import os
PIPER_BIN = os.environ.get("PIPER_BIN", "piper")

FORCE = "--force" in sys.argv
SO = None
if "--so" in sys.argv:
    SO = sys.argv[sys.argv.index("--so") + 1]

# ─── fala: palavras e sílabas dos eixos 6 e 7 ────────────────────────────
PALAVRAS = {
    "pato": "pato", "pao": "pão", "mala": "mala", "caneca": "caneca",
    "faca": "faca", "bola": "bola", "macaco": "macaco", "cafe": "café",
    "flor": "flor", "janela": "janela", "banana": "banana", "sapato": "sapato",
}
# silabado = cada sílaba gerada separada e emendada com silêncio, do jeito que
# a professora bate palmas. Ler "BO-LA" corrido não serve para o exercício.
SILABADO = {
    "bola-silabado": ["bo", "la"],
    "pe-silabado": ["pé"],
    "boneca-silabado": ["bo", "ne", "ca"],
    "borboleta-silabado": ["bor", "bo", "le", "ta"],
}
SILABAS = {"bo": "bo", "ca": "ca", "lo": "lo", "sa": "sa"}

# ─── sons sintetizados (expressões do ffmpeg aevalsrc/anoisesrc) ─────────
SONS = {
    "ambiente/chuva": (
        "anoisesrc=d=4:c=white:a=0.6,highpass=f=500,lowpass=f=7000,"
        "volume=0.45,afade=t=in:d=0.3,afade=t=out:st=3.5:d=0.5"),
    "ambiente/sirene": (
        "aevalsrc='0.35*sin(2*PI*t*(760+260*sin(2*PI*t*0.9)))':d=3.5,"
        "afade=t=in:d=0.2,afade=t=out:st=3.1:d=0.4"),
    "instrumentos/tambor": (
        "aevalsrc='0.95*exp(-13*t)*sin(2*PI*92*t)"
        "+0.3*exp(-42*t)*(random(0)-0.5)':d=0.7"),
    "instrumentos/flauta": (
        "aevalsrc='0.45*(1-exp(-14*t))*exp(-0.7*t)"
        "*sin(2*PI*(880+7*sin(2*PI*5.5*t))*t)"
        "+0.03*exp(-1.2*t)*(random(0)-0.5)':d=1.8,lowpass=f=4000"),
    "instrumentos/violao": (
        "aevalsrc='exp(-2.6*t)*(0.45*sin(2*PI*196*t)+0.3*sin(2*PI*392*t)"
        "+0.17*sin(2*PI*588*t)+0.09*sin(2*PI*784*t)"
        "+0.05*sin(2*PI*980*t))':d=1.9"),
    "instrumentos/chocalho": (
        "aevalsrc='1.1*(random(0)-0.5)*pow(max(0,sin(2*PI*9*t)),6)"
        "*exp(-0.35*t)':d=1.6,highpass=f=2500,lowpass=f=11000"),
    "intensidade/tambor-forte": (
        "aevalsrc='1.0*exp(-13*t)*sin(2*PI*92*t)"
        "+0.3*exp(-42*t)*(random(0)-0.5)':d=0.8"),
    "intensidade/tambor-fraco": (
        "aevalsrc='0.16*exp(-13*t)*sin(2*PI*92*t)"
        "+0.05*exp(-42*t)*(random(0)-0.5)':d=0.8"),
}
# melodia lenta: notas emendadas (dó ré mi ré dó), 0.9 s cada
MELODIA_LENTA = [(262, 0.9), (294, 0.9), (330, 0.9), (294, 0.9), (262, 1.1)]

# Nenhum sintetizador faz som de animal. Estes vieram do Wikimedia Commons e estão
# registrados em jogo/audio/CREDITOS.md — a vaca é CC BY-SA e EXIGE atribuição.
IMPOSSIVEIS = {
    "animais/vaca": "mugido de vaca (Wikimedia, CC BY-SA — ver CREDITOS.md)",
    "animais/galo": "canto de galo (Wikimedia, domínio público)",
}


def roda(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"    ERRO: {' '.join(str(c) for c in cmd[:3])}...\n    {r.stderr.strip()[:300]}")
        return False
    return True


def precisa(destino):
    return FORCE or not destino.exists()


def falar(texto, destino):
    """Piper → wav → mp3 normalizado."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    tmp = destino.with_suffix(".tmp.wav")
    p = subprocess.run([PIPER_BIN, "-m", str(VOZ), "-f", str(tmp)],
                       input=texto, capture_output=True, text=True)
    if p.returncode != 0 or not tmp.exists():
        print(f"    ERRO no piper: {p.stderr.strip()[:200]}")
        return False
    ok = roda(["ffmpeg", "-y", "-v", "error", "-i", str(tmp),
               "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
               "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "44100",
               str(destino)])
    tmp.unlink(missing_ok=True)
    return ok


def falar_silabado(silabas, destino, pausa=0.35):
    """Cada sílaba num arquivo, emendadas com silêncio no meio."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    partes = []
    for i, s in enumerate(silabas):
        w = destino.with_suffix(f".s{i}.wav")
        p = subprocess.run([PIPER_BIN, "-m", str(VOZ), "-f", str(w)],
                           input=s, capture_output=True, text=True)
        if p.returncode != 0:
            print(f"    ERRO no piper para '{s}'")
            return False
        partes.append(w)

    entradas, filtros = [], []
    for i, w in enumerate(partes):
        entradas += ["-i", str(w)]
        filtros.append(f"[{i}:a]")
        if i < len(partes) - 1:
            filtros.append(f"[sil{i}]")
    n_sil = len(partes) - 1
    sil_src = "".join(
        f"aevalsrc=0:d={pausa}:s=22050[sil{i}];" for i in range(n_sil))
    cadeia = f"{sil_src}{''.join(filtros)}concat=n={len(partes)+n_sil}:v=0:a=1[out]"
    ok = roda(["ffmpeg", "-y", "-v", "error", *entradas,
               "-filter_complex", cadeia, "-map", "[out]",
               "-af" if False else "-codec:a", "libmp3lame", "-b:a", "96k",
               str(destino)])
    for w in partes:
        w.unlink(missing_ok=True)
    return ok


def sintetizar(filtro, destino):
    destino.parent.mkdir(parents=True, exist_ok=True)
    return roda(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", filtro,
                 "-ac", "1", "-ar", "44100",
                 "-codec:a", "libmp3lame", "-b:a", "96k", str(destino)])


def melodia(notas, destino):
    destino.parent.mkdir(parents=True, exist_ok=True)
    partes = []
    for i, (freq, dur) in enumerate(notas):
        w = destino.with_suffix(f".n{i}.wav")
        f = (f"aevalsrc='0.4*(1-exp(-18*t))*exp(-1.1*t)*sin(2*PI*{freq}*t)"
             f"+0.12*(1-exp(-18*t))*exp(-1.4*t)*sin(2*PI*{freq*2}*t)':d={dur}")
        if not roda(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f,
                     "-ac", "1", "-ar", "44100", str(w)]):
            return False
        partes.append(w)
    entradas = [x for w in partes for x in ("-i", str(w))]
    cadeia = "".join(f"[{i}:a]" for i in range(len(partes)))
    cadeia += f"concat=n={len(partes)}:v=0:a=1[out]"
    ok = roda(["ffmpeg", "-y", "-v", "error", *entradas,
               "-filter_complex", cadeia, "-map", "[out]",
               "-codec:a", "libmp3lame", "-b:a", "96k", str(destino)])
    for w in partes:
        w.unlink(missing_ok=True)
    return ok


def main():
    if not VOZ.exists():
        print(f"Voz não encontrada: {VOZ}")
        print("Baixe de https://huggingface.co/rhasspy/piper-voices (pt/pt_BR/faber/medium)")
        return 1

    banco = json.loads((RAIZ / "dist" / "atividades.json").read_text(encoding="utf-8"))
    feitos = pulados = falhos = 0

    def registrar(ok):
        nonlocal feitos, falhos
        if ok: feitos += 1
        else: falhos += 1

    if SO in (None, "fala"):
        print("── enunciados ──")
        for a in banco["atividades"]:
            d = SAIDA / "comandos" / f"{a['id']}.mp3"
            if not precisa(d):
                pulados += 1
                continue
            registrar(falar(a["comando"], d))
            print(f"  {a['id']}", end="\r")
        print(" " * 30, end="\r")

        print("── palavras e sílabas ──")
        for nome, texto in {**PALAVRAS}.items():
            d = SAIDA / "palavras" / f"{nome}.mp3"
            if precisa(d): registrar(falar(texto, d))
            else: pulados += 1
        for nome, silabas in SILABADO.items():
            d = SAIDA / "palavras" / f"{nome}.mp3"
            if precisa(d): registrar(falar_silabado(silabas, d))
            else: pulados += 1
        for nome, texto in SILABAS.items():
            d = SAIDA / "silabas" / f"{nome}.mp3"
            if precisa(d): registrar(falar(texto, d))
            else: pulados += 1

        print("── histórias ──")
        vistas = set()
        for a in banco["atividades"]:
            est = a.get("estimulo") or {}
            if est.get("tipo") == "narrativa" and est.get("texto"):
                nome = Path(est["asset"]).stem
                if nome in vistas: continue
                vistas.add(nome)
                d = SAIDA / "historias" / f"{nome}.mp3"
                if precisa(d): registrar(falar(est["texto"], d))
                else: pulados += 1

    if SO in (None, "sons"):
        print("── sons sintetizados ──")
        for nome, filtro in SONS.items():
            d = SAIDA / f"{nome}.mp3"
            if precisa(d): registrar(sintetizar(filtro, d))
            else: pulados += 1
        d = SAIDA / "andamento" / "musica-lenta.mp3"
        if precisa(d): registrar(melodia(MELODIA_LENTA, d))
        else: pulados += 1

    print(f"\ngerados {feitos} · já existiam {pulados} · falharam {falhos}")
    print("\nNÃO GERÁVEIS — precisam de gravação real:")
    for caminho, oque in IMPOSSIVEIS.items():
        existe = (SAIDA / f"{caminho}.mp3").exists()
        print(f"  {'✓ já existe' if existe else '✗ FALTA   '}  audio/{caminho}.mp3  ({oque})")
    return 0 if falhos == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
