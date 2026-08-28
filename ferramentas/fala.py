"""Texto do banco → texto para o sintetizador.

O banco escreve para o OLHO. "BO-LA" mostra a divisão silábica, "SapaTO" destaca
a terminação, "CA + SA = CASA" mostra a soma, "Ffffaca" desenha o som arrastado.
O espeak-ng, que o Piper usa por baixo, lê essa notação ao pé da letra e devolve
lixo — medido com o phonemizer:

    BO-LA           → "bê-ó-la"          (soletra a sílaba, que não é palavra)
    SapaTO, paTO    → "sapa tê-ó, pê-á tê-ó"
    CA + SA = CASA  → "cá MAIS sá IGUAL casa"
    termina em -OLA → "termina em ó-éle-á"
    fff             → "éfe-éfe-éfe"

Estas regras separam as duas leituras: a tela continua com a notação, o
sintetizador recebe o equivalente falado. Nada aqui muda o banco.

⚠️ Hífen legítimo NÃO se toca: "quebra-cabeça", "guarda-chuva" e "au-au" o espeak
já lê certo, e virar pausa estragaria o que está bom. Por isso a divisão só
acontece quando algum pedaço está todo em CAIXA ALTA — que é justamente a
convenção de notação do banco.

Espelho em JavaScript: `paraFala()` em jogo/js/audio.js, para quando o mp3 não
existe e sobra a voz do navegador. Mudou aqui, mude lá.
"""
import re

MAIUSCULA = "A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ"
MINUSCULA = "a-zà-ÿ"

# Sílabas que o espeak soletra em vez de pronunciar, por não serem palavras.
# O acento não aparece em lugar nenhum da tela — é instrução para o sintetizador.
# Medido uma a uma: "bo" → bˌeˈɔ (bê-ó); "bô" → bˈo (bo). Idem para as outras.
SILABA_FALADA = {
    "bo": "bô", "ba": "bá", "pa": "pá", "to": "tô",
    "lo": "lô", "ne": "nê", "le": "lê",
}

_TEM_CAIXA_ALTA = re.compile(rf"(?:^|-)[{MAIUSCULA}]+(?:-|$)")
# CAIXA ALTA colada dentro da palavra: "SapaTO", "paTO", "cafÉ". Qualquer troca
# de caixa no meio serve — o espeak quebra a palavra ali ("cafÉ" → "caf é").
_COLADA = re.compile(rf"[{MINUSCULA}][{MAIUSCULA}]")
_SO_MAIUSCULA = re.compile(rf"^[{MAIUSCULA}]{{2,}}$")
_PONTUACAO = ".,!?:;…()\"'"


def _pedaco(p):
    """Um pedaço de notação, como o sintetizador deve pronunciá-lo."""
    baixa = p.lower()
    if baixa in SILABA_FALADA:
        return SILABA_FALADA[baixa]
    # CAIXA ALTA de 2+ letras vira acrônimo soletrado ("OLA" → "ó-éle-á"). A
    # ênfase da caixa alta é visual: o espeak lê "MALA" e "mala" igual.
    return baixa if _SO_MAIUSCULA.match(p) else p


def _token(token):
    """BO-NE-CA → "bô, nê, ca"; SapaTO → "sapato"; quebra-cabeça → intacto."""
    nucleo = token.strip(_PONTUACAO)
    if not nucleo:
        return token
    antes = token[:token.index(nucleo)]
    depois = token[token.index(nucleo) + len(nucleo):]

    if "-" in nucleo and _TEM_CAIXA_ALTA.search(nucleo):
        novo = ", ".join(_pedaco(p) for p in nucleo.split("-") if p)
    elif _COLADA.search(nucleo):
        novo = nucleo.lower()
    else:
        novo = _pedaco(nucleo)
    return antes + novo + depois


def para_fala(texto):
    """O texto como o sintetizador deve recebê-lo."""
    # "Ffffaca" → "Faca", "mmmm" → "m": a letra repetida desenha o som arrastado
    # na tela, mas vira soletração ("éfe-éfe-éfe") no sintetizador.
    t = re.sub(r"(\w)\1{2,}", r"\1", texto, flags=re.IGNORECASE)
    # o sinal é conta para o olho; para o ouvido, pausa
    t = re.sub(r"\s*[+=]\s*", ", ", t)
    # hífen solto de sufixo ("-OLA") faz soletrar
    t = re.sub(r"(^|[\s(])-(?=\w)", r"\1", t)
    return " ".join(_token(tok) for tok in t.split(" "))


if __name__ == "__main__":
    import sys
    for linha in sys.argv[1:] or sys.stdin:
        print(para_fala(linha.rstrip("\n")))
