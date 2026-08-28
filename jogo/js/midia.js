/* Placeholders inteligentes.
 *
 * Nenhuma ilustração existe ainda. Em vez de mostrar caixas cinzas iguais — o que
 * tornaria metade do banco impossível de jogar — este módulo LÊ o campo `rotulo` e
 * deduz o que desenhar: emoji, cor, tamanho relativo, quantidade e relação espacial.
 *
 * É assim que "três patinhos", "tronco grosso" e "gato em cima da mesa" viram figuras
 * distinguíveis sem um único arquivo de arte.
 *
 * Quando a arte real chegar, nada disso precisa mudar: `<img>` é sempre tentado
 * primeiro e o placeholder só aparece se o arquivo faltar.
 */

const semAcento = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ─── emoji por palavra-chave ────────────────────────────────────────────
   Chaves mais específicas primeiro: a busca pega a mais longa que casar. */
const EMOJI = {
  // animais
  "filhote de cachorro": "🐕", "tartaruga do mar": "🐢", "urso de pelucia": "🧸",
  elefante: "🐘", formiga: "🐜", gato: "🐱", cachorro: "🐶", cadela: "🐕",
  vaca: "🐄", bezerro: "🐮", cavalo: "🐴", ovelha: "🐑", porco: "🐷",
  galinha: "🐔", galo: "🐓", pintinho: "🐤", patinho: "🦆", pato: "🦆",
  peixe: "🐟", tubarao: "🦈", golfinho: "🐬", tartaruga: "🐢", cobra: "🐍",
  sapo: "🐸", foca: "🦭", borboleta: "🦋", passarinho: "🐦", papagaio: "🦜",
  tucano: "🦜", pinguim: "🐧", camelo: "🐫", leao: "🦁", girafa: "🦒",
  coelho: "🐰", urso: "🐻", macaco: "🐵", boi: "🐂",
  // alimentos
  maca: "🍎", banana: "🍌", uva: "🍇", morango: "🍓", laranja: "🍊",
  limao: "🍋", cenoura: "🥕", bolo: "🍰", bala: "🍬", osso: "🦴",
  pizza: "🍕", biscoito: "🍪", suco: "🧃",
  // natureza
  sol: "☀️", ceu: "🌤️", chuva: "🌧️", chovendo: "🌧️", ensolarado: "☀️",
  fogo: "🔥", vento: "🌬️", neve: "❄️", frio: "❄️", grama: "🌱",
  folha: "🍃", flor: "🌸", arvore: "🌳", arbusto: "🌳", pedra: "🪨",
  pena: "🪶", estrela: "⭐", lua: "🌙", semente: "🌱", regando: "💧",
  // objetos
  "guarda-chuva": "☂️", quebra: "🧩", peca: "🧩",
  bola: "⚽", caixa: "📦", cesta: "🧺", cesto: "🧺", copo: "🥤",
  panela: "🍲", vaso: "🏺", mesa: "🍽️", cadeira: "🪑", livro: "📚",
  lapis: "✏️", telefone: "☎️", relogio: "🕐", sino: "🔔", vela: "🕯️",
  boneca: "🪆", carrinho: "🚗", cubo: "🧊", bau: "🧰", armario: "🗄️",
  luz: "💡", chapeu: "🎩", bone: "🧢", sapato: "👟", camiseta: "👕",
  calca: "👖", balao: "🎈", coracao: "❤️", tambor: "🥁", flauta: "🪈",
  // "cor" saía como moldura vazia em CF-010 ("qual NÃO rima com FLOR"): a
  // criança via sol, nada e tambor. A busca casa palavra inteira, então isto
  // não pega "coracao" nem "cortina".
  cor: "🎨",
  violao: "🎸", chocalho: "🪇", telhado: "🏠", casa: "🏠", portao: "🚪",
  varal: "🧺", moto: "🏍️", ambulancia: "🚑", barco: "⛵", caminhao: "🚚",
  prato: "🍽️", pote: "🫙", tronco: "🪵", caminho: "🛣️", som: "🔊",
  // corpo e pessoas
  mao: "✋", pe: "🦶", menina: "👧", menino: "👦", crianca: "🧒",
  // formas
  circulo: "⭕", quadrado: "🟥", triangulo: "🔺", seta: "➡️", sombra: "⬛",
  // lugares
  rio: "🏞️", floresta: "🌲", deserto: "🏜️", fazenda: "🚜", agua: "💧",
  terra: "🌍", mar: "🌊", ar: "☁️", aquario: "🐠",
  // ritmo
  devagar: "🐢", rapido: "🐇",
};

const CORES = {
  vermelho: "#e74c3c", vermelha: "#e74c3c",
  azul: "#3498db", amarelo: "#f1c40f", amarela: "#f1c40f",
  verde: "#27ae60", laranja: "#e67e22", roxo: "#8e44ad", roxa: "#8e44ad",
  rosa: "#e84393", marrom: "#8b5a2b", preto: "#2c3e50", branco: "#ecf0f1",
  cinza: "#95a5a6",
};

const QUANTIDADES = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
};

/* Multiplicadores de escala. É o que faz o eixo de Grandezas funcionar.
   "bem claro"/"bem escuro" ficam em 1 de propósito: são rótulos de cor, não de
   tamanho, e sem eles cairiam no TAMANHO_REAL lá embaixo. */
const TAMANHOS = {
  "muito grande": 1.55, "bem claro": 1, "bem escuro": 1,
  grande: 1.28, alta: 1.28, alto: 1.28, comprido: 1.28,
  grosso: 1.28, largo: 1.28, cheio: 1.25,
  medio: 1.0, "pela metade": 0.85,
  pequeno: 0.6, pequena: 0.6, baixa: 0.6, baixo: 0.6,
  curto: 0.6, fino: 0.6, estreito: 0.6, vazio: 0.55,
};


/* Tamanho relativo no mundo real.
 *
 * Sem isto, "Toque no animal MAIOR" mostra elefante e formiga do mesmo tamanho e a
 * atividade fica impossível de responder olhando — a criança teria que ler o rótulo,
 * que é justamente o que ela não sabe fazer. Só entra quando o rótulo NÃO traz uma
 * palavra de tamanho explícita ("bola grande" manda mais que "bola"). */
const TAMANHO_REAL = {
  // bichos
  formiga: .3, borboleta: .42, passarinho: .48, pintinho: .38, sapo: .48,
  peixe: .58, coelho: .55, gato: .68, tartaruga: .52, cobra: .66,
  papagaio: .48, tucano: .5, pinguim: .6, pato: .55, patinho: .42,
  galo: .6, galinha: .6, foca: .9, cachorro: .78, cadela: .8, macaco: .7,
  ovelha: .82, porco: .88, bezerro: .78, vaca: 1.12, cavalo: 1.15, boi: 1.15,
  leao: 1.05, urso: 1.1, camelo: 1.25, golfinho: 1.2, tubarao: 1.3,
  elefante: 1.55, girafa: 1.6,
  // coisas
  semente: .3, pena: .4, folha: .45, flor: .5, grama: .5, pedra: .5,
  bala: .35, biscoito: .4, uva: .45, morango: .45, cenoura: .5, banana: .55,
  maca: .5, limao: .45, laranja: .5, osso: .5, bolo: .6, pizza: .6,
  lapis: .45, sino: .45, vela: .5, bone: .5, chapeu: .55, sapato: .55,
  mao: .5, pe: .5, copo: .5, bola: .6, livro: .55, telefone: .5,
  relogio: .6, panela: .6, vaso: .6, cesta: .65, cesto: .65, pote: .55,
  boneca: .6, cubo: .5, tambor: .7, flauta: .6, violao: .8, chocalho: .45,
  carrinho: .6, camiseta: .6, calca: .6, balao: .7, coracao: .6,
  crianca: .85, menina: .85, menino: .85,
  cadeira: .85, mesa: 1.0, armario: 1.2, bau: .8, tronco: 1.1,
  moto: 1.0, barco: 1.25, caminhao: 1.35, ambulancia: 1.3,
  casa: 1.4, telhado: 1.3, arvore: 1.45, portao: 1.2, sol: 1.3,
};

/* relações espaciais: "gato em cima da mesa" → dois emoji compostos */
const RELACOES = [
  ["em cima d", "cima"], ["embaixo d", "baixo"], ["dentro d", "dentro"],
  ["fora d", "fora"], ["atras d", "atras"], ["na frente d", "frente"],
  ["ao lado d", "lado"],
];

/* Uma busca só para todos os dicionários deste arquivo.
 *
 * Duas regras que já custaram bug:
 *  - fronteira de palavra: com `includes` cru, a chave "ar" casava dentro de
 *    "claro" e "azul bem claro" virava uma nuvem;
 *  - plural opcional: "flor" precisa casar "flores", "pato" casar "patos".
 * Vence sempre a chave mais longa, então "muito grande" ganha de "grande". */
const cacheRegex = new Map();

function buscar(txt, dicionario, padrao = null) {
  let achado = padrao, tamanho = 0;
  for (const chave in dicionario) {
    if (chave.length <= tamanho) continue;
    let r = cacheRegex.get(chave);
    if (!r) {
      const escapada = chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      r = new RegExp(`(^|[^a-z0-9])${escapada}(s|es)?([^a-z0-9]|$)`);
      cacheRegex.set(chave, r);
    }
    if (r.test(txt)) {
      achado = dicionario[chave];
      tamanho = chave.length;
    }
  }
  return achado;
}

const acharEmoji = (txt) => buscar(txt, EMOJI);
const acharCor = (txt) => buscar(txt, CORES);

function acharQuantidade(txt) {
  const digito = txt.match(/\b(\d+)\b/);
  if (digito) return Math.min(10, +digito[1]);
  return buscar(txt, QUANTIDADES, 1);
}

/* Palavra explícita de tamanho manda; sem ela, vale o tamanho real do objeto —
   senão "Toque no animal MAIOR" mostra elefante e formiga do mesmo tamanho. */
const acharEscala = (txt) => buscar(txt, TAMANHOS) ?? buscar(txt, TAMANHO_REAL, 1);

function acharRelacao(txt) {
  for (const [marca, tipo] of RELACOES) {
    const i = txt.indexOf(marca);
    if (i === -1) continue;
    const objeto = txt.slice(0, i).trim();
    const refer = txt.slice(i + marca.length).replace(/^[ao]s?\s+/, "").trim();
    const a = acharEmoji(objeto), b = acharEmoji(refer);
    if (a && b) return { tipo, a, b };
  }
  return null;
}

/* posição relativa dos dois emoji, em % da caixa */
const POSES = {
  cima:   { a: { left: "50%", top: "8%",  z: 2, esc: .8 }, b: { left: "50%", top: "62%", z: 1, esc: 1 } },
  baixo:  { a: { left: "50%", top: "70%", z: 2, esc: .8 }, b: { left: "50%", top: "24%", z: 1, esc: 1 } },
  dentro: { a: { left: "50%", top: "52%", z: 2, esc: .5 }, b: { left: "50%", top: "50%", z: 1, esc: 1.2 } },
  fora:   { a: { left: "78%", top: "58%", z: 2, esc: .7 }, b: { left: "30%", top: "50%", z: 1, esc: 1.1 } },
  atras:  { a: { left: "62%", top: "30%", z: 1, esc: .75 }, b: { left: "42%", top: "55%", z: 2, esc: 1.1 } },
  frente: { a: { left: "58%", top: "62%", z: 3, esc: .9 }, b: { left: "42%", top: "40%", z: 1, esc: 1.1 } },
  lado:   { a: { left: "72%", top: "50%", z: 2, esc: .9 }, b: { left: "28%", top: "50%", z: 1, esc: .9 } },
};

/* clareia ou escurece um hex misturando com branco/preto */
function tom(hex, fator) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (deslocamento) => {
    const v = (n >> deslocamento) & 255;
    const alvo = fator > 0 ? 255 : 0;
    return Math.round(v + (alvo - v) * Math.abs(fator));
  };
  return `rgb(${canal(16)},${canal(8)},${canal(0)})`;
}

function pintarPlaceholder(caixa, rotulo) {
  const txt = semAcento(rotulo);
  const cor = acharCor(txt);
  if (cor) {
    /* Quando a cor está no rótulo, ela precisa DOMINAR o cartão.
     * Antes isto era um tint de 13% e "balão vermelho / azul / amarelo" saíam
     * como três balões 🎈 idênticos — o emoji vence a cor e a atividade central
     * do eixo Cores ficava impossível de resolver olhando. */
    caixa.style.background = tom(cor, .62);
    caixa.style.boxShadow = `inset 0 0 0 6px ${cor}`;
  }

  const rel = acharRelacao(txt);
  if (rel) {
    const cena = document.createElement("div");
    cena.className = "cena";
    const pose = POSES[rel.tipo];
    for (const [lado, emo] of [["a", rel.a], ["b", rel.b]]) {
      const p = pose[lado];
      const s = document.createElement("span");
      s.textContent = emo;
      s.style.cssText =
        `left:${p.left};top:${p.top};z-index:${p.z};transform:translate(-50%,-50%) scale(${p.esc});font-size:min(19cqw,58px)`;
      cena.appendChild(s);
    }
    caixa.appendChild(cena);
    return;
  }

  const emoji = acharEmoji(txt);

  if (!emoji && cor) {
    // "verde escuro", "roxo": aqui o certo NÃO é um emoji, é a própria cor.
    // É o que torna jogáveis as atividades de mistura e de tom (CO-009 a CO-012).
    const claro = /\bclar[oa]\b/.test(txt);
    const escuro = /\bescur[oa]\b/.test(txt);
    const amostra = document.createElement("span");
    amostra.className = "amostra-cor";
    amostra.style.background = claro ? tom(cor, .45) : escuro ? tom(cor, -.4) : cor;
    caixa.style.background = "transparent";
    caixa.style.boxShadow = "none";
    caixa.appendChild(amostra);
    return;
  }

  if (!emoji) {
    /* Última instância: uma moldura neutra, não iniciais.
     * "img/numeros/fita-1-a-10.png" virava o texto "F1" na tela, que lê como erro
     * de programação em vez de "a ilustração ainda não existe". */
    const vazio = document.createElement("span");
    vazio.className = "emoji figura-ausente";
    vazio.textContent = "🖼️";
    vazio.title = rotulo;
    caixa.appendChild(vazio);
    return;
  }

  const qtd = acharQuantidade(txt);
  const escala = acharEscala(txt);

  if (qtd > 1) {
    const conj = document.createElement("div");
    conj.className = "conjunto";
    const passo = qtd <= 4 ? 26 : qtd <= 6 ? 21 : 17;
    for (let i = 0; i < qtd; i++) {
      const s = document.createElement("span");
      s.className = "emoji";
      s.textContent = emoji;
      s.style.fontSize = `min(${passo}cqw,${passo * 2.4}px)`;
      conj.appendChild(s);
    }
    caixa.appendChild(conj);
  } else {
    const s = document.createElement("span");
    s.className = "emoji";
    s.textContent = emoji;
    const cqw = Math.max(15, Math.min(74, 52 * escala));
    s.style.fontSize = `min(${cqw}cqw,${Math.round(cqw * 2.3)}px)`;
    caixa.appendChild(s);
  }
}

/** Cria a figura de uma mídia do banco (`{imagem|texto, rotulo}`). */
export function criarFigura(midia, { classe = "" } = {}) {
  const caixa = document.createElement("div");
  caixa.className = "figura " + classe;
  caixa.style.containerType = "inline-size";

  if (midia.texto !== undefined) {
    const g = document.createElement("span");
    g.className = "glifo";
    g.textContent = midia.texto;
    caixa.appendChild(g);
    return caixa;
  }

  if (midia.imagem) {
    const img = new Image();
    img.alt = midia.rotulo || "";
    img.src = midia.imagem;
    img.addEventListener("error", () => {
      img.remove();
      caixa.dataset.placeholder = "1";
      // o rótulo manda; se não render nada, o nome do arquivo ainda pode ajudar
      // (ex.: rótulo "cor" + arquivo "mancha-vermelha.png" → amostra vermelha)
      pintarPlaceholder(caixa, midia.rotulo || "");
      if (!caixa.children.length || caixa.querySelector(".glifo")) {
        const doArquivo = descreverArquivo(midia.imagem);
        if (semAcento(doArquivo) !== semAcento(midia.rotulo || "")) {
          caixa.replaceChildren();
          pintarPlaceholder(caixa, doArquivo);
        }
      }
    }, { once: true });
    caixa.appendChild(img);
    return caixa;
  }

  pintarPlaceholder(caixa, midia.rotulo || "");
  return caixa;
}

/** Nome legível a partir do caminho do arquivo: "img/quantidades/5-peixes.png" → "5 peixes".
 *  É o que permite ao placeholder deduzir algo mesmo quando não há rótulo — o caso
 *  dos estímulos em imagem, que no banco não carregam texto próprio. */
export function descreverArquivo(caminho) {
  return caminho.split("/").pop().replace(/\.\w+$/, "").replace(/[-_]/g, " ").trim();
}
