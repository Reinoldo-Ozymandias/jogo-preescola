/* Registro de desempenho.
 *
 * Fica só no navegador desta máquina (localStorage). Nada sai daqui — é uma
 * escolha deliberada: são dados de crianças pequenas, e o projeto não tem (nem
 * precisa ter, nesta fase) uma base com consentimento e política de retenção.
 * Quando a Secretaria quiser acompanhamento entre máquinas, isso vira requisito
 * próprio, com conversa sobre LGPD antes de uma linha de código.
 */

const CHAVE = "jogo.progresso.v1";

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; }
  catch { return {}; }
}

function gravar(dados) {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch {}
}

/** Registra o resultado de UMA atividade concluída. */
export function registrar(ativ, tentativas) {
  const dados = ler();
  const r = dados[ativ.id] || {
    eixo: ativ.eixo, nivel: ativ.nivel, subhabilidade: ativ.subhabilidade,
    vezes: 0, deprimeira: 0, tentativasTotal: 0,
  };
  r.vezes++;
  r.tentativasTotal += tentativas;
  if (tentativas === 1) r.deprimeira++;
  r.ultima = Date.now();
  dados[ativ.id] = r;
  gravar(dados);
}

/** Fração 0..1 de acerto de primeira por eixo, e quantas atividades já foram vistas. */
export function porEixo() {
  const dados = ler();
  const mapa = {};
  for (const id in dados) {
    const r = dados[id];
    const m = (mapa[r.eixo] ||= { vistas: 0, vezes: 0, deprimeira: 0 });
    m.vistas++;
    m.vezes += r.vezes;
    m.deprimeira += r.deprimeira;
  }
  for (const e in mapa) {
    mapa[e].taxa = mapa[e].vezes ? mapa[e].deprimeira / mapa[e].vezes : 0;
  }
  return mapa;
}

/** Sub-habilidades com taxa baixa de acerto de primeira — o que revisar em sala. */
export function precisamAtencao(minimoVezes = 2, limite = 0.5) {
  const dados = ler();
  const mapa = {};
  for (const id in dados) {
    const r = dados[id];
    const chave = `${r.eixo}::${r.subhabilidade}`;
    const m = (mapa[chave] ||= { eixo: r.eixo, sub: r.subhabilidade, vezes: 0, deprimeira: 0 });
    m.vezes += r.vezes;
    m.deprimeira += r.deprimeira;
  }
  return Object.values(mapa)
    .filter((m) => m.vezes >= minimoVezes && m.deprimeira / m.vezes <= limite)
    .map((m) => ({ ...m, taxa: m.deprimeira / m.vezes }))
    .sort((a, b) => a.taxa - b.taxa);
}

export function limpar() {
  try { localStorage.removeItem(CHAVE); } catch {}
}

/* ─── preferências ────────────────────────────────────────────────────── */

const PREF = "jogo.config.v1";

export function config() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem(PREF)) || {}; } catch {}
  return { bancoCompleto: false, tamanhoSessao: 6, ...c };
}

export function salvarConfig(novo) {
  try { localStorage.setItem(PREF, JSON.stringify({ ...config(), ...novo })); } catch {}
}
