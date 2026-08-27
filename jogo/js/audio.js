/* Fala e som.
 *
 * A criança não lê: TODO enunciado chega por áudio. Enquanto não existe locução
 * gravada, usamos a Web Speech API em pt-BR — é o suficiente para o piloto.
 *
 * ⚠️ Nos eixos de Consciência Fonológica e Silábica o som É o conteúdo, e voz
 * sintética erra a prosódia justamente aí. Esses precisam de gravação humana
 * antes de qualquer teste sério em sala.
 */

const sintese = window.speechSynthesis;

let vozes = [];
let vozEscolhida = null;
let velocidade = 0.9;
let liberado = false;

function carregarVozes() {
  if (!sintese) return;
  vozes = sintese.getVoices().filter((v) => v.lang.toLowerCase().startsWith("pt"));
  if (!vozEscolhida && vozes.length) {
    const salva = localStorage.getItem("jogo.voz");
    vozEscolhida = vozes.find((v) => v.name === salva)
      || vozes.find((v) => v.lang.toLowerCase().replace("_", "-") === "pt-br")
      || vozes[0];
  }
}

if (sintese) {
  carregarVozes();
  sintese.addEventListener("voiceschanged", carregarVozes);
}

export const vozesDisponiveis = () => vozes;

export function definirVoz(nome) {
  const v = vozes.find((x) => x.name === nome);
  if (v) { vozEscolhida = v; localStorage.setItem("jogo.voz", nome); }
}

export function definirVelocidade(v) {
  velocidade = v;
  localStorage.setItem("jogo.velocidade", String(v));
}

export function velocidadeAtual() {
  return +(localStorage.getItem("jogo.velocidade") || velocidade);
}

/** Chamar no primeiro toque do usuário: navegadores bloqueiam áudio antes disso. */
export function liberarAudio() {
  if (liberado || !sintese) return;
  sintese.speak(new SpeechSynthesisUtterance(""));
  liberado = true;
  velocidade = velocidadeAtual();
}

/* ─── arquivos de áudio ──────────────────────────────────────────────── */

let tocando = null;

/** Toca um arquivo. Resolve `true` se tocou até o fim, `false` se não existe
 *  ou falhou — é esse `false` que faz o chamador cair no TTS. */
export function tocarArquivo(src) {
  return new Promise((resolve) => {
    const a = new Audio(src);
    tocando = a;
    let respondido = false;
    const fim = (valor) => {
      if (respondido) return;
      respondido = true;
      if (tocando === a) tocando = null;
      resolve(valor);
    };
    // guarda curto: se nem os metadados chegarem, o arquivo não existe.
    // Precisa ser CANCELADO quando eles chegam, senão derruba um áudio que
    // está tocando bem e dura mais de 1,5 s.
    const guarda = setTimeout(() => fim(false), 1500);
    a.addEventListener("loadedmetadata", () => {
      clearTimeout(guarda);
      // rede de segurança caso o evento `ended` não venha
      setTimeout(() => fim(true), (a.duration || 3) * 1000 + 1500);
    }, { once: true });
    a.addEventListener("ended", () => { clearTimeout(guarda); fim(true); }, { once: true });
    a.addEventListener("error", () => { clearTimeout(guarda); fim(false); }, { once: true });
    a.play().catch(() => { clearTimeout(guarda); fim(false); });
  });
}

export function calar() {
  if (sintese) sintese.cancel();
  if (tocando) { try { tocando.pause(); } catch {} tocando = null; }
}

/** Fala um texto. Resolve quando termina (ou logo, se não houver suporte). */
export function falar(texto, { interromper = true } = {}) {
  return new Promise((resolve) => {
    if (!sintese || !texto) return resolve();
    if (interromper) sintese.cancel();
    const f = new SpeechSynthesisUtterance(texto);
    f.lang = "pt-BR";
    f.rate = velocidade;
    f.pitch = 1.05;
    if (vozEscolhida) f.voice = vozEscolhida;
    f.addEventListener("end", resolve, { once: true });
    f.addEventListener("error", () => resolve(), { once: true });
    sintese.speak(f);
    // rede de segurança: se o motor engasgar, não travar o jogo
    setTimeout(resolve, Math.min(16000, 2600 + texto.length * 95));
  });
}

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─── áudio pré-gerado (mp3 dos comandos) ────────────────────────────── */

/**
 * Fala o enunciado de uma atividade: tenta o mp3 pré-gerado primeiro,
 * depois cai no Web Speech API. A criança não lê — o áudio é o enunciado.
 */
export async function falarComando(idAtividade, texto) {
  calar();
  // uma implementação só: `tocarArquivo` para de verdade no `calar()` e não
  // devolve sucesso falso quando o arquivo trava
  const tocou = await tocarArquivo(`audio/comandos/${idAtividade}.mp3`);
  if (!tocou) await falar(texto);
}

/* ─── sons curtos sintetizados (sem arquivos) ────────────────────────── */

let ctx = null;
const contexto = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

function tom(freq, inicio, duracao, volume = 0.16) {
  const c = contexto();
  const osc = c.createOscillator();
  const ganho = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  ganho.gain.setValueAtTime(0, c.currentTime + inicio);
  ganho.gain.linearRampToValueAtTime(volume, c.currentTime + inicio + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + inicio + duracao);
  osc.connect(ganho).connect(c.destination);
  osc.start(c.currentTime + inicio);
  osc.stop(c.currentTime + inicio + duracao + 0.05);
}

export function somAcerto() {
  try { tom(660, 0, 0.16); tom(880, 0.12, 0.26); } catch {}
}

/** Deliberadamente NÃO é um som de derrota: é um convite a tentar de novo. */
export function somTentaDeNovo() {
  try { tom(392, 0, 0.18, 0.12); } catch {}
}

export function somToque() {
  try { tom(523, 0, 0.09, 0.1); } catch {}
}

export function somFim() {
  try { [523, 659, 784, 1047].forEach((f, i) => tom(f, i * 0.13, 0.3)); } catch {}
}
