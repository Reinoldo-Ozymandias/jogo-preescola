/* Fala e som.
 *
 * A criança não lê: TODO enunciado chega por áudio. Enquanto não existe locução
 * gravada, usamos a Web Speech API em pt-BR — é o suficiente para o piloto.
 *
 * ⚠️ Nos eixos de Consciência Fonológica e Silábica o som É o conteúdo, e voz
 * sintética erra a prosódia justamente aí. Esses precisam de gravação humana
 * antes de qualquer teste sério em sala.
 */

/* Sem `import`/`export`: o jogo abre com um duplo clique no index.html, e o
 * navegador recusa `type="module"` em `file://`. Cada arquivo fica fechado numa
 * função e publica o que os outros usam num nome só — Som. */
window.Som = (function () {
  "use strict";

  const sintese = window.speechSynthesis;

  /* O mp3 é gravado com length-scale 1.25 no Piper (ver ferramentas/gerar-audio.py)
   * — 25% mais devagar que o padrão, porque o público tem 5–6 anos. O número se
   * repete aqui só para a voz do navegador (fallback) andar no MESMO ritmo da
   * locução gravada: 1/1.25 = 0.8. Mudou lá, mude aqui. */
  const RITMO_GRAVACAO = 1.25;

  let vozes = [];
  let vozEscolhida = null;
  let velocidade = 1.0;
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

  const vozesDisponiveis = () => vozes;

  function definirVoz(nome) {
    const v = vozes.find((x) => x.name === nome);
    if (v) { vozEscolhida = v; localStorage.setItem("jogo.voz", nome); }
  }

  function definirVelocidade(v) {
    velocidade = v;
    // chave nova: a antiga (jogo.velocidade, padrão 0.9) somava lentidão sobre a
    // locução já lenta e deixava a fala arrastada sem ninguém ter pedido
    localStorage.setItem("jogo.ritmo", String(v));
  }

  function velocidadeAtual() {
    const v = +(localStorage.getItem("jogo.ritmo") || velocidade);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  /** Chamar no primeiro toque do usuário: navegadores bloqueiam áudio antes disso. */
  function liberarAudio() {
    if (liberado || !sintese) return;
    sintese.speak(new SpeechSynthesisUtterance(""));
    liberado = true;
    velocidade = velocidadeAtual();
  }

  /* ─── arquivos de áudio ──────────────────────────────────────────────── */

  let tocando = null;

  /** Toca um arquivo. Resolve `true` se tocou até o fim, `false` se não existe
   *  ou falhou — é esse `false` que faz o chamador cair no TTS. */
  function tocarArquivo(src) {
    return new Promise((resolve) => {
      const a = new Audio(src);
      // o professor ajusta o ritmo aqui; preservesPitch mantém o tom da voz
      // (sem isso, 0.8× afina e parece desenho animado)
      a.preservesPitch = true;
      a.playbackRate = velocidadeAtual();
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
        // rede de segurança caso o evento `ended` não venha. Divide pelo
        // playbackRate: em 0.7× o arquivo dura mais, e sem isso a guarda venceria
        // no meio da fala e a próxima atividade cortaria o áudio.
        setTimeout(() => fim(true), ((a.duration || 3) * 1000) / a.playbackRate + 1500);
      }, { once: true });
      a.addEventListener("ended", () => { clearTimeout(guarda); fim(true); }, { once: true });
      a.addEventListener("error", () => { clearTimeout(guarda); fim(false); }, { once: true });
      a.play().catch(() => { clearTimeout(guarda); fim(false); });
    });
  }

  function calar() {
    if (sintese) sintese.cancel();
    if (tocando) { try { tocando.pause(); } catch {} tocando = null; }
  }

  /* ─── notação do banco → texto falado ────────────────────────────────── */

  /* Espelho de ferramentas/fala.py — leia o porquê lá. Em resumo: o banco escreve
   * "BO-LA", "SapaTO" e "CA + SA = CASA" para o OLHO, e o sintetizador lê isso ao
   * pé da letra ("bê-ó-la", "sapa tê-ó", "cá mais sá igual casa"). Aqui só entra
   * em ação quando o mp3 gravado falta e sobra a voz do navegador.
   * Mudou lá, mude aqui. */

  const SILABA_FALADA = {
    bo: "bô", ba: "bá", pa: "pá", to: "tô", lo: "lô", ne: "nê", le: "lê",
  };
  const MAIUSCULA = "A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ";
  const MINUSCULA = "a-zà-ÿ";
  const TEM_CAIXA_ALTA = new RegExp(`(?:^|-)[${MAIUSCULA}]+(?:-|$)`);
  const COLADA = new RegExp(`[${MINUSCULA}][${MAIUSCULA}]`);
  const SO_MAIUSCULA = new RegExp(`^[${MAIUSCULA}]{2,}$`);
  const PONTUACAO = /^[.,!?:;…()"']+|[.,!?:;…()"']+$/g;

  function pedaco(p) {
    const baixa = p.toLowerCase();
    if (SILABA_FALADA[baixa]) return SILABA_FALADA[baixa];
    // CAIXA ALTA de 2+ letras vira acrônimo soletrado; a ênfase é visual
    return SO_MAIUSCULA.test(p) ? baixa : p;
  }

  function token(t) {
    const nucleo = t.replace(PONTUACAO, "");
    if (!nucleo) return t;
    const i = t.indexOf(nucleo);
    const antes = t.slice(0, i);
    const depois = t.slice(i + nucleo.length);
    let novo;
    if (nucleo.includes("-") && TEM_CAIXA_ALTA.test(nucleo)) {
      novo = nucleo.split("-").filter(Boolean).map(pedaco).join(", ");
    } else if (COLADA.test(nucleo)) {
      novo = nucleo.toLowerCase();
    } else {
      novo = pedaco(nucleo);
    }
    return antes + novo + depois;
  }

  function paraFala(texto) {
    return texto
      // "Ffffaca" → "Faca", "pããão" → "pão". Classe explícita: o \w do JS não
      // inclui acentuada, e "pããão" passava batido (o \w do Python inclui).
      .replace(/([A-Za-zÀ-ÿ])\1{2,}/gi, "$1")
      .replace(/\s*[+=]\s*/g, ", ")         // o sinal é conta para o olho
      .replace(/(^|[\s(])-(?=\w)/g, "$1")   // "-OLA" faz soletrar
      .split(" ").map(token).join(" ");
  }

  /** Fala um texto. Resolve quando termina (ou logo, se não houver suporte). */
  function falar(texto, { interromper = true } = {}) {
    return new Promise((resolve) => {
      if (!sintese || !texto) return resolve();
      if (interromper) sintese.cancel();
      const f = new SpeechSynthesisUtterance(paraFala(texto));
      f.lang = "pt-BR";
      f.rate = velocidadeAtual() / RITMO_GRAVACAO;
      f.pitch = 1.05;
      if (vozEscolhida) f.voice = vozEscolhida;
      f.addEventListener("end", resolve, { once: true });
      f.addEventListener("error", () => resolve(), { once: true });
      sintese.speak(f);
      // rede de segurança: se o motor engasgar, não travar o jogo
      setTimeout(resolve, Math.min(16000, 2600 + texto.length * 95));
    });
  }

  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ─── áudio pré-gerado (mp3 dos comandos) ────────────────────────────── */

  /**
   * Fala o enunciado de uma atividade: tenta o mp3 pré-gerado primeiro,
   * depois cai no Web Speech API. A criança não lê — o áudio é o enunciado.
   */
  async function falarComando(idAtividade, texto) {
    calar();
    // uma implementação só: `tocarArquivo` para de verdade no `calar()` e não
    // devolve sucesso falso quando o arquivo trava
    const tocou = await tocarArquivo(`audio/comandos/${idAtividade}.mp3`);
    if (!tocou) await falar(texto);
  }

  /**
   * Fala o retorno de acerto ou erro. Mesma regra do enunciado: o mp3 gravado
   * primeiro. Antes estes textos iam SEMPRE para a voz do navegador — que é
   * silêncio em máquina sem voz pt-BR, e no espeak soletrava a notação do banco.
   */
  async function falarFeedback(idAtividade, campo, texto) {
    // o enunciado pode ainda estar tocando quando a criança responde
    calar();
    const tocou = await tocarArquivo(`audio/feedback/${idAtividade}-${campo}.mp3`);
    if (!tocou) await falar(texto, { interromper: false });
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

  function somAcerto() {
    try { tom(660, 0, 0.16); tom(880, 0.12, 0.26); } catch {}
  }

  /** Deliberadamente NÃO é um som de derrota: é um convite a tentar de novo. */
  function somTentaDeNovo() {
    try { tom(392, 0, 0.18, 0.12); } catch {}
  }

  function somToque() {
    try { tom(523, 0, 0.09, 0.1); } catch {}
  }

  function somFim() {
    try { [523, 659, 784, 1047].forEach((f, i) => tom(f, i * 0.13, 0.3)); } catch {}
  }

  return { vozesDisponiveis, definirVoz, definirVelocidade, velocidadeAtual, liberarAudio, tocarArquivo, calar, paraFala, falar, espera, falarComando, falarFeedback, somAcerto, somTentaDeNovo, somToque, somFim };
})();
