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
import math
import re
import struct
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fala import para_fala

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "jogo" / "audio"
VOZ = RAIZ / "vozes" / "pt_BR-faber-medium.onnx"

# A faber não articula a consoante inicial de palavra ISOLADA: medindo o
# murmúrio antes da vogal, "mala" sai com 10 ms de /m/ (contra 100 ms na
# edresson) e o ouvinte escuta "ala"/"nala". Testado e descartado: length-scale
# até 2.0, noise-w, consoante dobrada, ponto de exclamação, e pôr a palavra como
# 2ª frase depois de uma pausa — nenhum passa de 20 ms.
#
# Por isso as PALAVRAS e SÍLABAS soltas — as que o botão "Ouvir" repete, e que
# SÃO o exercício nos eixos de consciência fonológica e silábica — usam a outra
# voz. Frase corrida continua na faber, que é melhor.
VOZ_PALAVRA = RAIZ / "vozes" / "pt_BR-edresson-low.onnx"
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
    # 0.95 de seno + 0.3 de ruído chega a 1.10: estourava o fundo de escala e
    # a batida saía com estalo. Medido: max_volume -0.1 dB, 107 amostras no teto.
    "instrumentos/tambor": (
        "aevalsrc='0.74*exp(-13*t)*sin(2*PI*92*t)"
        "+0.234*exp(-42*t)*(random(0)-0.5)':d=0.7"),
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
    # mesma correção; forte e fraco descem pelo MESMO fator (0.78), senão o
    # contraste de intensidade — que é a resposta de CA-005 — encolhe junto
    "intensidade/tambor-forte": (
        "aevalsrc='0.78*exp(-13*t)*sin(2*PI*92*t)"
        "+0.234*exp(-42*t)*(random(0)-0.5)':d=0.8"),
    "intensidade/tambor-fraco": (
        "aevalsrc='0.125*exp(-13*t)*sin(2*PI*92*t)"
        "+0.039*exp(-42*t)*(random(0)-0.5)':d=0.8"),
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


# O que cada mp3 falado FOI GERADO A PARTIR DE. Sem isto, mudar o texto (ou a
# normalização de fala) deixa o arquivo velho no lugar para sempre, e ninguém
# percebe — foi o que aconteceu com "BO-LA", gravado soletrando "bê-ó-la".
MANIFESTO = SAIDA / "textos-falados.json"


def _manifesto():
    try:
        return json.loads(MANIFESTO.read_text(encoding="utf-8"))
    except Exception:
        return {}


def receita(voz, falado):
    """Como o arquivo foi feito: a voz importa tanto quanto o texto."""
    return f"{voz.stem}::{falado}"


def precisa(destino, falado=None, voz=None):
    """Falta o arquivo, ou mudou o texto/a voz que o gerou."""
    if FORCE or not destino.exists():
        return True
    if falado is None:
        return False
    return _manifesto().get(str(destino.relative_to(SAIDA))) != receita(voz or VOZ, falado)


def anotar(destino, falado):
    m = _manifesto()
    m[str(destino.relative_to(SAIDA))] = falado
    MANIFESTO.write_text(json.dumps(m, ensure_ascii=False, indent=1, sort_keys=True),
                         encoding="utf-8")


def falar(texto, destino, voz=None):
    """Piper → wav → mp3 normalizado. `texto` vem do banco, cru."""
    voz = voz or VOZ
    falado = para_fala(texto)
    destino.parent.mkdir(parents=True, exist_ok=True)
    tmp = destino.with_suffix(".tmp.wav")
    p = subprocess.run([PIPER_BIN, "-m", str(voz), "-f", str(tmp)],
                       input=falado, capture_output=True, text=True)
    if p.returncode != 0 or not tmp.exists():
        print(f"    ERRO no piper: {p.stderr.strip()[:200]}")
        return False
    ok = roda(["ffmpeg", "-y", "-v", "error", "-i", str(tmp),
               "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
               "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "44100",
               str(destino)])
    tmp.unlink(missing_ok=True)
    if ok:
        anotar(destino, receita(voz, falado))
    return ok


def ataque_ms(wav):
    """Quantos ms de consoante se ouvem antes da vogal.

    Proxy medível para "dá para entender o /m/ de mala": o modelo é estocástico
    e de vez em quando engole a consoante inicial — foi assim que "mala" virou
    "nala". Janelas de 10 ms; conta as que estão acima do silêncio (-55 dB) e
    abaixo do patamar de vogal (-28 dB), antes da primeira janela de vogal.
    """
    bruto = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav),
                            "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                           capture_output=True).stdout
    n = len(bruto) // 2
    if not n:
        return 0
    amostras = struct.unpack(f"<{n}h", bruto[:n * 2])
    janelas = []
    for i in range(0, len(amostras), 160):
        b = amostras[i:i + 160]
        if not b:
            break
        r = math.sqrt(sum(x * x for x in b) / len(b))
        janelas.append(20 * math.log10(r / 32768) if r > 0 else -99)
    vogal = next((i for i, d in enumerate(janelas) if d > -28), None)
    if vogal is None:
        return 0
    return sum(1 for d in janelas[:vogal] if d > -55) * 10


def melhor_tomada(texto, voz, tmp, tomadas=4):
    """Sintetiza algumas vezes e guarda a de ataque mais claro em `tmp`."""
    melhor = -1
    candidato = tmp.with_suffix(".cand.wav")
    for i in range(tomadas):
        p = subprocess.run([PIPER_BIN, "-m", str(voz), "-f", str(candidato)],
                           input=texto, capture_output=True, text=True)
        if p.returncode != 0 or not candidato.exists():
            continue
        nota = ataque_ms(candidato)
        if nota > melhor:
            melhor = nota
            candidato.replace(tmp)
        if nota >= 80:            # já está claro, não precisa sortear mais
            break
    candidato.unlink(missing_ok=True)
    return melhor


def falar_solto(texto, destino, voz):
    """Palavra ou sílaba ISOLADA: escolhe a melhor tomada antes de gravar."""
    falado = para_fala(texto)
    destino.parent.mkdir(parents=True, exist_ok=True)
    tmp = destino.with_suffix(".tmp.wav")
    nota = melhor_tomada(falado, voz, tmp)
    if nota < 0:
        print(f"    ERRO no piper para '{falado}'")
        return False
    if nota < 30:
        print(f"    AVISO: '{falado}' saiu com só {nota} ms de consoante inicial — "
              f"pode soar sem o começo")
    ok = roda(["ffmpeg", "-y", "-v", "error", "-i", str(tmp),
               "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
               "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "44100",
               str(destino)])
    tmp.unlink(missing_ok=True)
    if ok:
        anotar(destino, receita(voz, falado))
    return ok


def falar_silabado(silabas, destino, pausa=0.35, voz=None):
    """Cada sílaba num arquivo, emendadas com silêncio no meio."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    partes = []
    for i, s in enumerate(silabas):
        w = destino.with_suffix(f".s{i}.wav")
        if melhor_tomada(para_fala(s), voz or VOZ, w) < 0:
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
               "-codec:a", "libmp3lame", "-b:a", "96k",
               str(destino)])
    for w in partes:
        w.unlink(missing_ok=True)
    if ok:
        anotar(destino, receita(voz or VOZ, " ".join(para_fala(x) for x in silabas)))
    return ok


def pico(arquivo):
    """max_volume em dBFS, ou None se não der para medir."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(arquivo),
                        "-af", "volumedetect", "-f", "null", "/dev/null"],
                       capture_output=True, text=True)
    m = re.search(r"max_volume:\s*(-?[\d.]+) dB", r.stderr)
    return float(m.group(1)) if m else None


def sintetizar(filtro, destino):
    destino.parent.mkdir(parents=True, exist_ok=True)
    ok = roda(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", filtro,
               "-ac", "1", "-ar", "44100",
               "-codec:a", "libmp3lame", "-b:a", "96k", str(destino)])
    # Uma expressão do aevalsrc pode passar de 1.0 sem avisar: o ffmpeg corta no
    # teto e a batida ganha um estalo que ninguém vê no código.
    if ok:
        p = pico(destino)
        if p is not None and p > -0.5:
            print(f"    AVISO: {destino.name} encosta no teto ({p:+.1f} dBFS) — "
                  f"provável clipping, baixe a amplitude da expressão")
    return ok


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
    for v in (VOZ, VOZ_PALAVRA):
        if not v.exists():
            print(f"Voz não encontrada: {v}")
            print("Baixe de https://huggingface.co/rhasspy/piper-voices (pt/pt_BR)")
            return 1
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
            if not precisa(d, para_fala(a["comando"])):
                pulados += 1
                continue
            registrar(falar(a["comando"], d))
            print(f"  {a['id']}", end="\r")
        print(" " * 30, end="\r")

        # O retorno de acerto e erro é falado tanto quanto o enunciado. Sem estes
        # arquivos, ele caía na voz do navegador — que, sem voz pt-BR instalada,
        # é silêncio, e com espeak lê a notação do banco soletrando.
        print("── retornos de acerto e erro ──")
        for a in banco["atividades"]:
            for campo in ("acerto", "erro"):
                texto = a["feedback"][campo]
                d = SAIDA / "feedback" / f"{a['id']}-{campo}.mp3"
                if not precisa(d, para_fala(texto)):
                    pulados += 1
                    continue
                registrar(falar(texto, d))
                print(f"  {a['id']} {campo}   ", end="\r")
        print(" " * 30, end="\r")

        # palavra e sílaba SOLTAS vão na outra voz — ver o comentário em VOZ_PALAVRA
        print("── palavras e sílabas ──")
        for nome, texto in {**PALAVRAS}.items():
            d = SAIDA / "palavras" / f"{nome}.mp3"
            if precisa(d, para_fala(texto), VOZ_PALAVRA):
                registrar(falar_solto(texto, d, VOZ_PALAVRA))
            else: pulados += 1
        for nome, silabas in SILABADO.items():
            d = SAIDA / "palavras" / f"{nome}.mp3"
            if precisa(d, " ".join(para_fala(x) for x in silabas), VOZ_PALAVRA):
                registrar(falar_silabado(silabas, d, voz=VOZ_PALAVRA))
            else: pulados += 1
        for nome, texto in SILABAS.items():
            d = SAIDA / "silabas" / f"{nome}.mp3"
            if precisa(d, para_fala(texto), VOZ_PALAVRA):
                registrar(falar_solto(texto, d, VOZ_PALAVRA))
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
                if precisa(d, para_fala(est["texto"])): registrar(falar(est["texto"], d))
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
