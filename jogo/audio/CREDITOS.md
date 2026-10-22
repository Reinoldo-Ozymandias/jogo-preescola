# Créditos e licenças do áudio

Este projeto vai ser distribuído por uma secretaria municipal de educação. **Todo som
de terceiro precisa estar registrado aqui, com origem e licença.** Som sem procedência
é passivo jurídico, não é economia de tempo.

## Sons de terceiros

### `animais/vaca.mp3` — mugido de vaca
- **Origem:** Wikimedia Commons, [Single Cow Moo.ogg](https://commons.wikimedia.org/wiki/File:Single_Cow_Moo.ogg)
- **Autor:** MichaeltheFox8621 — gravação própria numa fazenda em Pitlochry, Reino Unido
- **Licença:** ⚠️ **CC BY-SA 4.0** — **exige atribuição e compartilhamento pela mesma licença**
- **Atribuição obrigatória:** "Single Cow Moo" por MichaeltheFox8621, via Wikimedia
  Commons, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), com alterações.
- **Alteração:** recortado para 2,9 s, fades e normalização, convertido para MP3 mono
- **O que isso obriga:** o crédito acima precisa aparecer em algum lugar visível do
  produto final (tela de créditos, README distribuído ou documentação entregue à
  Secretaria). A cláusula *share-alike* recai sobre o arquivo de áudio e seus
  derivados, não sobre o restante do jogo.

> **Substituir este arquivo resolveria a pendência.** Uma gravação própria de mugido
> — celular numa fazenda da região — elimina a obrigação de atribuição e ainda traz
> um som local. Enquanto isso não acontece, o crédito acima é obrigatório.

### Descartado de propósito
`Sound Ideas, COW - SINGLE MOO, ANIMAL 02.wav` aparece no Wikimedia Commons marcado
como domínio público, mas **Sound Ideas é uma biblioteca de efeitos comercial**.
Arquivo dessa origem etiquetado como PD costuma ser upload equivocado, e a etiqueta
no Commons não transfere direito que o autor do upload não tinha. Não usar.

Também descartados: `Cow in Antefasy.wav` e `Cow in Vezo.ogg` (CC0) — apesar do nome,
são gravações da **palavra** "vaca" em línguas malgaxes, não do mugido.

## Sons gerados pelo próprio projeto — sem restrição

| arquivos | como |
|---|---|
| `comandos/`, `feedback/`, `palavras/`, `silabas/`, `historias/`, `extras/` | Kokoro-82M, voz `pf_dora`, rodando local. Ver `vozes/`. |
| `ambiente/`, `instrumentos/`, `intensidade/`, `andamento/` | Sintetizados com ffmpeg por `ferramentas/gerar-audio.py`. |

O Kokoro-82M ([hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)) e os
pacotes de voz são **Apache 2.0**, o que permite redistribuir os MP3s gerados — inclusive
em material público municipal — desde que se mantenha o aviso de licença. O texto que
virou áudio é do próprio projeto.
