/* Os seis tipos de interação do banco.
 *
 * Contrato comum: cada função monta a atividade dentro de `area` (e, se precisar,
 * um botão em `acao`) e avisa o app por dois callbacks:
 *   aoErrar()   — a cada tentativa incorreta; o app mostra feedback.erro e deixa tentar
 *   aoConcluir() — uma única vez, quando a atividade foi resolvida
 * Nenhum renderizador encerra a atividade sozinho: quem controla o fluxo é o app.
 */

import { criarFigura } from "./midia.js";
import { somToque, somTentaDeNovo } from "./audio.js";

const embaralhado = (lista) => {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function criarCartao(midia, extra = "") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "opcao " + extra + (midia.texto !== undefined ? " texto" : "");
  b.appendChild(criarFigura(midia));
  const r = document.createElement("span");
  r.className = "rotulo";
  r.textContent = midia.rotulo;
  b.appendChild(r);
  return b;
}

function botaoPronto(acao, aoClicar) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "botao-grande";
  b.textContent = "Pronto!";
  b.disabled = true;
  b.addEventListener("click", () => aoClicar(b));
  acao.appendChild(b);
  return b;
}

/* Duas mídias que a criança não tem como diferenciar contam como a mesma coisa. */
const mesmaCoisa = (a, b) => a.rotulo === b.rotulo;

const sacudir = (el) => {
  el.classList.add("errada");
  setTimeout(() => el.classList.remove("errada"), 420);
};

/* ─── 1. escolha_imagem ─────────────────────────────────────────────── */

function escolhaImagem(ativ, area, acao, aoErrar, aoConcluir) {
  const opcoes = ativ.interacao.embaralhar === false
    ? ativ.interacao.opcoes
    : embaralhado(ativ.interacao.opcoes);

  const grade = document.createElement("div");
  grade.className = `grade-opcoes n${opcoes.length}`;

  opcoes.forEach((op) => {
    const cartao = criarCartao(op);
    cartao.addEventListener("click", () => {
      if (grade.dataset.travado) return;
      if (op.correta) {
        grade.dataset.travado = "1";
        cartao.classList.add("certa");
        aoConcluir();
      } else {
        somTentaDeNovo();
        sacudir(cartao);
        aoErrar();
      }
    });
    grade.appendChild(cartao);
  });

  area.appendChild(grade);
}

/* ─── 2. selecao_multipla ───────────────────────────────────────────── */

function selecaoMultipla(ativ, area, acao, aoErrar, aoConcluir) {
  const opcoes = ativ.interacao.embaralhar === false
    ? ativ.interacao.opcoes
    : embaralhado(ativ.interacao.opcoes);

  const grade = document.createElement("div");
  grade.className = `grade-opcoes n${Math.min(4, opcoes.length)}`;
  const escolhidas = new Set();

  const pronto = botaoPronto(acao, (btn) => {
    const certo = opcoes.every((op, i) => !!op.correta === escolhidas.has(i));
    if (certo) {
      btn.disabled = true;
      grade.querySelectorAll(".opcao.escolhida").forEach((e) => {
        e.classList.remove("escolhida");
        e.classList.add("certa");
      });
      aoConcluir();
    } else {
      somTentaDeNovo();
      grade.querySelectorAll(".opcao").forEach(sacudir);
      aoErrar();
    }
  });

  opcoes.forEach((op, i) => {
    const cartao = criarCartao(op);
    cartao.addEventListener("click", () => {
      if (pronto.disabled && escolhidas.size && grade.querySelector(".certa")) return;
      somToque();
      if (escolhidas.has(i)) { escolhidas.delete(i); cartao.classList.remove("escolhida"); }
      else { escolhidas.add(i); cartao.classList.add("escolhida"); }
      pronto.disabled = escolhidas.size === 0;
    });
    grade.appendChild(cartao);
  });

  area.appendChild(grade);
}

/* ─── 3. arrastar_para_alvo ─────────────────────────────────────────── */

function arrastarParaAlvo(ativ, area, acao, aoErrar, aoConcluir) {
  const { alvos, arrastaveis } = ativ.interacao;

  /* Cota por (rótulo → alvo). "Coloque TRÊS flores no vaso" (CQ-007) traz cinco
   * flores de mesmo rótulo, três marcadas com alvo. O que a atividade pede é a
   * QUANTIDADE, não quais flores — então qualquer três valem, e a quarta é que
   * vira erro. Amarrar ao item específico puniria uma resposta correta. */
  const cota = {};
  let faltam = 0;
  for (const a of arrastaveis) {
    if (!a.alvo) continue;
    (cota[a.rotulo] ||= {});
    cota[a.rotulo][a.alvo] = (cota[a.rotulo][a.alvo] || 0) + 1;
    faltam++;
  }

  const faixaAlvos = document.createElement("div");
  faixaAlvos.className = "faixa-alvos";
  const caixaPorId = {};
  alvos.forEach((alvo) => {
    const el = document.createElement("div");
    el.className = "alvo";
    el.dataset.id = alvo.id;
    el.appendChild(criarFigura(alvo));
    const r = document.createElement("span");
    r.className = "rotulo";
    r.textContent = alvo.rotulo;
    el.appendChild(r);
    const recebidos = document.createElement("div");
    recebidos.className = "recebidos";
    el.appendChild(recebidos);
    caixaPorId[alvo.id] = { el, recebidos };
    faixaAlvos.appendChild(el);
  });

  const faixaItens = document.createElement("div");
  faixaItens.className = "faixa-arrastaveis";

  embaralhado(arrastaveis.map((a, i) => ({ a, i }))).forEach(({ a, i }) => {
    const el = document.createElement("div");
    el.className = "arrastavel";
    el.dataset.rotulo = a.rotulo;   // identifica o item sem depender do alt da imagem
    el.appendChild(criarFigura(a));
    faixaItens.appendChild(el);

    let origem = null, deslocX = 0, deslocY = 0, sobre = null;

    el.addEventListener("pointerdown", (ev) => {
      if (el.classList.contains("colocado")) return;
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      const r = el.getBoundingClientRect();
      origem = { largura: r.width, altura: r.height };
      deslocX = ev.clientX - r.left;
      deslocY = ev.clientY - r.top;
      el.classList.add("movendo");
      Object.assign(el.style, { width: r.width + "px", left: r.left + "px", top: r.top + "px" });
      somToque();
    });

    el.addEventListener("pointermove", (ev) => {
      if (!origem) return;
      el.style.left = ev.clientX - deslocX + "px";
      el.style.top = ev.clientY - deslocY + "px";
      const sob = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".alvo");
      if (sob !== sobre) {
        sobre?.classList.remove("sobre");
        sobre = sob;
        sobre?.classList.add("sobre");
      }
    });

    const soltar = (ev) => {
      if (!origem) return;
      origem = null;
      el.classList.remove("movendo");
      el.style.cssText = "";
      const destino = sobre;
      sobre?.classList.remove("sobre");
      sobre = null;
      if (!destino) return;

      const id = destino.dataset.id;
      if (cota[a.rotulo]?.[id] > 0) {
        cota[a.rotulo][id]--;
        el.classList.add("colocado");
        caixaPorId[id].recebidos.appendChild(criarFigura(a));
        faltam--;
        somToque();
        if (faltam === 0) aoConcluir();
      } else {
        somTentaDeNovo();
        sacudir(destino);
        aoErrar();
      }
    };
    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
  });

  area.append(faixaAlvos, faixaItens);
}

/* ─── 4. ordenar_sequencia ──────────────────────────────────────────── */

function ordenarSequencia(ativ, area, acao, aoErrar, aoConcluir) {
  const itens = ativ.interacao.itens;
  const total = itens.length;
  let proxima = 1;

  const trilha = document.createElement("div");
  trilha.className = "trilha-slots";
  const slots = [];
  for (let i = 0; i < total; i++) {
    const s = document.createElement("div");
    s.className = "slot";
    s.textContent = i + 1;
    trilha.appendChild(s);
    slots.push(s);
  }

  const bandeja = document.createElement("div");
  bandeja.className = "faixa-arrastaveis";

  embaralhado(itens).forEach((item) => {
    const cartao = criarCartao(item, "");
    cartao.style.width = "clamp(96px,14vw,132px)";
    cartao.style.minHeight = "0";
    cartao.addEventListener("click", () => {
      if (cartao.classList.contains("apagada")) return;
      // Itens de conteúdo idêntico são intercambiáveis. LP-012 monta "A N A": as
      // duas cartas "A" são indistinguíveis para a criança, então exigir a carta
      // certa seria acusar um erro que ela não tem como enxergar.
      const esperado = itens.find((i) => i.ordem === proxima);
      if (esperado && mesmaCoisa(item, esperado)) {
        const s = slots[proxima - 1];
        s.classList.add("cheio");
        s.textContent = "";
        s.appendChild(criarFigura(item));
        cartao.classList.add("apagada");
        somToque();
        proxima++;
        if (proxima > total) aoConcluir();
      } else {
        somTentaDeNovo();
        sacudir(cartao);
        aoErrar();
      }
    });
    bandeja.appendChild(cartao);
  });

  area.append(trilha, bandeja);
}

/* ─── 5. parear ─────────────────────────────────────────────────────── */

function parear(ativ, area, acao, aoErrar, aoConcluir) {
  const pares = ativ.interacao.pares;
  let ligados = 0;
  let selecionado = null;

  const tabuleiro = document.createElement("div");
  tabuleiro.className = "tabuleiro-pares";
  const colA = document.createElement("div");
  const colB = document.createElement("div");
  colA.className = colB.className = "coluna-pares";

  const criarItem = (midia, indice, coluna) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "item-par";
    b.dataset.indice = indice;
    b.dataset.coluna = coluna;
    b.appendChild(criarFigura(midia));
    const r = document.createElement("span");
    r.className = "rotulo";
    r.textContent = midia.rotulo;
    b.appendChild(r);

    b.addEventListener("click", () => {
      if (b.classList.contains("ligado")) return;
      somToque();
      if (!selecionado) {
        selecionado = b;
        b.classList.add("selecionado");
        return;
      }
      if (selecionado === b) {
        b.classList.remove("selecionado");
        selecionado = null;
        return;
      }
      if (selecionado.dataset.coluna === coluna) {
        selecionado.classList.remove("selecionado");
        selecionado = b;
        b.classList.add("selecionado");
        return;
      }
      if (selecionado.dataset.indice === b.dataset.indice) {
        selecionado.classList.remove("selecionado");
        selecionado.classList.add("ligado");
        b.classList.add("ligado");
        selecionado = null;
        ligados++;
        if (ligados === pares.length) aoConcluir();
      } else {
        somTentaDeNovo();
        sacudir(b);
        sacudir(selecionado);
        selecionado.classList.remove("selecionado");
        selecionado = null;
        aoErrar();
      }
    });
    return b;
  };

  embaralhado(pares.map((p, i) => ({ p, i })))
    .forEach(({ p, i }) => colA.appendChild(criarItem(p.a, i, "a")));
  embaralhado(pares.map((p, i) => ({ p, i })))
    .forEach(({ p, i }) => colB.appendChild(criarItem(p.b, i, "b")));

  tabuleiro.append(colA, colB);
  area.appendChild(tabuleiro);
}

/* ─── 6. contar_toques ──────────────────────────────────────────────── */

function contarToques(ativ, area, acao, aoErrar, aoConcluir) {
  const { alvo, quantidade } = ativ.interacao;
  let toques = 0;

  const contador = document.createElement("div");
  contador.className = "contador-toques";

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "alvo-toque";
  botao.appendChild(criarFigura(alvo));

  const pronto = botaoPronto(acao, (btn) => {
    if (toques === quantidade) {
      btn.disabled = true;
      botao.disabled = true;
      aoConcluir();
    } else {
      somTentaDeNovo();
      sacudir(botao);
      toques = 0;
      contador.replaceChildren();
      btn.disabled = true;
      aoErrar();
    }
  });

  botao.addEventListener("click", () => {
    if (toques >= 10) return;
    toques++;
    somToque();
    contador.appendChild(document.createElement("i"));
    pronto.disabled = toques === 0;
  });

  area.append(botao, contador);
}

/* ─── despacho ──────────────────────────────────────────────────────── */

const RENDERIZADORES = {
  escolha_imagem: escolhaImagem,
  selecao_multipla: selecaoMultipla,
  arrastar_para_alvo: arrastarParaAlvo,
  ordenar_sequencia: ordenarSequencia,
  parear,
  contar_toques: contarToques,
};

export function montarAtividade(ativ, { area, acao, aoErrar, aoConcluir }) {
  const fn = RENDERIZADORES[ativ.tipo];
  if (!fn) {
    area.textContent = `Tipo de interação não implementado: ${ativ.tipo}`;
    return;
  }
  fn(ativ, area, acao, aoErrar, aoConcluir);
}
