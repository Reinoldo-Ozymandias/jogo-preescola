# Jogo educacional — Educação Infantil, Pré-escola II

Jogo web para crianças de **5 a 6 anos**, da parceria entre o curso de **Sistemas de
Informação da UNIFEBE** e a **Secretaria Municipal de Educação de Brusque**
(curricularização da extensão).

São **20 atividades em 10 eixos** — duas por eixo, todas de escolha de imagem.
HTML, CSS e JS puros: sem dependências, sem build, sem servidor.

**No ar:** https://reinoldo-ozymandias.github.io/jogo-preescola/

## Rodar

Dê um duplo clique em `jogo/index.html`. É só isso.

Para desenvolver, use o servidor opcional (evita cache de `.js` e esconde os 404 das
ilustrações que ainda não existem):

```bash
./servir.py          # http://localhost:8000/jogo/
```

## Estrutura

```
conteudo/     as 20 atividades (JSON) + eixos + schema
jogo/         a aplicação: index.html, css/, js/, audio/
ferramentas/  validar.py · revisao.py · gerar-audio.py · fala.py
dist/         gerado — é o que o jogo carrega em runtime
vozes/        modelos de voz (não versionados; ver vozes/README.md)
```

## Editar conteúdo

Alterou algo em `conteudo/`? Regenere o pacote:

```bash
python3 ferramentas/validar.py --build
```

Editar o JSON sem rodar isso não muda nada na tela. O validador também pega ID
repetido, atividade sem resposta certa e ordem quebrada.

## Áudio

Os MP3 são gerados localmente com o **Kokoro-82M** (Apache 2.0), voz `pf_dora`, em
ritmo reduzido para 5–6 anos. Nenhum texto sai da máquina.

```bash
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx   # uma vez
.venv/bin/python ferramentas/gerar-audio.py                  # gera o que falta
.venv/bin/python ferramentas/gerar-audio.py --force          # refaz tudo
```

O download do modelo e das vozes está em [`vozes/README.md`](vozes/README.md).
O arquivo `jogo/audio/textos-falados.json` registra texto, voz e ritmo de cada MP3 —
mudou o texto, ele regera o arquivo na próxima execução.

## Testes

Abra `jogo/teste.html`: ele resolve as 20 atividades do jeito certo e do jeito errado
e confere os retornos. Rode antes de cada commit.

## Revisão pedagógica

Dentro do jogo: ⚙️ → *Abrir a revisão pedagógica*, ou `?revisao=1`. Lista as 20
atividades com a resposta certa e o código BNCC proposto, e exporta o parecer em
Markdown. A versão em branco, para imprimir:

```bash
python3 ferramentas/revisao.py > dist/revisao-pedagogica.md
```

## O que falta

1. **Arte** — nenhuma ilustração existe; `dist/assets.txt` lista as 54 imagens que faltam.
   É o que destrava as 100 atividades retiradas do projeto.
2. **Validação pedagógica** — os códigos `bncc_sugerido` são proposta do
   desenvolvedor, não parecer da coordenação.
3. **Crédito obrigatório** — o mugido de vaca é CC BY-SA 4.0 e precisa aparecer no
   material distribuído. Ver [`jogo/audio/CREDITOS.md`](jogo/audio/CREDITOS.md).
4. **Teste em sala** — as 20 estão prontas, mas ainda não foram usadas com crianças.

## Histórico

O projeto começou com 120 atividades. As 100 retiradas não foram descartadas por
serem ruins: dependiam de ilustração ou de voz humana para funcionar. Elas continuam
no histórico do git, a partir do commit `896c582`. O mesmo vale para a locução
anterior (Piper), trocada pelo Kokoro.
