#!/usr/bin/env python3
"""Gera a folha de revisão pedagógica EM BRANCO, a partir do banco.

A Secretaria não vai ler JSON. Este script vira o mesmo conteúdo em Markdown
legível, agrupado por eixo, com espaço para o parecer de quem revisa.

O caminho principal hoje é a tela de revisão dentro do jogo (`?revisao=1`), que
mostra a mesma folha, abre cada atividade no jogo de verdade e exporta o
Markdown já PREENCHIDO. Este script continua aqui para quem revisa no papel.

Uso:
    python3 ferramentas/revisao.py           > dist/revisao-pedagogica.md
    python3 ferramentas/revisao.py --piloto  > dist/revisao-piloto.md
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
indice = json.loads((RAIZ / "conteudo" / "eixos.json").read_text(encoding="utf-8"))

so_piloto = "--piloto" in sys.argv
filtro = None
if so_piloto:
    cfg = json.loads((RAIZ / "conteudo" / "piloto.json").read_text(encoding="utf-8"))
    filtro = set(cfg["ids"])

titulo = "Piloto — folha de revisão pedagógica" if so_piloto \
    else "Banco de atividades — folha de revisão pedagógica"
print(f"# {titulo}\n")
if so_piloto:
    print(f"> **Corte de piloto:** {cfg['descricao']}\n")
print(f"**Público:** {indice['publico']}  ")
print(f"**Versão do banco:** {indice['versao']}\n")
print(f"> {indice['aviso_bncc']}\n")
print("Para cada atividade, marque: **OK** · **Ajustar** (diga o quê) · **Remover**.\n")
print("---\n")

total = 0
for eixo in indice["eixos"]:
    dados = json.loads((RAIZ / "conteudo" / eixo["arquivo"]).read_text(encoding="utf-8"))
    print(f"## {eixo['ordem']}. {eixo['nome']}\n")
    print(f"*{eixo['descricao']}*\n")
    print(f"Campo de experiência: {eixo['campo_experiencia']}\n")
    for a in dados["atividades"]:
        if filtro is not None and a["id"] not in filtro:
            continue
        total += 1
        print(f"### {a['id']} — nível {a['nivel']} · {a['subhabilidade'].replace('_', ' ')}\n")
        print(f"**Fala do jogo:** “{a['comando']}”\n")
        est = a.get("estimulo")
        if est:
            if est.get("texto"):
                print(f"**Antes de responder, a criança ouve:** “{est['texto']}”\n")
            else:
                print(f"**Antes de responder, a criança vê/ouve:** `{est.get('asset') or est.get('assets')}`\n")
        inter = a["interacao"]
        if a["tipo"] in ("escolha_imagem", "selecao_multipla"):
            print("**Opções:** " + " · ".join(
                f"**{o['rotulo']}** ✅" if o.get("correta") else o["rotulo"]
                for o in inter["opcoes"]) + "\n")
        elif a["tipo"] == "arrastar_para_alvo":
            alvos = {x["id"]: x["rotulo"] for x in inter["alvos"]}
            print("**Arrastar:** " + " · ".join(
                f"{x['rotulo']} → {alvos.get(x['alvo'], 'não arrastar')}"
                for x in inter["arrastaveis"]) + "\n")
        elif a["tipo"] == "ordenar_sequencia":
            print("**Ordem correta:** " + " → ".join(
                x["rotulo"] for x in sorted(inter["itens"], key=lambda i: i["ordem"])) + "\n")
        elif a["tipo"] == "parear":
            print("**Pares:** " + " · ".join(
                f"{p['a']['rotulo']} ↔ {p['b']['rotulo']}" for p in inter["pares"]) + "\n")
        elif a["tipo"] == "contar_toques":
            print(f"**Resposta:** tocar {inter['quantidade']}× em {inter['alvo']['rotulo']}\n")
        print(f"**Acertou:** “{a['feedback']['acerto']}”  ")
        print(f"**Errou:** “{a['feedback']['erro']}”\n")
        print(f"**Nota ao professor:** {a.get('nota_professor', '—')}\n")
        print(f"**BNCC (a validar):** {', '.join(a['bncc_sugerido'])}\n")
        print("**Parecer:** ( ) OK  ( ) Ajustar: ______________________  ( ) Remover\n")
    print("---\n")

print(f"\n_Total: {total} atividades._\n")
