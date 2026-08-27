/* Shell do jogo: carrega o banco, monta as sessões e conduz o fluxo. */

import { criarFigura, descreverArquivo } from "./midia.js";
import * as som from "./audio.js";
import { montarAtividade } from "./atividades.js";
import * as prog from "./progresso.js";

const $ = (id) => document.getElementById(id);
const TELAS = ["tela-abertura", "tela-jogo", "tela-fim", "tela-professor"];

const estado = {
  banco: null,
  sessao: [],
  indice: 0,
  tentativas: 0,
  resultados: [],
  filtroEixo: null,   // só o atalho ?eixo= usa; o jogo normal mistura tudo
};

function mostrar(id) {
  TELAS.forEach((t) => $(t).classList.toggle("ativa", t === id));
}

/* ─── carga do banco ─────────────────────────────────────────────────── */

async function carregarBanco() {
  const cfg = prog.config();
  const arquivo = cfg.bancoCompleto ? "atividades.json" : "piloto.json";
  const resp = await fetch(`../dist/${arquivo}`, { cache: "no-store" });
  if (!resp.ok) throw new Error(`${arquivo}: HTTP ${resp.status}`);
  estado.banco = await resp.json();
}

/* ─── sessão ─────────────────────────────────────────────────────────── */

const baralhar = (lista) => {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* Evita duas atividades seguidas do mesmo eixo: uma sessão que cai três vezes
 * em Cores parece repetitiva mesmo estando sorteada. */
function espalharPorEixo(lista) {
  const restantes = lista.slice();
  const saida = [];
  while (restantes.length) {
    let i = restantes.findIndex((a) => a.eixo !== saida.at(-1)?.eixo);
    if (i === -1) i = 0;                       // só sobrou o mesmo eixo
    saida.push(restantes.splice(i, 1)[0]);
  }
  return saida;
}

/** Sorteia `quantas` atividades revezando entre os eixos, para uma sessão
 *  de 8 não cair quatro vezes no mesmo assunto. */
function sortearEspalhado(pool, quantas) {
  const porEixo = {};
  for (const a of pool) (porEixo[a.eixo] ||= []).push(a);
  const filas = baralhar(Object.values(porEixo).map(baralhar));
  const saida = [];
  let vivas = true;
  while (saida.length < quantas && vivas) {
    vivas = false;
    for (const fila of filas) {
      if (!fila.length) continue;
      saida.push(fila.shift());
      vivas = true;
      if (saida.length >= quantas) break;
    }
  }
  return saida;
}

/** Uma sessão só, misturando todos os eixos. */
function iniciarSessao(filtroEixo = null) {
  const cfg = prog.config();
  const universo = filtroEixo
    ? estado.banco.atividades.filter((a) => a.eixo === filtroEixo.id)
    : estado.banco.atividades;

  const tamanho = Math.max(1, Math.min(cfg.tamanhoSessao, universo.length));

  // Embaralhado, mas subindo de nível ao longo da sessão: a criança entra pelo
  // fácil. Dentro de cada faixa, reveza os eixos em vez de sortear no monte.
  const escolhidas = [];
  for (let nivel = 1; nivel <= 3; nivel++) {
    const cota = nivel === 3
      ? tamanho - escolhidas.length
      : Math.min(Math.ceil(tamanho / 3), tamanho - escolhidas.length);
    if (cota <= 0) break;
    escolhidas.push(...sortearEspalhado(universo.filter((a) => a.nivel === nivel), cota));
  }
  // algum nível pode não ter itens suficientes: completa com o que sobrou
  if (escolhidas.length < tamanho) {
    const jaTem = new Set(escolhidas.map((a) => a.id));
    escolhidas.push(...sortearEspalhado(
      universo.filter((a) => !jaTem.has(a.id)), tamanho - escolhidas.length));
  }

  estado.filtroEixo = filtroEixo;
  estado.sessao = espalharPorEixo(escolhidas.slice(0, tamanho));
  estado.indice = 0;
  estado.resultados = [];
  mostrar("tela-jogo");
  renderAtividade();
}

function pontosDeProgresso() {
  const alvo = $("progresso-pontos");
  alvo.replaceChildren();
  estado.sessao.forEach((_, i) => {
    const s = document.createElement("span");
    if (i < estado.indice) s.className = "feito";
    else if (i === estado.indice) s.className = "atual";
    alvo.appendChild(s);
  });
}

/* Destaca a palavra-chave do enunciado. O banco já escreve em CAIXA ALTA a
 * palavra que decide a resposta ("Toque no animal MAIOR"), então é só marcá-la —
 * sem isso não dá para saber se a atividade pede o maior ou o menor. */
function enunciadoComDestaque(texto) {
  const CAIXA = /\b([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{2,}(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]{2,})*)\b/g;
  const frag = document.createDocumentFragment();
  let fim = 0, m;
  while ((m = CAIXA.exec(texto))) {
    if (m.index > fim) frag.append(texto.slice(fim, m.index));
    const b = document.createElement("b");
    b.textContent = m[1];
    frag.append(b);
    fim = m.index + m[0].length;
  }
  frag.append(texto.slice(fim));
  return frag;
}

function montarEnunciado(ativ) {
  const eixo = estado.banco.eixos.find((e) => e.id === ativ.eixo);
  const chip = $("chip-eixo");
  chip.textContent = eixo ? eixo.nome : "";
  chip.style.background = eixo ? eixo.cor : "";
  const alvo = $("enunciado");
  // o ponto final fica solto depois do realce e não acrescenta nada na tela
  alvo.replaceChildren(enunciadoComDestaque(ativ.comando.replace(/\.$/, "")));
  // o destaque acompanha a cor do eixo
  alvo.style.setProperty("--destaque", eixo ? eixo.cor : "");
  alvo.style.setProperty("--destaque-fundo", eixo ? eixo.cor + "1f" : "");
}

function montarEstimulo(ativ) {
  const area = $("area-estimulo");
  area.replaceChildren();
  const est = ativ.estimulo;
  if (!est) return null;

  if (est.tipo === "imagem") {
    // sem rótulo próprio no banco: o nome do arquivo alimenta o placeholder
    area.appendChild(criarFigura(
      { imagem: est.asset, rotulo: descreverArquivo(est.asset) },
      { classe: "estimulo-figura" }));
    return null;
  }

  // áudio, sequência de áudio e narrativa: um botão que a criança pode reouvir
  const caminhos = est.assets || (est.asset ? [est.asset] : []);
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-som";
  botao.innerHTML = "<span>🔊</span><span>Ouvir</span>";

  const tocar = async () => {
    som.calar();
    area.querySelector(".aviso-placeholder")?.remove();

    // A narrativa TAMBÉM tem gravação (`historias/*.mp3`). Ir direto ao TTS
    // ignorava o arquivo gerado e deixava a história muda em máquina sem voz.
    if (est.tipo === "narrativa") {
      if (est.asset && await som.tocarArquivo(est.asset)) return;
      if (est.texto) await som.falar(est.texto);
      else marcarPlaceholder(est.asset || "história");
      return;
    }

    // Toca a sequência INTEIRA, não só o primeiro arquivo: CA-005 compara dois
    // sons ("qual foi mais forte"), CA-011 pede a ordem de três e CS-009/010
    // juntam duas sílabas. Com um arquivo só, essas atividades não têm resposta.
    // O primeiro play() sai síncrono dentro do clique, preservando o user gesture.
    for (let i = 0; i < caminhos.length; i++) {
      const tocou = await som.tocarArquivo(caminhos[i]);
      if (!tocou) {
        marcarPlaceholder(caminhos[i]);
        // Texto NEUTRO de propósito: dizer "aqui tocaria o som de vaca" entrega
        // a resposta justamente na atividade que pergunta qual animal é.
        await som.falar("Esse som ainda não foi gravado.");
        return;
      }
      if (i < caminhos.length - 1) await som.espera(500);
    }
  };

  /** O aviso na tela nomeia o arquivo — é para o adulto, não para a criança. */
  function marcarPlaceholder(caminho) {
    if (area.querySelector(".aviso-placeholder")) return;
    const av = document.createElement("span");
    av.className = "aviso-placeholder";
    av.textContent = `falta gravar: ${descreverArquivo(caminho)}`;
    area.appendChild(av);
  }

  botao.addEventListener("click", tocar);
  area.appendChild(botao);
  return tocar;
}

/* ─── uma atividade ──────────────────────────────────────────────────── */

let falarComando = () => {};

function renderAtividade() {
  const ativ = estado.sessao[estado.indice];
  estado.tentativas = 0;
  pontosDeProgresso();

  const area = $("area-interacao");
  const acao = $("area-acao");
  area.replaceChildren();
  acao.replaceChildren();

  montarEnunciado(ativ);
  const tocarEstimulo = montarEstimulo(ativ);

  falarComando = async () => {
    await som.falarComando(ativ.id, ativ.comando);
    // NÃO chamar tocarEstimulo aqui: o navegador bloqueia áudio sem user
    // interaction, e o estímulo só toca quando a criança clica no 🔊.
  };

  montarAtividade(ativ, {
    area,
    acao,
    aoErrar: () => {
      estado.tentativas++;
      retorno(false, ativ.feedback.erro);
    },
    aoConcluir: () => {
      estado.tentativas++;
      prog.registrar(ativ, estado.tentativas);
      estado.resultados.push({ ativ, tentativas: estado.tentativas });
      retorno(true, ativ.feedback.acerto, avancar);
    },
  });

  falarComando();
}

function retorno(acertou, texto, depois) {
  const camada = $("camada-feedback");
  camada.replaceChildren();

  const balao = document.createElement("div");
  balao.className = "balao-feedback" + (acertou ? "" : " tenta");
  const rosto = document.createElement("div");
  rosto.className = "rosto";
  rosto.textContent = acertou ? ["🎉", "⭐", "👏", "🌟"][Math.floor(Math.random() * 4)] : "🤔";
  const p = document.createElement("p");
  p.textContent = texto;
  balao.append(rosto, p);
  camada.appendChild(balao);
  camada.classList.add("visivel");

  acertou ? som.somAcerto() : som.somTentaDeNovo();

  // O balão fica no ar pelo MAIOR entre a fala e um mínimo confortável.
  // Sem esse mínimo, numa máquina sem voz pt-BR instalada a fala falha em 0 ms
  // e o retorno pisca e some antes de a criança registrar o que aconteceu.
  const MINIMO = acertou ? 1500 : 1800;
  Promise.all([som.falar(texto), som.espera(MINIMO)]).then(() => {
    camada.classList.remove("visivel");
    if (depois) depois();
  });
}

function avancar() {
  estado.indice++;
  if (estado.indice >= estado.sessao.length) return terminar();
  renderAtividade();
}

/* ─── fim da sessão ──────────────────────────────────────────────────── */

function terminar() {
  const total = estado.resultados.length;
  const dePrimeira = estado.resultados.filter((r) => r.tentativas === 1).length;
  const estrelas = total ? Math.max(1, Math.round((dePrimeira / total) * 3)) : 1;

  $("fim-emoji").textContent = ["🌟", "🎈", "🏅", "🎉"][Math.floor(Math.random() * 4)];
  $("fim-titulo").textContent = "Muito bem!";
  $("fim-estrelas").textContent = "⭐".repeat(estrelas) + "☆".repeat(3 - estrelas);
  const eixos = new Set(estado.resultados.map((r) => r.ativ.eixo));
  $("fim-resumo").textContent = total === 1
    ? "Você fez 1 atividade."
    : `Você fez ${total} atividades de ${eixos.size} ${eixos.size === 1 ? "assunto" : "assuntos"} diferentes.`;

  mostrar("tela-fim");
  som.somFim();
  som.falar("Muito bem! Você terminou.");
}

/* ─── painel do professor ────────────────────────────────────────────── */

function montarPainel() {
  const cfg = prog.config();
  $("opt-todos").checked = cfg.bancoCompleto;
  $("opt-tamanho").value = cfg.tamanhoSessao;
  $("opt-velocidade").value = som.velocidadeAtual();
  $("saida-velocidade").textContent = `${(+som.velocidadeAtual()).toFixed(2)}×`;

  const sel = $("opt-voz");
  sel.replaceChildren();
  const vozes = som.vozesDisponiveis();
  if (!vozes.length) {
    sel.appendChild(new Option("nenhuma voz pt-BR instalada", ""));
    sel.disabled = true;
  } else {
    vozes.forEach((v) => sel.appendChild(new Option(`${v.name} (${v.lang})`, v.name)));
    const salva = localStorage.getItem("jogo.voz");
    if (salva) sel.value = salva;
  }

  const alvo = $("painel-desempenho");
  alvo.replaceChildren();
  const dados = prog.porEixo();
  const eixos = estado.banco.eixos.filter((e) => dados[e.id]);
  if (!eixos.length) {
    alvo.innerHTML = '<p class="vazio">Ainda não há registro. Jogue uma sessão primeiro.</p>';
  } else {
    eixos.forEach((e) => {
      const d = dados[e.id];
      const linha = document.createElement("div");
      linha.className = "linha-desempenho";
      linha.innerHTML =
        `<div class="cabeca"><span>${e.nome}</span>` +
        `<span>${Math.round(d.taxa * 100)}% de primeira · ${d.vistas} ` +
        `${d.vistas === 1 ? "atividade" : "atividades"}</span></div>` +
        `<div class="barra"><i style="width:${Math.round(d.taxa * 100)}%;background:${e.cor}"></i></div>`;
      alvo.appendChild(linha);
    });
  }

  const at = $("painel-atencao");
  at.replaceChildren();
  const fracas = prog.precisamAtencao();
  if (!fracas.length) {
    at.innerHTML = '<p class="vazio">Nada apontado ainda.</p>';
  } else {
    const ul = document.createElement("ul");
    fracas.forEach((f) => {
      const nome = estado.banco.eixos.find((e) => e.id === f.eixo)?.nome || f.eixo;
      const li = document.createElement("li");
      li.textContent = `${nome} — ${f.sub.replace(/_/g, " ")} (${Math.round(f.taxa * 100)}% de primeira, ${f.vezes}×)`;
      ul.appendChild(li);
    });
    at.appendChild(ul);
  }
}

/* ─── ligações ───────────────────────────────────────────────────────── */

function ligarEventos() {
  $("btn-comecar").addEventListener("click", () => {
    som.liberarAudio();
    iniciarSessao();
  });

  const voltarAoInicio = () => { som.calar(); mostrar("tela-abertura"); };
  $("btn-sair").addEventListener("click", voltarAoInicio);
  $("btn-voltar-eixos").addEventListener("click", voltarAoInicio);

  $("btn-repetir").addEventListener("click", () => falarComando());
  $("btn-de-novo").addEventListener("click", () => iniciarSessao(estado.filtroEixo));

  $("btn-professor").addEventListener("click", () => { montarPainel(); mostrar("tela-professor"); });
  $("btn-fechar-professor").addEventListener("click", () => mostrar("tela-abertura"));

  $("opt-todos").addEventListener("change", async (e) => {
    prog.salvarConfig({ bancoCompleto: e.target.checked });
    await carregarBanco();
    montarPainel();
  });
  $("opt-tamanho").addEventListener("change", (e) => {
    // `|| 6` fazia 0 (que é falsy) virar 6, contrariando o min="2" do campo
    const bruto = Number.parseInt(e.target.value, 10);
    const valor = Number.isFinite(bruto) ? Math.max(2, Math.min(12, bruto)) : 6;
    e.target.value = valor;               // o campo passa a mostrar o valor real usado
    prog.salvarConfig({ tamanhoSessao: valor });
  });
  $("opt-voz").addEventListener("change", (e) => {
    som.definirVoz(e.target.value);
    som.falar("Assim vai ficar a minha voz.");
  });
  $("opt-velocidade").addEventListener("input", (e) => {
    $("saida-velocidade").textContent = `${(+e.target.value).toFixed(2)}×`;
  });
  $("opt-velocidade").addEventListener("change", (e) => {
    som.definirVelocidade(+e.target.value);
    som.falar("Assim vai ficar a minha voz.");
  });
  // Única ação irreversível da interface: exige dois toques, e desarma sozinha.
  let confirmarLimpeza = null;
  $("btn-limpar").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (!confirmarLimpeza) {
      b.textContent = "Toque de novo para apagar mesmo";
      b.classList.add("armado");
      confirmarLimpeza = setTimeout(() => {
        b.textContent = "Apagar todo o histórico";
        b.classList.remove("armado");
        confirmarLimpeza = null;
      }, 4000);
      return;
    }
    clearTimeout(confirmarLimpeza);
    confirmarLimpeza = null;
    b.textContent = "Apagar todo o histórico";
    b.classList.remove("armado");
    prog.limpar();
    montarPainel();
  });
}

/* ─── partida ────────────────────────────────────────────────────────── */

/** ?id=NE-001 abre direto uma atividade; ?eixo=cores abre direto um eixo.
 *  Serve para depurar um tipo de interação sem jogar até chegar nele, e para
 *  mostrar um item específico numa reunião de revisão. */
function atalhoDaURL() {
  const q = new URLSearchParams(location.search);
  const id = q.get("id");
  if (id) {
    const ativ = estado.banco.atividades.find((a) => a.id === id.toUpperCase());
    if (!ativ) return false;
    estado.filtroEixo = null;
    estado.sessao = [ativ];
    estado.indice = 0;
    estado.resultados = [];
    mostrar("tela-jogo");
    renderAtividade();
    return true;
  }
  const eixoId = q.get("eixo");
  if (eixoId) {
    const eixo = estado.banco.eixos.find((e) => e.id === eixoId);
    if (eixo) { iniciarSessao(eixo); return true; }
  }
  return false;
}

(async function iniciar() {
  try {
    await carregarBanco();
  } catch (err) {
    document.body.innerHTML =
      `<div style="padding:40px;font-family:system-ui;line-height:1.6">
         <h1>Não consegui carregar o banco</h1>
         <p><code>${err.message}</code></p>
         <p>Este jogo precisa ser servido por HTTP — abrir o arquivo direto
            com <code>file://</code> faz o navegador bloquear o <code>fetch</code>.</p>
         <p>Na raiz do projeto, rode:</p>
         <pre>python3 -m http.server 8000</pre>
         <p>e abra <a href="http://localhost:8000/jogo/">http://localhost:8000/jogo/</a></p>
       </div>`;
    return;
  }
  ligarEventos();
  if (!atalhoDaURL()) return;
  som.liberarAudio();
})();
