/* Registro de desempenho.
 *
 * Fica só no navegador desta máquina (localStorage). Nada sai daqui — é uma
 * escolha deliberada: são dados de crianças pequenas, e o projeto não tem (nem
 * precisa ter, nesta fase) uma base com consentimento e política de retenção.
 * Quando a Secretaria quiser acompanhamento entre máquinas, isso vira requisito
 * próprio, com conversa sobre LGPD antes de uma linha de código.
 */

/* Sem `import`/`export`: o jogo abre com um duplo clique no index.html, e o
 * navegador recusa `type="module"` em `file://`. Cada arquivo fica fechado numa
 * função e publica o que os outros usam num nome só — Progresso. */
window.Progresso = (function () {
  "use strict";

  const CHAVE = "jogo.progresso.v1";

  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; }
    catch { return {}; }
  }

  function gravar(dados) {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch {}
  }

  /** Registra o resultado de UMA atividade concluída. */
  function registrar(ativ, tentativas) {
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
  function porEixo() {
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
  function precisamAtencao(minimoVezes = 2, limite = 0.5) {
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

  function limpar() {
    try { localStorage.removeItem(CHAVE); } catch {}
  }

  return { registrar, porEixo, precisamAtencao, limpar };
})();
