# Banco de conteúdo — jogo educacional Pré-escola II

Parceria **UNIFEBE (Sistemas de Informação) × Secretaria Municipal de Educação de Brusque**.
Curricularização da extensão.

Este repositório contém a **etapa "Pesquisa e construção das perguntas"**: o conteúdo
pedagógico já no formato de dados que a aplicação vai consumir. Não é documento de texto —
é o banco em si, versionável e validável.

## O que tem aqui

```
conteudo/
  eixos.json                    índice dos 10 eixos, tipos de interação, níveis
  schema.json                   JSON Schema de uma atividade (contrato de dados)
  piloto.json                   quais 20 atividades entram no piloto
  atividades/*.json             12 atividades por eixo = 120 no total
servir.py                     servidor de desenvolvimento (só isso para rodar)
jogo/                         a APLICAÇÃO (HTML + CSS + JS, sem dependências)
  index.html
  teste.html                    autoteste: resolve as 120 atividades por dentro
  css/estilo.css
  js/app.js                     telas, sessões, fluxo
  js/atividades.js              os 6 tipos de interação
  js/midia.js                   placeholders inteligentes (ver abaixo)
  js/audio.js                   fala (Web Speech) e sons sintetizados
  js/progresso.js               desempenho, só em localStorage
ferramentas/
  validar.py                    valida tudo e gera dist/
  revisao.py                    gera a folha de revisão para a Secretaria
dist/                           gerado, não editar à mão
  piloto.json                   ← COMECE POR AQUI: 20 atividades, 1 componente
  assets-piloto.txt             as 74 mídias que o piloto precisa
  revisao-piloto.md             folha de revisão só do piloto
  atividades.json               banco completo, 120 atividades
  assets.txt                    as 395 mídias do banco completo
  revisao-pedagogica.md         folha de revisão do banco completo
```

Rodar:

```bash
python3 ferramentas/validar.py --build
python3 ferramentas/revisao.py          > dist/revisao-pedagogica.md
python3 ferramentas/revisao.py --piloto > dist/revisao-piloto.md
```

## Comece pelo piloto, não pelo banco completo

`dist/piloto.json` tem **20 atividades: 2 por eixo**, uma de nível 1 e uma de nível 2.
Todas são `escolha_imagem`, então **um único componente roda o piloto inteiro** — e os
4 tipos de estímulo (nenhum, imagem, áudio, narrativa) aparecem pelo menos uma vez, de
modo que o piloto exercita o formato de dados por completo.

O que isso economiza: **74 mídias em vez de 395** (18%), e 20 itens de revisão pedagógica
em vez de 120. Se a coordenação pedir mudança de rumo em algum eixo, você refez 2 itens,
não 12.

As outras 100 atividades continuam no repositório, validadas, esperando o piloto voltar
da sala. Para promover mais itens depois do piloto, é só acrescentar os IDs em
`conteudo/piloto.json` e rodar o build de novo.

Editar `conteudo/piloto.json` com um ID que não existe faz o build **falhar**, de propósito.

## Cobertura

120 atividades, 12 por eixo, distribuídas em 3 níveis de dificuldade:

| # | Eixo | Prefixo dos IDs |
|---|------|-----------------|
| 1 | Grandezas e Comparações | `GC-` |
| 2 | Noções Espaciais | `NE-` |
| 3 | Contagem e Quantidades | `CQ-` |
| 4 | Cores | `CO-` |
| 5 | Animais e seus Habitats | `AH-` |
| 6 | Consciência Fonológica | `CF-` |
| 7 | Consciência Silábica | `CS-` |
| 8 | Letras e Palavras | `LP-` |
| 9 | Percepção Visual | `PV-` |
| 10 | Compreensão Auditiva | `CA-` |

## As três decisões que moldam todo o banco

**1. A criança não lê.** Aos 5 anos ela está começando a reconhecer letras, não a ler
enunciados. Por isso todo enunciado é o campo `comando`: um texto que existe para virar
**áudio**, nunca para ser exibido na tela como instrução. As alternativas são **imagens**
(ou letras/numerais isolados em corpo grande, via campo `texto`). Não existe nenhuma
atividade que dependa de ler uma frase.

**2. Seis tipos de interação, e um domina.** 74% do banco é `escolha_imagem` — tocar
numa entre 2 e 4 figuras. **Implemente esse componente primeiro**: sozinho ele já roda
89 das 120 atividades. Depois, em ordem de retorno: `ordenar_sequencia` (11), `parear` (9),
`arrastar_para_alvo` (6), `selecao_multipla` (4), `contar_toques` (1).

**3. Erro nunca pune.** O campo `feedback.erro` não diz "errado": ele **reformula a pista**
e devolve a criança para a tentativa. Sem cronômetro, sem vidas, sem som de derrota. Isso
está no banco inteiro e é requisito, não estilo.

## Como o jogo consome

```js
const banco = await fetch('/dist/atividades.json').then(r => r.json());

// uma sessão curta: 6 atividades de um eixo, do fácil ao difícil
const sessao = banco.atividades
  .filter(a => a.eixo === 'cores')
  .sort((a, b) => a.nivel - b.nivel)
  .slice(0, 6);
```

Uma atividade, na prática:

```json
{
  "id": "GC-001",
  "eixo": "grandezas_comparacoes",
  "nivel": 1,
  "subhabilidade": "maior_menor",
  "bncc_sugerido": ["EI03ET01"],
  "tipo": "escolha_imagem",
  "comando": "Toque no animal MAIOR.",
  "nota_professor": "Contraste extremo entre dois animais muito conhecidos.",
  "estimulo": null,
  "interacao": {
    "embaralhar": true,
    "opcoes": [
      { "imagem": "img/animais/elefante.png", "rotulo": "elefante", "correta": true },
      { "imagem": "img/animais/formiga.png",  "rotulo": "formiga",  "correta": false }
    ]
  },
  "feedback": {
    "acerto": "Isso! O elefante é bem maior.",
    "erro": "Olhe de novo: qual deles ocupa mais espaço na tela?"
  }
}
```

Campos que valem explicação:

- **`rotulo`** — nome falado da opção. Serve para leitura em voz alta, para acessibilidade
  e para a revisão pedagógica ler o banco sem abrir as imagens. Obrigatório em toda mídia.
- **`estimulo`** — o que a criança vê ou ouve **antes** das opções (o som a identificar,
  a história, a figura-modelo). `null` quando não há.
- **`embaralhar`** — embaralhe as opções a cada execução, senão a criança decora a posição.
  Está `false` só onde a ordem é parte do enunciado (ex.: `NE-006`, o "entre").
- **`personalizavel`** — só `LP-012`, que monta o nome próprio da criança. Depende de
  cadastro de turma; sem cadastro, use o fallback do arquivo.

## Áudio

Cada atividade precisa da locução do seu `comando`, mais os áudios de estímulo dos eixos
6, 7 e 10 (sons de animais, sílabas, histórias, instrumentos).

- **MVP:** Web Speech API (`speechSynthesis`, `lang="pt-BR"`) para os `comando`. Custa zero,
  já funciona no Chrome/Edge das escolas.
- **Entrega final:** locução humana gravada em `audio/comandos/<ID>.mp3`. A voz sintética
  erra prosódia justo onde importa — nos itens de consciência fonológica e silábica, em que
  o som *é* o conteúdo. Nesses eixos, **grave desde já**; não dá para testar rima com TTS.

## Assets

`dist/assets.txt` lista os 275 arquivos de mídia + 120 locuções referenciados. Os caminhos
são convenção (`img/<categoria>/<nome>.png`), ainda não existem arquivos.

Duas restrições que precisam entrar no critério de escolha da arte:
- **licença compatível com uso público municipal** — a Secretaria vai distribuir isto;
- **estilo único** em todo o banco. Ilustração misturada com foto confunde a criança sobre
  o que é para comparar.

## O que ainda falta (e é honesto dizer)

1. **Validação pedagógica.** Os códigos `bncc_sugerido` são mapeamento meu, de
   desenvolvedor. Alguns são seguros (`EI03ET07` para contagem, `EI03EF02` para rima);
   outros são discutíveis — noções espaciais não têm código próprio na BNCC de Educação
   Infantil e ficaram entre `EI03ET01` e `EI03CG01`. **Leve `dist/revisao-pedagogica.md`
   para a coordenação antes de considerar o conteúdo fechado.**
2. **Arte e áudio.** Nenhum arquivo de mídia existe ainda.
3. **Pilotar com crianças reais.** Vários itens estão marcados na `nota_professor` como
   suspeitos de serem difíceis demais (`NE-012` lateralidade, `PV-009` padrão ABB,
   `CF-010` rima com negação). Só o teste em sala decide se ficam, mudam de nível ou saem.
4. **Registro de desempenho.** O banco tem `id`, `eixo`, `nivel` e `subhabilidade` — a
   estrutura para acompanhar o desenvolvimento por habilidade já está aqui, mas o
   armazenamento e o painel do professor ainda não foram especificados.

## Convenções para continuar o banco

- ID = prefixo do eixo + três dígitos, sequencial (`CO-013`). Nunca reaproveite ID de
  atividade removida — o histórico de desempenho aponta para ele.
- Nível 1 = 2 a 3 opções e contraste máximo. Nível 3 = raciocínio relacional, negação,
  memória ou seriação.
- Uma variável por vez: comparando tamanho, mantenha cor e forma iguais.
- Rode `validar.py` antes de commitar. Ele pega ID repetido, atividade sem resposta certa,
  ordem quebrada em sequência e arrastável apontando para alvo inexistente.


---

# O jogo

HTML, CSS e JavaScript puros. **Zero dependências, zero build.** Módulos ES nativos,
servidos como arquivos estáticos — é o que sobrevive ao parque de máquinas de escola
municipal e o que uma pessoa sozinha consegue manter.

```bash
./servir.py          # http://localhost:8000/jogo/
```

Precisa ser por HTTP: com `file://` o navegador bloqueia o `fetch` do banco.

Não use `python3 -m http.server`: ele não manda `Cache-Control`, o Chrome guarda os
módulos ES em cache e você edita um `.js`, recarrega e continua vendo o código velho.
O `servir.py` manda `no-store` e silencia os 404 das ilustrações que ainda não existem.

## Telas

**Abertura** → toque para liberar o áudio (exigência dos navegadores) e começar.
**Atividade** → chip do assunto, enunciado, estímulo, interação, botão 🔊 para reouvir.
**Fim de sessão** → estrelas pelo acerto de primeira, sem nota e sem comparação.
**Área do professor** (⚙️ discreto na abertura) → banco piloto ou completo, tamanho da
sessão, escolha de voz e velocidade da fala, desempenho por eixo, e a lista de
sub-habilidades com baixo acerto — que é o que interessa para planejar a aula.

Não há tela de escolha de assunto: **é um jogo só, embaralhado**. A criança aperta
Começar e joga.

Atalhos de URL: `?eixo=cores` restringe a sessão a um eixo, `?id=NE-001` abre uma
atividade específica. Servem para depurar e para mostrar um item numa reunião de
revisão — não fazem parte do caminho da criança.

## Como a sessão é montada

Embaralhada, mas não no monte. Três regras, em `iniciarSessao()`:

1. **Sobe de nível ao longo da sessão** — um terço de nível 1, um terço de 2, o resto
   de 3. A criança entra pelo fácil.
2. **Reveza os assuntos** dentro de cada faixa de nível, em vez de sortear no monte.
   Sem isso, medindo, metade de uma sessão de 8 caía no mesmo eixo.
3. **Nunca dois seguidos do mesmo assunto** — parece repetitivo mesmo estando sorteado.

Resultado típico de uma sessão de 8: 6 assuntos diferentes, 4 tipos de interação.

## O enunciado na tela

A criança não lê — mas quem está do lado dela lê, e sem o texto não dá para saber se
Grandezas está pedindo o **MAIOR** ou o **MENOR**. Por isso o enunciado aparece na
tela, com a palavra-chave destacada na cor do assunto.

O banco já escreve essa palavra em CAIXA ALTA (`"Toque no animal MAIOR."`), então o
destaque sai de graça — é só marcar as maiúsculas. Ao escrever atividades novas,
**mantenha essa convenção**.

## Placeholders que entendem o conteúdo

Nenhuma ilustração existe ainda. Em vez de caixas cinzas iguais — que tornariam metade
do banco impossível de jogar — `midia.js` lê o campo `rotulo` e deduz o que desenhar:

| o rótulo diz | o placeholder faz |
|---|---|
| `elefante` / `formiga` | emoji no **tamanho real relativo** (1.55 × 0.3) |
| `seis formigas` | repete o emoji **seis vezes** |
| `gato em cima da mesa` | **compõe dois emoji** na posição certa |
| `azul escuro` | **amostra da cor**, escurecida |
| `tronco grosso` | mesmo emoji, **escala maior** |

Cobertura medida: **323 de 324 mídias** do banco viram algo distinguível (a única
sobra resolve pelo nome do arquivo). Com isso, os eixos de Grandezas, Contagem,
Noções Espaciais e Cores são jogáveis **antes de existir arte**.

`<img>` é sempre tentado primeiro. Quando a arte real chegar em `jogo/img/…`, ela
simplesmente aparece — nada no código muda.

## Testes de conforto já feitos

Duas sessões de playtest com agentes automatizados, uma simulando criança de 5 anos
(clique impreciso, clique repetido, erro proposital em série, ignorando todo o texto)
e outra simulando adulto atento. O que saiu de lá e já está corrigido:

- Cores: três balões idênticos (tint fraco demais) → cor agora domina o cartão.
- Ordenar: slot preenchido escondia o próprio conteúdo → afetava 11 atividades.
- "Apagar todo o histórico" apagava com um clique → agora exige dois.
- `tamanhoSessao` com 0 caía em 6 em vez do mínimo 2 (`|| 6` com falsy).
- Painel escrevia "1 atividades"; slider sem valor numérico; `select` de voz cortado
  no celular.
- Placeholder de arquivo desconhecido mostrava siglas ("F1") → agora moldura neutra.
- Estímulo com vários áudios tocava só o primeiro arquivo → CA-005 ("qual som foi mais
  FORTE"), CA-011 (ordem de três sons) e CS-009/010 (juntar duas sílabas) ficavam sem
  resposta possível. Agora toca a sequência inteira.

O que os testes apontaram e **continua em aberto**, por ser decisão de conteúdo e não
de código:

- **Eixos 6, 7 e 10 são mudos sem áudio gravado.** Rima, sílaba e som ambiente não têm
  pista visual possível — sem voz, a criança só chuta. Pior: a falha é silenciosa, a
  professora não percebe que o áudio não tocou.
- **"Copo cheio / pela metade / vazio"** vira copo grande / médio / pequeno no
  placeholder. Dá para acertar pelo motivo errado. Resolve com a arte real.
- **O botão ← sai da sessão sem confirmar.**

## Autoteste

```
http://localhost:8000/jogo/teste.html
```

Monta cada uma das 120 atividades, resolve do jeito certo e do jeito errado, e confere
se os callbacks disparam como deveriam. Roda em ~2 s. **Rode antes de qualquer commit** —
foi ele que pegou os dois erros de justiça descritos abaixo.

## Decisões que valem conhecer antes de mexer

**Itens idênticos são intercambiáveis.** `LP-012` monta o nome "A N A" e `CQ-007` põe
cinco flores iguais para escolher três. Amarrar a resposta ao item específico faria o
jogo acusar erro numa resposta que a criança não tem como distinguir. Por isso
`ordenar_sequencia` compara conteúdo, e `arrastar_para_alvo` trabalha com **cota por
rótulo** em vez de item fixo.

**O retorno tem tempo mínimo.** O balão de acerto/erro fica no ar pelo maior entre a
fala e 1,5 s. Sem esse piso, numa máquina sem voz pt-BR instalada a fala falha em 0 ms
e o retorno pisca e some antes de a criança perceber.

**Erro nunca pune.** Sem cronômetro, sem vidas, sem som de derrota. O som de "tenta de
novo" é uma nota grave curta, deliberadamente diferente de um erro de jogo.

**A palavra-chave do enunciado vem em CAIXA ALTA no banco.** É o que o jogo usa para
destacá-la na tela. Atividade nova sem isso perde o destaque e fica ambígua.

**Desempenho não sai da máquina.** Fica em `localStorage`. São dados de crianças
pequenas; acompanhamento entre máquinas é requisito próprio, com conversa sobre LGPD
antes de uma linha de código.

**A cor domina o cartão quando está no rótulo.** "Balão vermelho / azul / amarelo"
usa o mesmo emoji 🎈: se a cor for só um tint suave, as três opções ficam idênticas e
a atividade central do eixo Cores fica impossível de resolver olhando. Por isso o
placeholder pinta o fundo e o anel na cor.

**`.slot.cheio` não pode zerar a cor do texto.** A regra existia para esconder o
número do slot, mas escondia junto o item que a criança acabou de colocar — em todas
as 11 atividades de ordenar. O número já é removido no JS.

## Áudio

**151 arquivos gerados**, em `jogo/audio/`. O jogo toca o mp3 gravado e só cai na voz
sintética do navegador se o arquivo faltar.

Os MP3 estão versionados — para **jogar** não é preciso instalar nada. Só para
**regerar** o áudio: veja [`vozes/README.md`](vozes/README.md).

```bash
PIPER_BIN=.venv/bin/piper python3 ferramentas/gerar-audio.py             # o que falta
PIPER_BIN=.venv/bin/piper python3 ferramentas/gerar-audio.py --force     # refaz tudo
```

| categoria | como foi feito |
|---|---|
| 120 enunciados, 12 palavras, 4 silabadas, 4 sílabas, 2 histórias | **Piper**, TTS neural que roda **local** — nenhum texto do projeto sai da máquina. Voz `pt_BR-faber-medium`, em `vozes/`. |
| chuva, sirene, tambor, flauta, violão, chocalho, melodia lenta, tambor forte/fraco | **ffmpeg**. São aproximações: acertam o caráter (percussivo, sustentado, dedilhado), não o timbre real. |
| mugido de vaca, canto de galo | **Wikimedia Commons.** Nenhum sintetizador faz som de animal. Origem e licença em [`jogo/audio/CREDITOS.md`](jogo/audio/CREDITOS.md). |

As palavras silabadas são geradas sílaba por sílaba e emendadas com 350 ms de silêncio
— do jeito que a professora bate palmas. Ler "BO-LA" corrido não serve ao exercício.

### ⚠️ Pendência de licença

O **mugido de vaca é CC BY-SA 4.0** e por isso **exige atribuição visível** no produto
entregue. O crédito exato está em [`jogo/audio/CREDITOS.md`](jogo/audio/CREDITOS.md) e
precisa aparecer em algum lugar do material final. O canto de galo é domínio público e
não exige nada.

Gravar um mugido próprio (celular, numa fazenda da região) elimina a obrigação e ainda
traz um som local. Enquanto isso não acontecer, o crédito é obrigatório.

### Quando um áudio falta

A tela mostra "falta gravar: <arquivo>" para o adulto e a criança ouve apenas "esse som
ainda não foi gravado" — **texto neutro de propósito**: dizer "aqui tocaria o som de
vaca" entregaria a resposta na atividade que pergunta qual animal é.

### Ainda vale gravar com voz humana

O Piper resolve o piloto, mas nos eixos 6 e 7 (Consciência Fonológica e Silábica) o
som *é* o conteúdo. Vale comparar a voz sintética com uma gravação humana antes de
fechar — principalmente nas sílabas isoladas e nas palavras que rimam.
