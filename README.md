# Jogo educacional — Educação Infantil, Pré-escola II

Jogo web para crianças de **5 a 6 anos**, desenvolvido na parceria entre o curso de
**Sistemas de Informação da UNIFEBE** e a **Secretaria Municipal de Educação de
Brusque** (projeto de curricularização da extensão).

O banco tem **20 atividades em 10 eixos** — duas por eixo, todas `escolha_imagem`,
verificadas uma a uma sem nenhuma ilustração ([por que](#por-que-só-20)).
HTML, CSS e JS puros: sem dependências, sem build, sem servidor.

## Rodar

**Dê um duplo clique em `jogo/index.html`.** É só isso.

Para isso funcionar, o jogo não usa `type="module"` nem `fetch` — o navegador recusa
os dois em `file://`. Cada arquivo de `jogo/js/` se fecha numa função e publica um
nome (`Midia`, `Som`, `Progresso`, `Atividades`, `Revisao`); o banco entra por
`<script>` como variável, de `dist/atividades.js`. **A ordem dos
`<script>` no `index.html` importa**: cada um usa o nome que o anterior publicou.

O `./servir.py` continua aí, **opcional**, para desenvolver: ele manda
`Cache-Control` — sem isso você edita um `.js`, recarrega e continua vendo o código
velho — e some com as centenas de 404 das ilustrações no log. Também serve para
conferir o caminho HTTP antes de hospedar em algum lugar.

```bash
./servir.py          # http://localhost:8000/jogo/
```

Python continua sendo necessário para as **ferramentas** (`validar.py`,
`gerar-audio.py`, `revisao.py`), nunca para jogar.

### Publicar na web

Serve como está no GitHub Pages — é site estático, sem caminho absoluto nenhum e
com 2,6 MB versionados, longe do limite. Em *Settings → Pages*, aponte para a
branch `main`, pasta `/` (raiz).

O `index.html` da raiz existe só para isso: o Pages não lista diretório, então sem
ele o endereço do projeto daria 404 em vez de abrir o jogo — ele redireciona para
`jogo/`. O `.nojekyll` desliga um processamento que não temos o que fazer com ele.

⚠️ Publicado, o `?revisao=1` fica aberto a quem tiver o link: a folha de parecer
mostra a resposta certa de todas as 20. Não é segredo — as respostas estão no JS
de qualquer jeito — mas convém saber antes de divulgar o endereço.

## Estrutura

```
conteudo/        as 20 atividades (fonte) + schema
jogo/            a aplicação: index.html, css/, js/, audio/
ferramentas/     validar.py · revisao.py · gerar-audio.py · fala.py
dist/            gerado — os .js são o que o jogo carrega em runtime
```

Depois de editar qualquer atividade:

```bash
python3 ferramentas/validar.py --build
```

Ele regera `dist/*.json` **e** os `dist/*.js`. Editar o conteúdo sem rodar isso não
muda nada na tela. De quebra, pega ID repetido, atividade sem resposta certa, ordem
quebrada em sequência e arrastável apontando para alvo inexistente.

## Os eixos

| # | Eixo | IDs | # | Eixo | IDs |
|---|------|-----|---|------|-----|
| 1 | Grandezas e Comparações | `GC-` | 6 | Consciência Fonológica | `CF-` |
| 2 | Noções Espaciais | `NE-` | 7 | Consciência Silábica | `CS-` |
| 3 | Contagem e Quantidades | `CQ-` | 8 | Letras e Palavras | `LP-` |
| 4 | Cores | `CO-` | 9 | Percepção Visual | `PV-` |
| 5 | Animais e Habitats | `AH-` | 10 | Compreensão Auditiva | `CA-` |

2 atividades por eixo, uma de nível 1 e uma de nível 2.

## Como a sessão é montada

**São as 20, sempre as mesmas e na mesma ordem**: agrupadas por eixo — as duas de
Grandezas, depois as duas de Noções Espaciais, e assim por diante — e do fácil para o
difícil dentro de cada eixo. Não há sorteio nem tamanho configurável; quem acompanha a
criança sabe exatamente onde ela está.

**O banco são essas 20**: não existe "banco completo" à parte. O projeto nasceu com
120 atividades; em 2026-10-21 as 100 que não rodavam sem arte foram retiradas do
conteúdo entregue. Elas continuam no histórico do git (commit `896c582` e anteriores) e
a seção [Por que só 20](#por-que-só-20) registra por que cada grupo ficou de fora —
voltam acrescentando os IDs de novo, depois da arte e das locuções.

**Atalhos de URL.** `?id=GC-001` abre uma atividade, `?eixo=cores` abre um eixo,
`?revisao=1` abre a folha de parecer. Os dois primeiros **saem da barra de endereço**
ao abrir: sem isso a aba fica presa no atalho e recarregar cai sempre na prévia de uma
atividade só, que termina no primeiro acerto. `?revisao` continua na URL de propósito
— ali é tela onde se fica.

### Por que só 20

O banco nasceu com 120. Estas 20 são as que **funcionam sem ilustração**: o placeholder
deduz um emoji do rótulo e, nestas, isso basta para as opções ficarem distinguíveis.
As 100 retiradas não foram descartadas por serem ruins — foram medidas, renderizando
cada uma sem arte, e ficaram de fora por um destes três motivos:

**10 ficam impossíveis** porque duas ou mais opções desenham exatamente igual:

| atividade | as opções que saem idênticas |
|---|---|
| `CO-001` `CO-002` `CO-003` | balão vermelho ≡ azul ≡ amarelo — o emoji 🎈 não tem cor |
| `PV-001` | estrela amarela ≡ estrela azul |
| `PV-006` `PV-010` | as peças do quebra-cabeça, as setas giradas |
| `NE-005` `NE-009` `NE-010` `NE-012` | longe/perto, direita/esquerda, os três caminhos |

**7 têm a figura de apoio em branco**: `CQ-008` e `CQ-009` apoiam-se na fita de números,
que o placeholder não sabe desenhar, e o mesmo vale para `LP-005`, `PV-006`, `PV-008`,
`PV-009` e `PV-012`.

**5 dependem de voz humana**: `CF-005` (`/f/`), `CF-006` (`/b/`), `CF-007` (`/m/`) e
`LP-010` (`Sss… ooo… lll`) pedem o fonema alongado, que o sintetizador devolve como o
nome da letra ("éfe"); e `CA-006`, a história da Ana, lida por sintetizador sai
robótica — narrativa longa é onde a voz humana faz mais falta.

Colisão de propósito não conta: `PV-002` (duas figuras iguais e uma diferente **é** o
exercício), `CQ-007`, `LP-012` e `CA-005` (dois botões de som iguais, a resposta está
no áudio).

Consequência assumida: as 20 são todas do mesmo tipo de interação. O código continua
suportando os outros cinco (`selecao_multipla`, `arrastar_para_alvo`,
`ordenar_sequencia`, `parear`, `contar_toques`), mas **nenhuma atividade entregue os
usa** — então o autoteste não os exercita. Eles voltam com as atividades que os usavam.

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

**Erro nunca pune.** Sem cronômetro, sem vidas, sem som de derrota: o retorno de erro
reformula a pista e devolve a criança para a tentativa.

**Nas de ordenar, a pergunta se repete com um toque.** "Toque no sol, depois no peixe
e por último na casa" é muita coisa para guardar de cabeça enquanto se monta a
sequência, e ali a criança fica um tempo na tela. O 🔊 do topo repete em qualquer
atividade, mas é um ícone pequeno num canto; nas de `ordenar_sequencia` o botão vem
grande, no rodapé, junto da mão.

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

É o que sustenta as 20 de pé hoje — e o que não cobre é o que está listado em
[Por que só 20](#por-que-só-20). Quando a arte chegar em `jogo/img/`, ela aparece
sozinha: `<img>` é sempre tentado primeiro.

## Áudio

69 arquivos em `jogo/audio/`: o enunciado e os **dois retornos** (acerto e erro) de
cada atividade, mais as palavras e os sons que as 20 usam. O jogo toca o MP3 gravado
e só cai na voz sintética do navegador se o arquivo faltar. **Para jogar não é preciso
instalar nada.**

**O texto falado não é o texto da tela.** O banco escreve para o olho — `BO-LA` mostra
a divisão silábica, `SapaTO` destaca a terminação, `CA + SA = CASA` mostra a soma. O
espeak-ng, que o sintetizador usa por baixo, lê essa notação ao pé da letra: "bê-ó-la",
"sapa tê-ó", "cá mais sá igual casa". `ferramentas/fala.py` traduz a notação antes da
síntese, e `paraFala()` em `jogo/js/audio.js` faz o mesmo quando falta o MP3 —
**mudou num, mude no outro.** Hífen legítimo (`quebra-cabeça`, `guarda-chuva`,
`au-au`) fica intacto de propósito: esse o espeak já lê certo.

**Uma voz: Kokoro-82M.** Até 2026-10-21 a locução era do Piper (`faber` em frase,
`edresson` em palavra solta). A faber tinha melhor prosódia, mas lia **"lh" como "l"**:
"coelho" saía "coelo". O Kokoro acerta o lh, é natural em 24 kHz e é **Apache 2.0** —
licença que permite distribuir os MP3 no site público. Detalhe e download em
[`vozes/README.md`](vozes/README.md).

**O ritmo é parte do conteúdo, não estética.** O Kokoro em `speed` 1.0 fala a
~17 caracteres/s — ritmo de adulto lendo, rápido demais para 5–6 anos. A locução usa
**0.85** (0.8 em palavra e sílaba isoladas), o que dá ~15 caracteres por segundo, o
mesmo alvo que a versão anterior tinha. O controle "Ritmo da fala" da área do
professor aplica `playbackRate` no MP3 preservando o tom — é ajuste fino em cima da
gravação, não a gravação em si.

`jogo/audio/textos-falados.json` guarda o texto, **a voz e o ritmo** que geraram cada
MP3. É o que faz o gerador perceber quando um arquivo fica para trás — sem isso um
`BO-LA` gravado errado fica no lugar para sempre.

Para regerar, veja [`vozes/README.md`](vozes/README.md) e rode
`ferramentas/gerar-audio.py`. A fala sai do **Kokoro**, que roda local: nenhum texto
do projeto sai da máquina. Os sons de ambiente e instrumento são sintetizados com ffmpeg
e acertam o caráter, não o timbre real. Origem e licença de cada som de terceiro em
[`jogo/audio/CREDITOS.md`](jogo/audio/CREDITOS.md).

## Revisão pedagógica

A folha que a coordenação preenche **é uma tela do jogo**, não um documento à parte:
área do professor (⚙️ na abertura) → *Abrir a revisão pedagógica*, ou direto em
`?revisao=1`.

Lista as **20** atividades por eixo — o mesmo banco que a criança joga; o que a
coordenação aprova é exatamente o que está no ar — com o que cada uma fala, a resposta
certa, a nota ao professor e o código BNCC proposto. Em cada
uma: **OK · Ajustar · Remover**, um campo para o comentário e um **▶ ver no jogo**,
que abre aquela atividade como a criança vê.

Quando uma atividade só está esperando arte, a tela avisa: opções que desenham
idênticas, opção sem emoji nenhum, figura de apoio em branco. É o mesmo cálculo que
escolheu as 20 — nas retiradas, ele acusava três 🛣️ iguais em `NE-010`, e sem o aviso
a coordenação julgaria a atividade em vez da falta de ilustração. O aviso é calculado
na hora, renderizando as opções: some sozinho quando o png chegar.

O parecer fica no `localStorage` desta máquina; **Baixar o parecer (.md)** gera o
documento já preenchido, que é o que volta para a Secretaria.
`ferramentas/revisao.py` continua gerando a mesma folha **em branco**, para quem
prefere revisar no papel.

## Testes

Abra `jogo/teste.html`. Monta cada uma das **20** atividades, resolve do jeito certo e
do jeito errado e confere se os callbacks disparam. Roda em menos de 1 s. **Rode antes
de cada commit.**

Como o banco é todo `escolha_imagem`, o teste hoje cobre **um** dos seis renderizadores.
Ao reintroduzir atividades de outro tipo, o teste passa a cobri-las sozinho.

## O que ainda falta

1. **Validação pedagógica.** Os códigos `bncc_sugerido` são mapeamento de
   desenvolvedor, não parecer pedagógico. Noções Espaciais é o ponto fraco — a BNCC de
   Educação Infantil não tem código próprio para em cima/embaixo. A tela de revisão
   existe para isso: falta a coordenação percorrê-la.
2. **Arte.** Nenhuma ilustração existe; `dist/assets.txt` lista as **54** que faltam.
   É o que destrava as 100 atividades retiradas.
3. **Cinco locuções com voz humana.** `CF-005`, `CF-006`, `CF-007` e `LP-010` pedem o
   fonema alongado, que sintetizador nenhum faz — hoje sai o nome da letra, exatamente
   o que a `nota_professor` de `CF-005` manda não fazer. E `CA-006`, a história, sai
   robótica. Todas são de atividades retiradas: voltam com elas.
4. **Atribuição obrigatória.** O mugido de vaca é CC BY-SA 4.0 e o crédito precisa
   aparecer no material entregue. Uma gravação própria elimina a obrigação.
5. **Teste em sala.** As 20 estão prontas para isso, mas nenhuma foi usada com
   crianças ainda. As `nota_professor` dizem onde olhar primeiro — `CO-004` (nomear
   roxo/laranja), `PV-002` (comparar sem modelo) e `CA-004` (timbre de instrumento).
