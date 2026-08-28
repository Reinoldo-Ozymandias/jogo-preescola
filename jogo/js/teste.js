/* Autoteste: monta cada atividade do banco, resolve do jeito certo e do jeito
 * errado, e confere se os callbacks disparam como deveriam.
 *
 * Não é teste de interface — é teste da LÓGICA dos seis renderizadores, que é
 * onde os erros de verdade moram. Roda em ~2 segundos sobre as 120 atividades.
 *
 * Abrir em http://localhost:8000/jogo/teste.html
 */

(function () {
  "use strict";
  const { montarAtividade } = Atividades;


  const area = document.getElementById("t-area");
  const acao = document.getElementById("t-acao");
  const saida = document.getElementById("saida");
  const placar = document.getElementById("placar");

  const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
  /* Rótulos se repetem de propósito no banco: LP-012 monta "A N A" e PV-007 pareia
   * figuras idênticas. Por isso a busca ignora cartas já usadas e aceita filtrar
   * por coluna — senão o teste clica duas vezes no mesmo elemento e se engana. */
  const achar = (sel, rot, extra = "") =>
    [...area.querySelectorAll(sel + extra)]
      .find((e) => e.querySelector(".rotulo")?.textContent === rot
                   && !e.classList.contains("apagada")
                   && !e.classList.contains("ligado"));

  /* arrastar precisa de coordenadas reais: sintetizamos os PointerEvents */
  async function arrastar(el, destino) {
    const a = el.getBoundingClientRect();
    const b = destino.getBoundingClientRect();
    const opc = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, bubbles: true, isPrimary: true });
    el.setPointerCapture = () => {};
    el.dispatchEvent(new PointerEvent("pointerdown", opc(a.left + a.width / 2, a.top + a.height / 2)));
    await dorme(5);
    el.dispatchEvent(new PointerEvent("pointermove", opc(b.left + b.width / 2, b.top + b.height / 2)));
    await dorme(5);
    el.dispatchEvent(new PointerEvent("pointerup", opc(b.left + b.width / 2, b.top + b.height / 2)));
    await dorme(5);
  }

  /** Resolve a atividade corretamente. */
  async function resolverCerto(a) {
    switch (a.tipo) {
      case "escolha_imagem":
        achar(".opcao", a.interacao.opcoes.find((o) => o.correta).rotulo).click();
        return;
      case "selecao_multipla":
        for (const o of a.interacao.opcoes.filter((o) => o.correta)) achar(".opcao", o.rotulo).click();
        acao.querySelector(".botao-grande").click();
        return;
      case "ordenar_sequencia":
        for (const it of [...a.interacao.itens].sort((x, y) => x.ordem - y.ordem))
          achar(".opcao", it.rotulo).click();
        return;
      case "parear":
        for (const p of a.interacao.pares) {
          achar(".item-par", p.a.rotulo, '[data-coluna="a"]').click();
          achar(".item-par", p.b.rotulo, '[data-coluna="b"]').click();
        }
        return;
      case "contar_toques": {
        const alvo = area.querySelector(".alvo-toque");
        for (let i = 0; i < a.interacao.quantidade; i++) alvo.click();
        acao.querySelector(".botao-grande").click();
        return;
      }
      case "arrastar_para_alvo": {
        // cota por rótulo, igual ao jogo: "três flores" tem cinco flores na bandeja
        // e arrastar as cinco seria erro de quem testa, não do jogo
        const cota = {};
        for (const x of a.interacao.arrastaveis) {
          if (!x.alvo) continue;
          (cota[x.rotulo] ||= {});
          cota[x.rotulo][x.alvo] = (cota[x.rotulo][x.alvo] || 0) + 1;
        }
        for (const el of [...area.querySelectorAll(".arrastavel")]) {
          const alvos = cota[el.dataset.rotulo];
          if (!alvos) continue;
          const id = Object.keys(alvos).find((k) => alvos[k] > 0);
          if (!id) continue;
          alvos[id]--;
          await arrastar(el, area.querySelector(`.alvo[data-id="${id}"]`));
        }
        return;
      }
    }
  }

  /** Faz uma jogada ERRADA, para confirmar que o erro é detectado. */
  async function resolverErrado(a) {
    switch (a.tipo) {
      case "escolha_imagem": {
        const ruim = a.interacao.opcoes.find((o) => !o.correta);
        if (!ruim) return false;
        achar(".opcao", ruim.rotulo).click();
        return true;
      }
      case "selecao_multipla": {
        const ruim = a.interacao.opcoes.find((o) => !o.correta);
        if (!ruim) return false;
        achar(".opcao", ruim.rotulo).click();
        acao.querySelector(".botao-grande").click();
        return true;
      }
      case "ordenar_sequencia": {
        // precisa ser um item de conteúdo DIFERENTE do primeiro: em "A N A" a
        // outra carta "A" é uma resposta legítima, não um erro
        const primeiro = a.interacao.itens.find((i) => i.ordem === 1);
        const diferente = a.interacao.itens.find((i) => i.rotulo !== primeiro.rotulo);
        if (!diferente) return false;
        achar(".opcao", diferente.rotulo).click();
        return true;
      }
      case "parear": {
        if (a.interacao.pares.length < 2) return false;
        achar(".item-par", a.interacao.pares[0].a.rotulo, '[data-coluna="a"]').click();
        achar(".item-par", a.interacao.pares[1].b.rotulo, '[data-coluna="b"]').click();
        return true;
      }
      case "contar_toques": {
        const alvo = area.querySelector(".alvo-toque");
        const n = a.interacao.quantidade > 1 ? a.interacao.quantidade - 1 : 2;
        for (let i = 0; i < n; i++) alvo.click();
        acao.querySelector(".botao-grande").click();
        return true;
      }
      case "arrastar_para_alvo": {
        if (a.interacao.alvos.length < 2) return false;
        const el = [...area.querySelectorAll(".arrastavel")][0];
        const rot = el.dataset.rotulo;
        const dado = a.interacao.arrastaveis.find((x) => x.rotulo === rot);
        const errado = a.interacao.alvos.find((t) => t.id !== dado?.alvo);
        await arrastar(el, area.querySelector(`.alvo[data-id="${errado.id}"]`));
        return true;
      }
    }
    return false;
  }

  function linha(id, tipo, ok, msg) {
    const tr = document.createElement("tr");
    tr.className = ok ? "ok" : "mau";
    tr.innerHTML = `<td>${id}</td><td>${tipo}</td><td>${ok ? "ok" : msg}</td>`;
    saida.appendChild(tr);
  }

  (async function rodar() {
    const banco = window.BANCO_COMPLETO;
    let bons = 0, maus = 0;

    for (const ativ of banco.atividades) {
      // ── caminho correto ──
      area.replaceChildren(); acao.replaceChildren();
      let concluiu = 0, errou = 0;
      montarAtividade(ativ, { area, acao, aoErrar: () => errou++, aoConcluir: () => concluiu++ });
      await resolverCerto(ativ);
      await dorme(0);

      const problemas = [];
      if (concluiu !== 1) problemas.push(`resolvida certo mas aoConcluir disparou ${concluiu}×`);
      if (errou !== 0) problemas.push(`resolvida certo mas acusou ${errou} erro(s)`);

      // ── caminho errado ──
      area.replaceChildren(); acao.replaceChildren();
      let concluiu2 = 0, errou2 = 0;
      montarAtividade(ativ, { area, acao, aoErrar: () => errou2++, aoConcluir: () => concluiu2++ });
      const testouErro = await resolverErrado(ativ);
      await dorme(0);
      if (testouErro) {
        if (errou2 === 0) problemas.push("jogada errada não foi detectada");
        if (concluiu2 > 0) problemas.push("jogada errada concluiu a atividade");
      }

      if (problemas.length) { maus++; linha(ativ.id, ativ.tipo, false, problemas.join(" · ")); }
      else { bons++; linha(ativ.id, ativ.tipo, true); }
    }

    area.replaceChildren(); acao.replaceChildren();
    placar.innerHTML = maus === 0
      ? `<b class="ok">${bons}/${bons} atividades passaram.</b>`
      : `<b class="ok">${bons} ok</b> · <b class="mau">${maus} com problema</b>`;
  })();
})();
