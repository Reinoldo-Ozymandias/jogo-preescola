# Jogo educacional — Educação Infantil, Pré-escola II

Jogo web para crianças de **5 a 6 anos**, desenvolvido na parceria entre o curso de
**Sistemas de Informação da UNIFEBE** e a **Secretaria Municipal de Educação de
Brusque** (projeto de curricularização da extensão).

**120 atividades em 10 eixos**, HTML/CSS/JS puros — sem dependências e sem build.

## Rodar

```bash
./servir.py          # http://localhost:8000/jogo/
```

Precisa ser por HTTP: com `file://` o navegador bloqueia o `fetch` do banco.
Não use `python3 -m http.server` — ele não manda `Cache-Control` e o Chrome serve
módulos ES em cache, fazendo você editar um `.js` e continuar vendo o código velho.

## Estrutura

```
conteudo/        as atividades (fonte) + schema + corte de piloto
jogo/            a aplicação: index.html, css/, js/, audio/
ferramentas/     validar.py · revisao.py · gerar-audio.py
dist/            gerado — é o que o jogo consome em runtime
```

Depois de editar qualquer atividade:

```bash
python3 ferramentas/validar.py --build
```

O validador pega ID repetido, atividade sem resposta certa, ordem quebrada em
sequência e arrastável apontando para alvo inexistente.

## Os eixos

| # | Eixo | IDs | # | Eixo | IDs |
|---|------|-----|---|------|-----|
| 1 | Grandezas e Comparações | `GC-` | 6 | Consciência Fonológica | `CF-` |
| 2 | Noções Espaciais | `NE-` | 7 | Consciência Silábica | `CS-` |
| 3 | Contagem e Quantidades | `CQ-` | 8 | Letras e Palavras | `LP-` |
| 4 | Cores | `CO-` | 9 | Percepção Visual | `PV-` |
| 5 | Animais e Habitats | `AH-` | 10 | Compreensão Auditiva | `CA-` |

12 atividades por eixo, em 3 níveis de dificuldade.

**Comece pelo piloto.** `dist/piloto.json` tem 20 atividades (2 por eixo), todas de um
mesmo tipo de interação — um componente só roda o piloto inteiro, e são 74 mídias em
vez de 395. Para promover mais itens depois, acrescente os IDs em
`conteudo/piloto.json`.

## Formato de uma atividade

```json
{
  "id": "GC-001",
  "eixo": "grandezas_comparacoes",
  "nivel": 1,
  "tipo": "escolha_imagem",
  "comando": "Toque no animal MAIOR.",
  "interacao": {
    "embaralhar": true,
    "opcoes": [
      { "imagem": "img/animais/elefante.png", "rotulo": "elefante", "correta": true },
      { "imagem": "img/animais/formiga.png",  "rotulo": "formiga",  "correta": false }
    ]
  },
  "feedback": { "acerto": "Isso! ...", "erro": "Olhe de novo: ..." }
}
```

Seis tipos de interação: `escolha_imagem`, `selecao_multipla`, `arrastar_para_alvo`,
`ordenar_sequencia`, `parear`, `contar_toques`. Contrato completo em
`conteudo/schema.json`.

## Decisões que moldam o projeto

**A criança não lê.** O enunciado existe para virar **áudio**; o texto na tela é apoio
para o adulto ao lado. As alternativas são imagens, ou letras e numerais em corpo
grande. A palavra-chave vem em CAIXA ALTA no banco e o jogo a destaca — **mantenha
essa convenção** ao escrever atividades novas.

**Erro nunca pune.** Sem cronômetro, sem vidas, sem som de derrota: o feedback de erro
reformula a pista e devolve a criança para a tentativa.

**Itens idênticos são intercambiáveis.** `LP-012` monta o nome "A N A" e `CQ-007` põe
cinco flores para escolher três. Exigir o item específico acusaria erro numa resposta
que a criança não tem como distinguir.

**Desempenho não sai da máquina.** Fica em `localStorage`. São dados de crianças
pequenas; acompanhamento entre máquinas é requisito próprio, com conversa sobre LGPD
antes de uma linha de código.

## Placeholders no lugar da arte

Nenhuma ilustração existe ainda. Em vez de caixas cinzas iguais, `jogo/js/midia.js` lê
o campo `rotulo` e deduz o que desenhar:

| rótulo | resultado |
|---|---|
| `elefante` vs `formiga` | emoji no tamanho real relativo |
| `seis formigas` | o emoji repetido seis vezes |
| `gato em cima da mesa` | dois emoji compostos na posição certa |
| `azul escuro` | amostra da cor |

Com isso Grandezas, Contagem, Noções Espaciais e Cores já são jogáveis. Quando a arte
chegar em `jogo/img/`, ela aparece sozinha — `<img>` é sempre tentado primeiro.

## Áudio

153 arquivos em `jogo/audio/`. O jogo toca o MP3 gravado e só usa a voz sintética do
navegador se o arquivo faltar. **Para jogar não é preciso instalar nada.**

Para regerar: veja [`vozes/README.md`](vozes/README.md) e rode
`ferramentas/gerar-audio.py`. A fala sai do **Piper**, que roda local — nenhum texto do
projeto sai da máquina. Os sons de ambiente e instrumento são sintetizados com ffmpeg
e acertam o caráter, não o timbre real.

Origem e licença de cada som de terceiro em
[`jogo/audio/CREDITOS.md`](jogo/audio/CREDITOS.md).

## Testes

```
http://localhost:8000/jogo/teste.html
```

Monta cada uma das 120 atividades, resolve do jeito certo e do jeito errado e confere
se os callbacks disparam. Roda em ~2 s. **Rode antes de cada commit.**

## O que ainda falta

1. **Validação pedagógica.** Os códigos `bncc_sugerido` são mapeamento de
   desenvolvedor, não parecer pedagógico. Noções Espaciais é o ponto fraco — a BNCC de
   Educação Infantil não tem código próprio para em cima/embaixo. Gere
   `python3 ferramentas/revisao.py > revisao.md` e leve à coordenação antes de
   considerar o conteúdo fechado.
2. **Arte.** Nenhuma ilustração existe; `dist/assets.txt` lista as 395 mídias.
3. **Atribuição obrigatória.** O mugido de vaca é CC BY-SA 4.0 e o crédito precisa
   aparecer no material entregue. Uma gravação própria elimina a obrigação.
4. **Piloto em sala.** Vários itens estão marcados na `nota_professor` como suspeitos
   de serem difíceis demais (`NE-012` lateralidade, `PV-009` padrão ABB, `CF-010` rima
   com negação). Só o teste com crianças decide se ficam, mudam de nível ou saem.
