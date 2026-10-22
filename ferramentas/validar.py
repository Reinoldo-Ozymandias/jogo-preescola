#!/usr/bin/env python3
"""Valida o banco de conteúdo e gera o pacote que o jogo consome.

Uso:
    python3 ferramentas/validar.py            # só valida
    python3 ferramentas/validar.py --build    # valida e gera dist/

Saídas do --build:
    dist/atividades.json  o banco, um único arquivo para consulta de fora do jogo
    dist/atividades.js    o mesmo banco como variável, para o jogo abrir sem servidor
    dist/assets.txt       lista de TODAS as imagens e áudios que precisam existir
"""
import json
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONTEUDO = RAIZ / "conteudo"
DIST = RAIZ / "dist"

TIPOS = {
    "escolha_imagem", "selecao_multipla", "arrastar_para_alvo",
    "ordenar_sequencia", "parear", "contar_toques",
}
PREFIXOS = {
    "grandezas_comparacoes": "GC", "nocoes_espaciais": "NE",
    "contagem_quantidades": "CQ", "cores": "CO", "animais_habitats": "AH",
    "consciencia_fonologica": "CF", "consciencia_silabica": "CS",
    "letras_palavras": "LP", "percepcao_visual": "PV",
    "compreensao_auditiva": "CA",
}

erros: list[str] = []
avisos: list[str] = []


def erro(aid, msg):
    erros.append(f"  [{aid}] {msg}")


def aviso(aid, msg):
    avisos.append(f"  [{aid}] {msg}")


def midias(no):
    """Todo dict que representa uma mídia dentro de uma interação."""
    if isinstance(no, dict):
        if "rotulo" in no and ("imagem" in no or "texto" in no):
            yield no
        for v in no.values():
            yield from midias(v)
    elif isinstance(no, list):
        for v in no:
            yield from midias(v)


def coletar_assets(ativ):
    for m in midias(ativ.get("interacao", {})):
        if "imagem" in m:
            yield m["imagem"]
    est = ativ.get("estimulo")
    if est:
        if est.get("asset"):
            yield est["asset"]
        for a in est.get("assets", []):
            yield a


def validar_atividade(ativ, eixo_id):
    aid = ativ.get("id", "SEM-ID")

    for campo in ("id", "nivel", "subhabilidade", "bncc_sugerido", "tipo",
                  "comando", "interacao", "feedback"):
        if campo not in ativ:
            erro(aid, f"campo obrigatório ausente: {campo}")
            return

    pref = PREFIXOS.get(eixo_id)
    if pref and not aid.startswith(pref + "-"):
        erro(aid, f"id deveria começar com {pref}- (eixo {eixo_id})")
    if ativ["nivel"] not in (1, 2, 3):
        erro(aid, f"nivel inválido: {ativ['nivel']}")
    if ativ["tipo"] not in TIPOS:
        erro(aid, f"tipo desconhecido: {ativ['tipo']}")
        return
    if not ativ["comando"].strip():
        erro(aid, "comando vazio — é o texto falado à criança")
    for k in ("acerto", "erro"):
        if not ativ["feedback"].get(k, "").strip():
            erro(aid, f"feedback.{k} vazio")

    tipo, inter = ativ["tipo"], ativ["interacao"]

    if tipo in ("escolha_imagem", "selecao_multipla"):
        opcoes = inter.get("opcoes")
        if not opcoes:
            erro(aid, "sem opcoes")
            return
        corretas = sum(1 for o in opcoes if o.get("correta"))
        if tipo == "escolha_imagem":
            if corretas != 1:
                erro(aid, f"escolha_imagem precisa de exatamente 1 correta, tem {corretas}")
            if not 2 <= len(opcoes) <= 4:
                erro(aid, f"escolha_imagem: 2 a 4 opções, tem {len(opcoes)}")
            if ativ["nivel"] == 1 and len(opcoes) > 3:
                aviso(aid, "nível 1 com mais de 3 opções — pesado para a faixa etária")
        else:
            if corretas < 2:
                erro(aid, f"selecao_multipla precisa de 2+ corretas, tem {corretas}")
            if corretas == len(opcoes):
                erro(aid, "selecao_multipla sem nenhum distrator")
        for o in opcoes:
            if "correta" not in o:
                erro(aid, f"opção '{o.get('rotulo', '?')}' sem campo 'correta'")

    elif tipo == "arrastar_para_alvo":
        alvos = {a.get("id") for a in inter.get("alvos", [])}
        if not alvos:
            erro(aid, "sem alvos")
        arr = inter.get("arrastaveis", [])
        if not arr:
            erro(aid, "sem arrastaveis")
        if not any(a.get("alvo") for a in arr):
            erro(aid, "nenhum arrastável tem alvo — nada a acertar")
        for a in arr:
            if "alvo" not in a:
                erro(aid, f"arrastável '{a.get('rotulo', '?')}' sem campo 'alvo'")
            elif a["alvo"] is not None and a["alvo"] not in alvos:
                erro(aid, f"arrastável '{a.get('rotulo', '?')}' aponta para alvo inexistente: {a['alvo']}")

    elif tipo == "ordenar_sequencia":
        itens = inter.get("itens", [])
        if len(itens) < 3:
            erro(aid, f"ordenar_sequencia precisa de 3+ itens, tem {len(itens)}")
        ordens = sorted(i.get("ordem") for i in itens)
        if ordens != list(range(1, len(itens) + 1)):
            erro(aid, f"ordens devem ser 1..{len(itens)} sem repetir nem pular; estão {ordens}")

    elif tipo == "parear":
        pares = inter.get("pares", [])
        if not 2 <= len(pares) <= 4:
            erro(aid, f"parear: 2 a 4 pares, tem {len(pares)}")
        for p in pares:
            if "a" not in p or "b" not in p:
                erro(aid, "par sem lado 'a' ou 'b'")

    elif tipo == "contar_toques":
        q = inter.get("quantidade")
        if not isinstance(q, int) or not 1 <= q <= 10:
            erro(aid, f"quantidade deve ser inteiro de 1 a 10, é {q!r}")

    for m in midias(inter):
        if not m.get("rotulo", "").strip():
            erro(aid, "mídia sem 'rotulo' (usado na leitura em voz alta e na revisão pedagógica)")


def escrever_js(destino, nome, dados):
    """O mesmo banco como .js.

    O jogo abre com um duplo clique no index.html, sem servidor — e o navegador
    bloqueia `fetch` em `file://`. Então o banco entra por <script>, como
    variável, em vez de ser buscado. O .json continua sendo gerado: é o formato
    de quem lê os dados de fora do jogo.
    """
    destino.write_text(
        f"/* Gerado por ferramentas/validar.py --build. Não edite à mão. */\n"
        f"window.{nome} = " + json.dumps(dados, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8")


def main():
    build = "--build" in sys.argv

    indice = json.loads((CONTEUDO / "eixos.json").read_text(encoding="utf-8"))
    banco, todos_ids, assets = [], [], set()

    for eixo in indice["eixos"]:
        caminho = CONTEUDO / eixo["arquivo"]
        if not caminho.exists():
            erros.append(f"  [{eixo['id']}] arquivo não encontrado: {eixo['arquivo']}")
            continue
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        if dados.get("eixo") != eixo["id"]:
            erros.append(f"  [{eixo['id']}] campo 'eixo' do arquivo é '{dados.get('eixo')}'")
        for ativ in dados["atividades"]:
            validar_atividade(ativ, eixo["id"])
            todos_ids.append(ativ.get("id"))
            assets.update(coletar_assets(ativ))
            banco.append({**ativ, "eixo": eixo["id"]})

    for aid, n in Counter(todos_ids).items():
        if n > 1:
            erros.append(f"  [{aid}] id repetido {n} vezes")

    for eixo in indice["eixos"]:
        do_eixo = [a for a in banco if a["eixo"] == eixo["id"]]
        niveis = Counter(a["nivel"] for a in do_eixo)
        faltando = [n for n in (1, 2, 3) if niveis[n] == 0]
        if faltando:
            avisos.append(f"  [{eixo['id']}] sem atividades de nível {faltando}")

    print(f"{len(banco)} atividades em {len(indice['eixos'])} eixos")
    tipos = Counter(a["tipo"] for a in banco)
    for t, n in tipos.most_common():
        print(f"  {t:22} {n:3}  ({n * 100 // len(banco)}%)")
    print(f"{len(assets)} assets distintos referenciados")

    if avisos:
        print(f"\nAVISOS ({len(avisos)}):")
        print("\n".join(avisos))
    if erros:
        print(f"\nERROS ({len(erros)}):")
        print("\n".join(erros))
        return 1
    print("\nValidação OK.")

    if build:
        DIST.mkdir(exist_ok=True)
        saida = {
            "versao": indice["versao"],
            "publico": indice["publico"],
            "aviso_bncc": indice["aviso_bncc"],
            "eixos": [{k: v for k, v in e.items() if k != "arquivo"} for e in indice["eixos"]],
            "tipos_interacao": indice["tipos_interacao"],
            "niveis": indice["niveis"],
            "atividades": banco,
        }
        (DIST / "atividades.json").write_text(
            json.dumps(saida, ensure_ascii=False, indent=1), encoding="utf-8")
        escrever_js(DIST / "atividades.js", "BANCO_COMPLETO", saida)
        # locuções: o enunciado e os dois retornos de cada atividade. Os retornos
        # entraram na lista quando deixaram de depender da voz do navegador.
        locucoes = [f"audio/comandos/{a['id']}.mp3" for a in banco]
        locucoes += [f"audio/feedback/{a['id']}-{c}.mp3"
                     for a in banco for c in ("acerto", "erro")]
        (DIST / "assets.txt").write_text(
            "\n".join(sorted(assets) + sorted(locucoes)) + "\n", encoding="utf-8")
        kb = (DIST / "atividades.json").stat().st_size / 1024
        print(f"\ndist/atividades.json  {kb:.0f} KB")
        print(f"dist/assets.txt       {len(assets)} mídias + {len(locucoes)} locuções")

    return 0


if __name__ == "__main__":
    sys.exit(main())
