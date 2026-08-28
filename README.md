# Jogo educacional — Educação Infantil, Pré-escola II

Jogo web para crianças de **5 a 6 anos**, desenvolvido na parceria entre o curso de
**Sistemas de Informação da UNIFEBE** e a **Secretaria Municipal de Educação de
Brusque** (projeto de curricularização da extensão).

O banco tem **120 atividades em 10 eixos**. O jogo roda **20 delas** — o corte
verificado como jogável hoje, sem nenhuma ilustração ([por que](#por-que-só-20)).
HTML, CSS e JS puros: sem dependências, sem build, sem servidor.

## Rodar

**Dê um duplo clique em `jogo/index.html`.** É só isso.

Para isso funcionar, o jogo não usa `type="module"` nem `fetch` — o navegador recusa
os dois em `file://`. Cada arquivo de `jogo/js/` se fecha numa função e publica um
nome (`Midia`, `Som`, `Progresso`, `Atividades`, `Revisao`); o banco entra por
`<script>` como variável, de `dist/piloto.js` e `dist/atividades.js`. **A ordem dos
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
com 18 MB versionados, longe do limite. Em *Settings → Pages*, aponte para a
branch `main`, pasta `/` (raiz).

O `index.html` da raiz existe só para isso: o Pages não lista diretório, então sem
ele o endereço do projeto daria 404 em vez de abrir o jogo — ele redireciona para
`jogo/`. O `.nojekyll` desliga um processamento que não temos o que fazer com ele.

⚠️ Publicado, o `?revisao=1` fica aberto a quem tiver o link: a folha de parecer
mostra a resposta certa de todas as 120. Não é segredo — as respostas estão no JS
de qualquer jeito — mas convém saber antes de divulgar o endereço.

## Estrutura

```
conteudo/        as atividades (fonte) + schema + o corte de 20
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

12 atividades por eixo, em 3 níveis de dificuldade.

## Como a sessão é montada

**São as 20, sempre as mesmas e na mesma ordem**: agrupadas por eixo — as duas de
Grandezas, depois as duas de Noções Espaciais, e assim por diante — e do fácil para o
difícil dentro de cada eixo. Não há sorteio nem tamanho configurável; quem acompanha a
criança sabe exatamente onde ela está.

Quais são as 20 está em `conteudo/piloto.json`. As outras 100 continuam no banco,
alcançáveis pela [tela de revisão](#revisão-pedagógica) e pelo atalho `?id=`, mas
ninguém tropeça nelas jogando. Conforme forem conferidas, entram acrescentando os IDs
ali — o que sorteava um recorte está no histórico do git.

**Atalhos de URL.** `?id=GC-001` abre uma atividade, `?eixo=cores` abre um eixo,
`?revisao=1` abre a folha de parecer. Os dois primeiros **saem da barra de endereço**
ao abrir: sem isso a aba fica presa no atalho e recarregar cai sempre na prévia de uma
atividade só, que termina no primeiro acerto. `?revisao` continua na URL de propósito
— ali é tela onde se fica.

### Por que só 20

Nenhuma ilustração existe, e o placeholder deduz um emoji do rótulo. Funciona para a
maioria, mas **10 atividades ficam impossíveis** porque duas ou mais opções desenham
exatamente igual — medido renderizando as 120 sem arte:

| atividade | as opções que saem idênticas |
|---|---|
| `CO-001` `CO-002` `CO-003` | balão vermelho ≡ azul ≡ amarelo — o emoji 🎈 não tem cor |
| `PV-001` | estrela amarela ≡ estrela azul |
| `PV-006` `PV-010` | as peças do quebra-cabeça, as setas giradas |
| `NE-005` `NE-009` `NE-010` `NE-012` | longe/perto, direita/esquerda, os três caminhos |

Outras **7 têm a figura de apoio em branco**: `CQ-008` e `CQ-009` apoiam-se na fita de
números, que o placeholder não sabe desenhar, e o mesmo vale para `LP-005`, `PV-006`,
`PV-008`, `PV-009` e `PV-012`.

E **5 dependem de voz humana**: `CF-005` (`/f/`), `CF-006` (`/b/`), `CF-007` (`/m/`) e
`LP-010` (`Sss… ooo… lll`) pedem o fonema alongado, que o sintetizador devolve como o
nome da letra ("éfe"); e `CA-006`, a história da Ana, lida por sintetizador sai
robótica — narrativa longa é onde a voz humana faz mais falta.

**Todas voltam sozinhas quando a arte e as locuções chegarem** — não há nada a
consertar no código delas. Sem `CA-006`, o corte cobre 3 dos 4 tipos de estímulo;
narrativa volta quando alguém gravar.

Colisão de propósito não conta: `PV-002` (duas figuras iguais e uma diferente **é** o
exercício), `CQ-007`, `LP-012` e `CA-005` (dois botões de som iguais, a resposta está
no áudio).

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

393 arquivos em `jogo/audio/`: o enunciado e os **dois retornos** (acerto e erro) de
cada atividade, mais palavras, sílabas, histórias e os sons. O jogo toca o MP3 gravado
e só cai na voz sintética do navegador se o arquivo faltar. **Para jogar não é preciso
instalar nada.**

**O texto falado não é o texto da tela.** O banco escreve para o olho — `BO-LA` mostra
a divisão silábica, `SapaTO` destaca a terminação, `CA + SA = CASA` mostra a soma. O
espeak-ng, que o Piper usa por baixo, lê essa notação ao pé da letra: "bê-ó-la",
"sapa tê-ó", "cá mais sá igual casa". `ferramentas/fala.py` traduz a notação antes da
síntese, e `paraFala()` em `jogo/js/audio.js` faz o mesmo quando falta o MP3 —
**mudou num, mude no outro.** Hífen legítimo (`quebra-cabeça`, `guarda-chuva`,
`au-au`) fica intacto de propósito: esse o espeak já lê certo.

**Duas vozes, de propósito.** Frase corrida sai na `faber`; palavra e sílaba isoladas
— as que o botão "Ouvir" repete nos eixos de consciência — saem na `edresson`, porque
a faber engole a consoante inicial de palavra solta ("mala" virava "ala"). Como o
modelo é estocástico, essas gerações fazem algumas tomadas e ficam com a de ataque
mais claro. Medição em [`vozes/README.md`](vozes/README.md).

`jogo/audio/textos-falados.json` guarda o texto **e a voz** que geraram cada MP3. É o
que faz o gerador perceber quando um arquivo fica para trás — sem isso um `BO-LA`
gravado errado fica no lugar para sempre.

Para regerar, veja [`vozes/README.md`](vozes/README.md) e rode
`ferramentas/gerar-audio.py`. A fala sai do **Piper**, que roda local: nenhum texto do
projeto sai da máquina. Os sons de ambiente e instrumento são sintetizados com ffmpeg
e acertam o caráter, não o timbre real. Origem e licença de cada som de terceiro em
[`jogo/audio/CREDITOS.md`](jogo/audio/CREDITOS.md).

## Revisão pedagógica

A folha que a coordenação preenche **é uma tela do jogo**, não um documento à parte:
área do professor (⚙️ na abertura) → *Abrir a revisão pedagógica*, ou direto em
`?revisao=1`.

Lista as **120** atividades por eixo — revisar 20 e entregar 120 não fecha — com o que
cada uma fala, a resposta certa, a nota ao professor e o código BNCC proposto. Em cada
uma: **OK · Ajustar · Remover**, um campo para o comentário e um **▶ ver no jogo**,
que abre aquela atividade como a criança vê.

Quando uma atividade só está esperando arte, a tela avisa: opções que desenham
idênticas, opção sem emoji nenhum, figura de apoio em branco. `NE-010` ("qual caminho
leva o coelho até a cenoura") vira três 🛣️ iguais, e sem o aviso a coordenação
julgaria a atividade em vez da falta de ilustração. O aviso é calculado na hora,
renderizando as opções: some sozinho quando o png chegar.

O parecer fica no `localStorage` desta máquina; **Baixar o parecer (.md)** gera o
documento já preenchido, que é o que volta para a Secretaria.
`ferramentas/revisao.py` continua gerando a mesma folha **em branco**, para quem
prefere revisar no papel.

## Testes

Abra `jogo/teste.html`. Monta cada uma das **120** atividades, resolve do jeito certo
e do jeito errado e confere se os callbacks disparam. Roda em ~2 s. **Rode antes de
cada commit.**

## O que ainda falta

1. **Validação pedagógica.** Os códigos `bncc_sugerido` são mapeamento de
   desenvolvedor, não parecer pedagógico. Noções Espaciais é o ponto fraco — a BNCC de
   Educação Infantil não tem código próprio para em cima/embaixo. A tela de revisão
   existe para isso: falta a coordenação percorrê-la.
2. **Arte.** Nenhuma ilustração existe; `dist/assets.txt` lista as **242** que faltam.
   É o que destrava a maior parte das 100 fora do corte.
3. **Cinco locuções com voz humana.** `CF-005`, `CF-006`, `CF-007` e `LP-010` pedem o
   fonema alongado, que sintetizador nenhum faz — hoje sai o nome da letra, exatamente
   o que a `nota_professor` de `CF-005` manda não fazer. E `CA-006`, a história, sai
   robótica.
4. **Atribuição obrigatória.** O mugido de vaca é CC BY-SA 4.0 e o crédito precisa
   aparecer no material entregue. Uma gravação própria elimina a obrigação.
5. **Piloto em sala.** Vários itens estão marcados na `nota_professor` como suspeitos
   de serem difíceis demais (`NE-012` lateralidade, `PV-009` padrão ABB, `CF-010` rima
   com negação). Só o teste com crianças decide se ficam, mudam de nível ou saem.
