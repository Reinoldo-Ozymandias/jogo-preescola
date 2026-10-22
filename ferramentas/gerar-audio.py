#!/usr/bin/env python3
"""Gera os arquivos de áudio do jogo.

Três categorias, com honestidade sobre o que dá e o que não dá:

1. FALA — os 120 enunciados, as palavras dos eixos de consciência fonológica e
   silábica, as sílabas isoladas e as duas histórias. Gerados com o Kokoro-82M
   (TTS neural Apache 2.0 que roda LOCAL: nenhum texto sai da máquina).

2. SONS SINTETIZADOS — chuva e violão. Feitos com ffmpeg. São APROXIMAÇÕES: acertam
   o caráter (sustentado, dedilhado) mas não o timbre real de um instrumento.

3. SONS QUE NÃO DÁ PARA GERAR — mugido de vaca. Nenhum sintetizador faz isso.
   Precisa de gravação real, com licença compatível com uso público municipal.

Uso:
    python3 ferramentas/gerar-audio.py            # só o que falta
    python3 ferramentas/gerar-audio.py --force    # refaz tudo
    python3 ferramentas/gerar-audio.py --so fala  # fala | sons
"""
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fala import para_fala

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "jogo" / "audio"

# ─── motor de fala: Kokoro-82M ───────────────────────────────────────────
# O Piper foi aposentado em 2026-10-21: a voz faber lia o "lh" como "l" —
# "coelho" saía "coelo", e o mesmo valia para telhado, folhinhas, colher. A
# edresson acertava o lh mas soava travada em frase. Kokoro-82M (Apache 2.0,
# 24 kHz, roda local) acerta o lh e é natural na mesma velocidade.
#
# Uma voz só, ao contrário do Piper: a faber engolia consoante inicial de
# palavra isolada (motivo da segunda voz), e o Kokoro não tem esse defeito.
KOKORO_MODELO = RAIZ / "vozes" / "kokoro-v1.0.onnx"
KOKORO_VOZES = RAIZ / "vozes" / "voices-v1.0.bin"
VOZ = "pf_dora"        # feminina pt-BR do pacote. pm_alex e pm_santa também servem

# ─── ritmo da fala ───────────────────────────────────────────────────────
# Kokoro usa `speed`: 1.0 é o natural (~17 caracteres/s), que ainda é ritmo de
# adulto lendo. 0.85 leva a ~15 caracteres/s, o mesmo alvo que a locução tinha
# no Piper. Palavra/sílaba isolada vai um pouco mais devagar: é o próprio
# exercício nos eixos de consciência fonológica e silábica.
RITMO = 0.85
RITMO_PALAVRA = 0.8
PAUSA_SILABA = 0.5    # entre as sílabas batidas com palma

FORCE = "--force" in sys.argv
SO = None
if "--so" in sys.argv:
    SO = sys.argv[sys.argv.index("--so") + 1]

# ─── fala: palavras e sílabas dos eixos 6 e 7 ────────────────────────────
# só o que as 20 atividades usam: o resto saiu com as 100 atividades
PALAVRAS = {"pato": "pato", "mala": "mala", "banana": "banana"}
# silabado = cada sílaba gerada separada e emendada com silêncio, do jeito que
# a professora bate palmas. Ler "BO-LA" corrido não serve para o exercício.
# O item pode ser (o que a tela mostra, o que o sintetizador fala): em "bola" o
# o é ABERTO (/bɔ/), e o espeak lê "bo" como "bê-ó" e "bô" fechado — só "bó"
# sai certo. Nas outras palavras o o é fechado e o "ô" do dicionário vale.
SILABADO = {"bola-silabado": [("bo", "bó"), "la"]}

# ─── frases curtas que o código fala e não vêm do banco ──────────────────
# Sem estes arquivos, estas três frases caíam SEMPRE na voz do navegador — que
# em máquina sem voz pt-BR instalada é silêncio. "Muito bem! Você terminou." é a
# única fala do fim da sessão; numa sala de aula, o fim do jogo ficava mudo.
EXTRAS = {
    "fim": "Muito bem! Você terminou.",
    "sem-som": "Esse som ainda não foi gravado.",
}

# ─── sons sintetizados (expressões do ffmpeg aevalsrc/anoisesrc) ─────────
SONS = {
    "ambiente/chuva": (
        "anoisesrc=d=4:c=white:a=0.6,highpass=f=500,lowpass=f=7000,"
        "volume=0.45,afade=t=in:d=0.3,afade=t=out:st=3.5:d=0.5"),
    "instrumentos/violao": (
        "aevalsrc='exp(-2.6*t)*(0.45*sin(2*PI*196*t)+0.3*sin(2*PI*392*t)"
        "+0.17*sin(2*PI*588*t)+0.09*sin(2*PI*784*t)"
        "+0.05*sin(2*PI*980*t))':d=1.9"),
}

# Nenhum sintetizador faz som de animal. Estes vieram do Wikimedia Commons e estão
# registrados em jogo/audio/CREDITOS.md — a vaca é CC BY-SA e EXIGE atribuição.
IMPOSSIVEIS = {
    "animais/vaca": "mugido de vaca (Wikimedia, CC BY-SA — ver CREDITOS.md)",
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


def receita(voz, falado, ritmo=RITMO):
    """Como o arquivo foi feito: motor, voz e ritmo importam tanto quanto o texto."""
    return f"kokoro:{voz}:{ritmo}::{falado}"


def precisa(destino, falado=None, voz=VOZ, ritmo=RITMO):
    """Falta o arquivo, ou mudou o texto/a voz/o ritmo que o gerou."""
    if FORCE or not destino.exists():
        return True
    if falado is None:
        return False
    return _manifesto().get(str(destino.relative_to(SAIDA))) != receita(voz, falado, ritmo)


def anotar(destino, falado):
    m = _manifesto()
    m[str(destino.relative_to(SAIDA))] = falado
    MANIFESTO.write_text(json.dumps(m, ensure_ascii=False, indent=1, sort_keys=True),
                         encoding="utf-8")


_MOTOR = None


def motor():
    """Carrega o Kokoro uma vez só: são ~340 MB de modelo por voz."""
    global _MOTOR
    if _MOTOR is None:
        from kokoro_onnx import Kokoro
        _MOTOR = Kokoro(str(KOKORO_MODELO), str(KOKORO_VOZES))
    return _MOTOR


def falar_wav(falado, wav, voz=VOZ, ritmo=RITMO):
    """Texto JÁ convertido para fala → wav mono. False se o motor reclamar."""
    import numpy as np
    try:
        amostras, taxa = motor().create(falado, voice=voz, speed=ritmo, lang="pt-br")
    except Exception as e:                      # noqa: BLE001 — o motor é caixa-preta
        print(f"    ERRO no kokoro: {type(e).__name__}: {e}")
        return False
    pcm = (np.clip(amostras, -1, 1) * 32767).astype("<i2")
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taxa)
        w.writeframes(pcm.tobytes())
    return True


def falar(texto, destino, voz=VOZ, ritmo=RITMO):
    """Kokoro → wav → mp3 normalizado. `texto` vem do banco, cru."""
    falado = para_fala(texto)
    destino.parent.mkdir(parents=True, exist_ok=True)
    tmp = destino.with_suffix(".tmp.wav")
    if not falar_wav(falado, tmp, voz, ritmo):
        return False
    ok = roda(["ffmpeg", "-y", "-v", "error", "-i", str(tmp),
               "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
               "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "44100",
               str(destino)])
    tmp.unlink(missing_ok=True)
    if ok:
        anotar(destino, receita(voz, falado, ritmo))
    return ok


def falar_solto(texto, destino, voz=VOZ, ritmo=RITMO_PALAVRA):
    """Palavra ou sílaba ISOLADA: mais devagar, que é o próprio exercício.

    No Piper isto escolhia entre tomadas porque a faber engolia a consoante
    inicial. O Kokoro não tem esse defeito, então aqui é só o mesmo caminho,
    com o ritmo de palavra.
    """
    return falar(texto, destino, voz, ritmo)


def falar_silabado(silabas, destino, voz=VOZ, ritmo=RITMO_PALAVRA):
    """Cada sílaba num arquivo, emendadas com silêncio no meio.

    Item pode ser string ou (mostrado, falado) — ver SILABADO.
    """
    destino.parent.mkdir(parents=True, exist_ok=True)
    partes = []
    falados = []
    for i, s in enumerate(silabas):
        mostrado, falado = s if isinstance(s, tuple) else (s, para_fala(s))
        w = destino.with_suffix(f".s{i}.wav")
        if not falar_wav(falado, w, voz, ritmo):
            return False
        partes.append(w)
        falados.append(falado)

    entradas, filtros = [], []
    for i, w in enumerate(partes):
        entradas += ["-i", str(w)]
        filtros.append(f"[{i}:a]")
        if i < len(partes) - 1:
            filtros.append(f"[sil{i}]")
    n_sil = len(partes) - 1
    sil_src = "".join(
        f"aevalsrc=0:d={PAUSA_SILABA}:s=24000[sil{i}];" for i in range(n_sil))
    cadeia = f"{sil_src}{''.join(filtros)}concat=n={len(partes)+n_sil}:v=0:a=1[out]"
    ok = roda(["ffmpeg", "-y", "-v", "error", *entradas,
               "-filter_complex", cadeia, "-map", "[out]",
               "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "44100",
               str(destino)])
    for w in partes:
        w.unlink(missing_ok=True)
    if ok:
        anotar(destino, receita(voz, " ".join(falados), ritmo))
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


def main():
    for v in (KOKORO_MODELO, KOKORO_VOZES):
        if not v.exists():
            print(f"Modelo não encontrado: {v}")
            print("Baixe com os comandos de vozes/README.md")
            return 1
    try:
        motor()
    except ImportError:
        print("Falta o pacote kokoro-onnx. Instale no venv do projeto:")
        print("  .venv/bin/pip install kokoro-onnx")
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

        # palavra e sílaba SOLTAS são o próprio exercício: vão mais devagar
        print("── palavras e sílabas ──")
        for nome, texto in {**PALAVRAS}.items():
            d = SAIDA / "palavras" / f"{nome}.mp3"
            if precisa(d, para_fala(texto), VOZ, RITMO_PALAVRA):
                registrar(falar_solto(texto, d))
            else: pulados += 1
        for nome, silabas in SILABADO.items():
            d = SAIDA / "palavras" / f"{nome}.mp3"
            falados = [s[1] if isinstance(s, tuple) else para_fala(s) for s in silabas]
            if precisa(d, " ".join(falados), VOZ, RITMO_PALAVRA):
                registrar(falar_silabado(silabas, d))
            else: pulados += 1

        print("── frases do código ──")
        for nome, texto in EXTRAS.items():
            d = SAIDA / "extras" / f"{nome}.mp3"
            if precisa(d, para_fala(texto)):
                registrar(falar(texto, d))
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

    print(f"\ngerados {feitos} · já existiam {pulados} · falharam {falhos}")
    print("\nNÃO GERÁVEIS — precisam de gravação real:")
    for caminho, oque in IMPOSSIVEIS.items():
        existe = (SAIDA / f"{caminho}.mp3").exists()
        print(f"  {'✓ já existe' if existe else '✗ FALTA   '}  audio/{caminho}.mp3  ({oque})")
    return 0 if falhos == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
