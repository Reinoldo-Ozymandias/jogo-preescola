# Jogo educacional — Educação Infantil, Pré-escola II

Jogo web para crianças de **5 a 6 anos**, desenvolvido na parceria entre o curso de
**Sistemas de Informação da UNIFEBE** e a **Secretaria Municipal de Educação de
Brusque** (projeto de curricularização da extensão).

**120 atividades em 10 eixos**, HTML/CSS/JS puros — sem dependências e sem build.

## Rodar

**Dê um duplo clique em `jogo/index.html`.** É só isso — não precisa de servidor,
nem de Python, nem de instalar nada. HTML, CSS e JS puros.

Para isso funcionar o jogo não usa `type="module"` nem `fetch`: o navegador recusa os
dois em `file://`. Cada arquivo de `jogo/js/` se fecha numa função e publica um nome
(`Midia`, `Som`, `Progresso`, `Atividades`, `Revisao`), e o banco de atividades entra
por `<script>` como variável — `dist/piloto.js` e `dist/atividades.js`, gerados pelo
`validar.py --build` ao lado dos `.json`. **A ordem dos `<script>` no `index.html`
importa**: cada um usa o nome que o anterior publicou.

Para desenvolver, servir por HTTP continua sendo melhor:

```bash
./servir.py          # http://localhost:8000/jogo/
```

Ele manda `Cache-Control`; o `python3 -m http.server` não, e aí você edita um `.js`,
recarrega e continua vendo o código velho.

## Estrutura

```
conteudo/        as atividades (fonte) + schema + corte fixo de 20
jogo/            a aplicação: index.html, css/, js/, audio/
ferramentas/     validar.py · revisao.py · gerar-audio.py · fala.py
dist/            gerado — os .js são o que o jogo consome em runtime
```

Depois de editar qualquer atividade:

```bash
python3 ferramentas/validar.py --build
```

É ele que regera `dist/*.json` **e** os `dist/*.js` que o jogo carrega. Editar o
conteúdo sem rodar isso não muda nada na tela.

O validador pega ID repetido, atividade sem resposta certa, ordem quebrada em
sequência e arrastável apontando para alvo inexistente.

## Como a sessão é montada

**A sessão são as 20, sempre as mesmas e na mesma ordem**: agrupadas por eixo — as
duas de Grandezas, depois as duas de Noções Espaciais, e assim por diante — e do fácil
para o difícil dentro de cada eixo. Não há sorteio nem tamanho configurável; quem
acompanha a criança sabe exatamente onde ela está.

O jogo carrega `dist/piloto.json` e só ele. As outras 100 continuam em
`dist/atividades.json`, alcançáveis pela **tela de revisão** e pelo atalho `?id=`, mas
ninguém tropeça nelas jogando.

`?id=` e `?eixo=` abrem uma sessão e **saem da barra de endereço** ao abrir: sem isso a
aba fica presa no atalho, e recarregar caía sempre na prévia de uma atividade só — que
termina no primeiro acerto e parece que o jogo virou uma pergunta. O link segue
funcionando ao ser clicado; só não gruda. `?revisao` continua na URL de propósito: ali
é tela onde se fica, e recarregar deve devolver a mesma tela. Quando forem conferidas, entram acrescentando os IDs em
`conteudo/piloto.json` — e o que sorteava um recorte está no histórico do git.

### Por que só 20

Nenhuma ilustração existe: `jogo/js/midia.js` deduz um emoji do rótulo. Isso funciona
para a maioria, mas **10 atividades ficam impossíveis** porque duas ou mais opções
desenham exatamente igual — medido renderizando as 120 sem arte:

| atividade | as opções que saem idênticas |
|---|---|
| `CO-001` `CO-002` `CO-003` | balão vermelho ≡ azul ≡ amarelo — o emoji 🎈 não tem cor |
| `PV-001` | estrela amarela ≡ estrela azul |
| `PV-006` `PV-010` | as peças de quebra-cabeça e as setas giradas |
| `NE-005` `NE-009` `NE-010` `NE-012` | longe/perto, direita/esquerda, os três caminhos |

Somam-se `CF-005`, `CF-006`, `CF-007` e `LP-010`, que dependem do fonema alongado e
hoje saem como o nome da letra, e `CA-006` — a história da Ana, que lida pelo
sintetizador sai robótica: narrativa longa é onde a voz humana faz mais falta. Com
`CA-006` fora, o corte cobre 3 dos 4 tipos de estímulo; narrativa volta quando alguém
gravar. **Todas voltam sozinhas quando a arte e as locuções chegarem** — não há nada a
consertar no código delas.

Outros 7 têm a **figura de apoio** em branco (`CQ-008` e `CQ-009` apoiam-se na fita de
números, que o placeholder não sabe desenhar; também `LP-005`, `PV-006`, `PV-008`,
`PV-009`, `PV-012`). A tela de revisão marca essas também.

Colisão de propósito NÃO conta: `PV-002` (duas figuras iguais e uma diferente É o
exercício), `CQ-007`, `LP-012` e `CA-005` (dois botões de som iguais, a resposta está
no áudio).

## Os eixos

| # | Eixo | IDs | # | Eixo | IDs |
|---|------|-----|---|------|-----|
| 1 | Grandezas e Comparações | `GC-` | 6 | Consciência Fonológica | `CF-` |
| 2 | Noções Espaciais | `NE-` | 7 | Consciência Silábica | `CS-` |
| 3 | Contagem e Quantidades | `CQ-` | 8 | Letras e Palavras | `LP-` |
| 4 | Cores | `CO-` | 9 | Percepção Visual | `PV-` |
| 5 | Animais e Habitats | `AH-` | 10 | Compreensão Auditiva | `CA-` |

12 atividades por eixo, em 3 níveis de dificuldade.

**O jogo roda 20 fixas, não as 120.** `conteudo/piloto.json` fixa 2 atividades por
eixo — o conjunto verificado como jogável **hoje**, sem nenhuma ilustração. As outras
100 continuam no banco e ficam atrás de uma marcação no painel do professor até serem
conferidas uma a uma.

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

**Nas de ordenar, a pergunta se repete com um toque.** "Toque no sol, depois no
peixe e por último na casa" é muita coisa para guardar de cabeça enquanto se monta a
sequência — e, ao contrário da escolha simples, aqui a criança fica um tempo na tela.
O 🔊 do topo repete em qualquer atividade, mas é um ícone pequeno num canto; nas de
`ordenar_sequencia` o botão vem grande, no rodapé, junto da mão.

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

393 arquivos em `jogo/audio/`: o enunciado e os **dois retornos** (acerto e erro) de
cada atividade, mais palavras, sílabas, histórias e os sons. O jogo toca o MP3 gravado
e só usa a voz sintética do navegador se o arquivo faltar. **Para jogar não é preciso
instalar nada.**

**O texto falado não é o texto da tela.** O banco escreve para o olho — `BO-LA` mostra
a divisão silábica, `SapaTO` destaca a terminação, `CA + SA = CASA` mostra a soma. O
espeak-ng, que o Piper usa por baixo, lê essa notação ao pé da letra: "bê-ó-la",
"sapa tê-ó", "cá mais sá igual casa". `ferramentas/fala.py` traduz a notação para fala
antes da síntese, e `paraFala()` em `jogo/js/audio.js` faz o mesmo para o caso de o
MP3 faltar — **mudou num, mude no outro.** Hífen legítimo (`quebra-cabeça`,
`guarda-chuva`, `au-au`) fica intacto de propósito: esse o espeak já lê certo.

**Duas vozes, de propósito.** Frase corrida sai na `faber`; palavra e sílaba
isoladas — as que o botão "Ouvir" repete nos eixos de consciência fonológica e
silábica — saem na `edresson`, porque a faber engole a consoante inicial de palavra
solta ("mala" virava "ala"). Detalhe e medição em [`vozes/README.md`](vozes/README.md).
Como o modelo é estocástico e às vezes engole a consoante de qualquer jeito, essas
gerações fazem **algumas tomadas e ficam com a de ataque mais claro**, medindo o trecho
audível antes da vogal.

`jogo/audio/textos-falados.json` guarda o texto **e a voz** que geraram cada MP3. É o que faz o
gerador perceber que um arquivo ficou para trás quando o enunciado (ou a regra de
fala) muda — sem isso um `BO-LA` gravado errado fica no lugar para sempre.

Para regerar: veja [`vozes/README.md`](vozes/README.md) e rode
`ferramentas/gerar-audio.py`. A fala sai do **Piper**, que roda local — nenhum texto do
projeto sai da máquina. Os sons de ambiente e instrumento são sintetizados com ffmpeg
e acertam o caráter, não o timbre real.

Origem e licença de cada som de terceiro em
[`jogo/audio/CREDITOS.md`](jogo/audio/CREDITOS.md).

## Revisão pedagógica

A folha que a coordenação preenche **é uma tela do jogo**, não um documento à parte:
área do professor (⚙️ na abertura) → *Abrir a revisão pedagógica*, ou direto em
`?revisao=1`.

Lista as 120 atividades por eixo com o que cada uma fala, a resposta certa, a nota ao
professor e o código BNCC proposto. Em cada uma: **OK · Ajustar · Remover**, um campo
para o comentário e um **▶ ver no jogo**, que abre aquela atividade exatamente como a
criança vê — é a diferença entre revisar a descrição e revisar a coisa.

Cada atividade cujas opções **desenham idênticas sem ilustração** vem com um aviso —
`NE-010` ("qual caminho leva o coelho até a cenoura") vira três 🛣️ iguais, e sem o
aviso a coordenação julgaria uma atividade que na verdade só está esperando arte. O
aviso é calculado na hora, renderizando as opções: some sozinho quando o png chegar,
não é lista para manter à mão.

Usa sempre o banco completo, mesmo com o jogo nos 20: revisar 20 e entregar 120
não fecha. O parecer fica no `localStorage` desta máquina; **Baixar o parecer (.md)**
gera o documento já preenchido, que é o que volta para a Secretaria.

`ferramentas/revisao.py` continua gerando a mesma folha **em branco**, para quem
prefere revisar no papel.

## Testes

```
http://localhost:8000/jogo/teste.html
```

Monta cada uma das 120 atividades, resolve do jeito certo e do jeito errado e confere
se os callbacks disparam. Roda em ~2 s. **Rode antes de cada commit.**

## O que ainda falta

1. **Validação pedagógica.** Os códigos `bncc_sugerido` são mapeamento de
   desenvolvedor, não parecer pedagógico. Noções Espaciais é o ponto fraco — a BNCC de
   Educação Infantil não tem código próprio para em cima/embaixo. A tela de revisão
   (acima) existe para isso: falta a coordenação percorrê-la antes de considerar o
   conteúdo fechado.
2. **Arte.** Nenhuma ilustração existe; `dist/assets.txt` lista as 242 imagens que faltam.
3. **Atribuição obrigatória.** O mugido de vaca é CC BY-SA 4.0 e o crédito precisa
   aparecer no material entregue. Uma gravação própria elimina a obrigação.
4. **Três locuções precisam de voz humana.** O fonema alongado não sai de
   sintetizador: em `CF-005` (`fff…`), `CF-007` (`mmmm…`) e `LP-010`
   (`Sss… ooo… lll`), o espeak devolve o NOME da letra — exatamente o que a
   `nota_professor` de CF-005 manda não fazer ("pronuncie o som alongado, nunca
   'efe'"). Hoje sai "éfe"; o certo é alguém gravar.
5. **Piloto em sala.** Vários itens estão marcados na `nota_professor` como suspeitos
   de serem difíceis demais (`NE-012` lateralidade, `PV-009` padrão ABB, `CF-010` rima
   com negação). Só o teste com crianças decide se ficam, mudam de nível ou saem.
