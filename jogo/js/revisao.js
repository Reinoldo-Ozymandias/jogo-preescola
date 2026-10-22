/* Revisão pedagógica dentro do jogo.
 *
 * O parecer da coordenação era um Markdown gerado por `ferramentas/revisao.py`,
 * impresso e preenchido à mão. Aqui a mesma folha vira tela: quem revisa lê a
 * atividade, abre ela no jogo de verdade com um toque e marca o parecer ali
 * mesmo. O Markdown continua existindo — mas agora sai daqui, já preenchido.
 *
 * A revisão usa o banco inteiro (20), o mesmo que a criança joga: o que a
 * coordenação aprova é exatamente o que está no ar.
 */

/* Sem `import`/`export`: o jogo abre com um duplo clique no index.html, e o
 * navegador recusa `type="module"` em `file://`. Cada arquivo fica fechado numa
 * função e publica o que os outros usam num nome só — Revisao. */
window.Revisao = (function () {
  "use strict";
  const { criarFigura, descreverArquivo } = Midia;


  const CHAVE = "jogo.revisao.v1";

  const PARECERES = [
    { id: "ok",      rotulo: "OK",      selo: "✅" },
    { id: "ajustar", rotulo: "Ajustar", selo: "✏️" },
    { id: "remover", rotulo: "Remover", selo: "🗑️" },
  ];

  /* ─── persistência ───────────────────────────────────────────────────── */

  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; }
    catch { return {}; }
  }

  function gravar(dados) {
    try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch {}
  }

  /** Grava (ou apaga, com `parecer` nulo) o parecer de uma atividade. */
  function anotar(id, campos) {
    const dados = ler();
    const r = { ...(dados[id] || {}), ...campos, quando: Date.now() };
    if (!r.parecer && !r.nota) delete dados[id];
    else dados[id] = r;
    gravar(dados);
    return dados[id] || {};
  }

  function limpar() {
    try { localStorage.removeItem(CHAVE); } catch {}
  }

  /** Quantas atividades já têm parecer, e quantas de cada tipo. */
  function resumo() {
    const dados = ler();
    const contas = { ok: 0, ajustar: 0, remover: 0 };
    for (const id in dados) if (dados[id].parecer) contas[dados[id].parecer]++;
    return { ...contas, total: contas.ok + contas.ajustar + contas.remover };
  }

  /* ─── banco completo ─────────────────────────────────────────────────── */

  function carregar() {
    if (!window.BANCO_COMPLETO) throw new Error("dist/atividades.js não foi carregado");
    return window.BANCO_COMPLETO;
  }

  /* ─── descrição da resposta certa ────────────────────────────────────── */

  /* Mesma leitura que a folha impressa fazia: para quem revisa, o que importa é
   * qual é a resposta certa — não como o componente desenha a tela. */
  function descreverInteracao(ativ) {
    const i = ativ.interacao;
    switch (ativ.tipo) {
      case "escolha_imagem":
      case "selecao_multipla":
        return ["Opções", i.opcoes.map((o) => (o.correta ? `${o.rotulo} ✅` : o.rotulo))];
      case "arrastar_para_alvo": {
        const alvos = Object.fromEntries(i.alvos.map((a) => [a.id, a.rotulo]));
        return ["Arrastar", i.arrastaveis.map(
          (x) => `${x.rotulo} → ${alvos[x.alvo] || "não arrastar"}`)];
      }
      case "ordenar_sequencia":
        return ["Ordem certa", [i.itens.slice()
          .sort((a, b) => a.ordem - b.ordem).map((x) => x.rotulo).join(" → ")]];
      case "parear":
        return ["Pares", i.pares.map((p) => `${p.a.rotulo} ↔ ${p.b.rotulo}`)];
      case "contar_toques":
        return ["Resposta", [`tocar ${i.quantidade}× em ${i.alvo.rotulo}`]];
      default:
        return ["Resposta", []];
    }
  }

  /* Sem ilustração, o placeholder deduz um emoji do rótulo — e às vezes deduz o
   * MESMO para duas opções. NE-010 ("qual caminho leva o coelho até a cenoura")
   * vira três 🛣️ idênticas: não há resposta possível. Isto é calculado na hora, e
   * some sozinho quando o png chegar; não é uma lista para manter à mão. */
  const palcoOculto = (() => {
    let el = null;
    return () => (el ||= Object.assign(document.createElement("div"), {
      style: "position:fixed;left:-9999px;top:0;width:300px",
    }), document.body.contains(el) || document.body.append(el), el);
  })();

  function defeitosDeDesenho(ativ) {
    const i = ativ.interacao;
    const grupo = i.opcoes || i.itens || i.arrastaveis;
    if (!grupo) return { iguais: [], mudas: [] };
    const palco = palcoOculto();
    const vistos = new Map();
    const iguais = [];
    const mudas = [];
    for (const m of grupo) {
      const { imagem, ...semArte } = m;
      palco.replaceChildren();
      const f = criarFigura(semArte);
      palco.append(f);
      // o placeholder não achou emoji nenhum: sai uma moldura vazia
      if (f.querySelector(".figura-ausente")) mudas.push(m.rotulo);
      const chave = f.innerHTML.replace(/\s+/g, " ").trim();
      if (vistos.has(chave)) iguais.push(`${vistos.get(chave)} ≡ ${m.rotulo}`);
      else vistos.set(chave, m.rotulo);
    }
    palco.replaceChildren();
    return { iguais, mudas };
  }

  /* O estímulo de imagem também depende do placeholder, e às vezes ele não tem o
   * que desenhar: a fita de números de CQ-008/009 vira moldura vazia, e a pergunta
   * "qual número vem depois do cinco" fica sem o número em cima. */
  function estimuloSemDesenho(ativ) {
    const est = ativ.estimulo;
    if (!est || est.tipo !== "imagem") return null;
    const palco = palcoOculto();
    palco.replaceChildren();
    const f = criarFigura({ rotulo: descreverArquivo(est.asset) });
    palco.append(f);
    const vazio = !!f.querySelector(".figura-ausente");
    palco.replaceChildren();
    return vazio ? est.asset : null;
  }

  function descreverEstimulo(est) {
    if (!est) return null;
    if (est.tipo === "imagem") return ["Antes de responder, a criança vê", est.asset];
    if (est.texto) return ["Antes de responder, a criança ouve", `“${est.texto}”`];
    const arquivos = est.assets || (est.asset ? [est.asset] : []);
    return ["Antes de responder, a criança ouve", arquivos.join(" + ")];
  }

  /* ─── montagem da tela ───────────────────────────────────────────────── */

  const criar = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
  };

  function linha(rotulo, valor) {
    const p = criar("p", "rev-linha");
    p.append(criar("b", null, rotulo + ": "), valor);
    return p;
  }

  function cartao(ativ, aoMudar) {
    const salvo = ler()[ativ.id] || {};
    const art = criar("article", "rev-item");
    art.dataset.id = ativ.id;
    art.dataset.parecer = salvo.parecer || "";

    const cabeca = criar("div", "rev-cabeca");
    cabeca.append(
      criar("span", "rev-id", ativ.id),
      criar("span", "rev-meta",
        `nível ${ativ.nivel} · ${ativ.subhabilidade.replace(/_/g, " ")} · ${ativ.tipo.replace(/_/g, " ")}`),
      criar("span", "rev-selo", PARECERES.find((p) => p.id === salvo.parecer)?.selo || ""),
    );
    art.append(cabeca, criar("p", "rev-comando", `“${ativ.comando}”`));

    const est = descreverEstimulo(ativ.estimulo);
    if (est) art.append(linha(est[0], est[1]));

    const [rotuloInter, itens] = descreverInteracao(ativ);
    if (itens.length) art.append(linha(rotuloInter, itens.join(" · ")));

    const { iguais, mudas } = defeitosDeDesenho(ativ);
    if (mudas.length) {
      const av = criar("p", "rev-alerta");
      av.append(criar("b", null, "Opção sem desenho nenhum: "),
                `${mudas.join(", ")} — o placeholder não tem emoji para esse rótulo`);
      art.append(av);
    }
    if (iguais.length) {
      const av = criar("p", "rev-alerta");
      av.append(criar("b", null, "Sem ilustração, desenham idênticas: "), iguais.join(" , "));
      art.append(av);
    }

    const semDesenho = estimuloSemDesenho(ativ);
    if (semDesenho) {
      const av = criar("p", "rev-alerta");
      av.append(criar("b", null, "A figura de apoio não aparece: "),
                `o placeholder não sabe desenhar ${semDesenho} — a criança vê uma moldura vazia`);
      art.append(av);
    }

    art.append(
      linha("Acertou", `“${ativ.feedback.acerto}”`),
      linha("Errou", `“${ativ.feedback.erro}”`),
      linha("Nota ao professor", ativ.nota_professor || "—"),
      linha("BNCC (a validar)", ativ.bncc_sugerido.join(", ")),
    );

    /* parecer */
    const barra = criar("div", "rev-parecer");
    const nota = criar("textarea", "rev-nota");
    nota.placeholder = "O que ajustar, ou por que remover…";
    nota.value = salvo.nota || "";
    nota.hidden = !salvo.parecer && !salvo.nota;

    PARECERES.forEach((p) => {
      const b = criar("button", "rev-botao", p.rotulo);
      b.type = "button";
      b.dataset.p = p.id;
      b.setAttribute("aria-pressed", String(salvo.parecer === p.id));
      b.addEventListener("click", () => {
        // segundo toque no mesmo parecer desmarca — dá para desfazer um engano
        const atual = art.dataset.parecer;
        const novo = atual === p.id ? "" : p.id;
        const r = anotar(ativ.id, { parecer: novo || null });
        art.dataset.parecer = novo;
        cabeca.querySelector(".rev-selo").textContent =
          PARECERES.find((x) => x.id === novo)?.selo || "";
        barra.querySelectorAll(".rev-botao").forEach(
          (o) => o.setAttribute("aria-pressed", String(o.dataset.p === novo)));
        nota.hidden = !novo && !r.nota;
        aoMudar();
      });
      barra.append(b);
    });

    const ver = criar("a", "rev-abrir", "▶ ver no jogo");
    ver.href = `?id=${ativ.id}`;
    ver.target = "_blank";
    ver.rel = "noopener";
    ver.title = "Abre a atividade em outra aba, como a criança vê";
    barra.append(ver);

    // grava ao sair do campo, não a cada tecla: 120 escritas por frase é desperdício
    nota.addEventListener("change", () => {
      anotar(ativ.id, { nota: nota.value.trim() || null });
      aoMudar();
    });

    art.append(barra, nota);
    return art;
  }

  /** Monta a tela inteira. Chamar a cada abertura: relê o localStorage. */
  async function montar({ lista, aviso, andamento, filtroEixo, soPendentes, baixar }) {
    const banco = carregar();

    aviso.textContent = banco.aviso_bncc;

    if (!filtroEixo.options.length) {
      filtroEixo.append(new Option("todos os eixos", ""));
      banco.eixos.forEach((e) => filtroEixo.append(new Option(`${e.ordem}. ${e.nome}`, e.id)));
    }

    const atualizarAndamento = () => {
      const r = resumo();
      const n = banco.atividades.length;
      andamento.replaceChildren();
      andamento.append(criar("div", "rev-contagem",
        `${r.total} de ${n} com parecer · ${r.ok} OK · ${r.ajustar} a ajustar · ${r.remover} a remover`));
      const barra = criar("div", "barra");
      const i = criar("i");
      i.style.width = `${Math.round((r.total / n) * 100)}%`;
      i.style.background = "var(--acerto)";
      barra.append(i);
      andamento.append(barra);
      baixar.disabled = r.total === 0;
    };

    const desenhar = () => {
      const dados = ler();
      const eixoEscolhido = filtroEixo.value;
      lista.replaceChildren();
      let mostradas = 0;

      for (const eixo of banco.eixos) {
        if (eixoEscolhido && eixo.id !== eixoEscolhido) continue;
        const itens = banco.atividades.filter((a) => a.eixo === eixo.id
          && !(soPendentes.checked && dados[a.id]?.parecer));
        if (!itens.length) continue;
        mostradas += itens.length;

        const bloco = criar("section", "rev-eixo");
        const h = criar("h3", null, `${eixo.ordem}. ${eixo.nome}`);
        h.style.borderLeftColor = eixo.cor;
        bloco.append(h,
          criar("p", "rev-eixo-desc", eixo.descricao),
          criar("p", "rev-eixo-campo", `Campo de experiência: ${eixo.campo_experiencia}`));
        itens.forEach((a) => bloco.append(cartao(a, atualizarAndamento)));
        lista.append(bloco);
      }

      if (!mostradas) {
        lista.append(criar("p", "vazio", soPendentes.checked
          ? "Tudo que aparece neste filtro já tem parecer."
          : "Nenhuma atividade neste filtro."));
      }
    };

    filtroEixo.onchange = desenhar;
    soPendentes.onchange = desenhar;
    baixar.onclick = () => baixarMarkdown(banco);

    atualizarAndamento();
    desenhar();
  }

  /* ─── saída para a Secretaria ────────────────────────────────────────── */

  /** O mesmo documento que `ferramentas/revisao.py` gera, agora com o parecer
   *  preenchido. É este arquivo que volta para a coordenação. */
  function markdown(banco) {
    const dados = ler();
    const r = resumo();
    const L = [];
    L.push("# Banco de atividades — parecer pedagógico\n");
    L.push(`**Público:** ${banco.publico}  `);
    L.push(`**Versão do banco:** ${banco.versao}  `);
    L.push(`**Revisado em:** ${new Date().toLocaleDateString("pt-BR")}\n`);
    L.push(`> ${banco.aviso_bncc}\n`);
    L.push(`**Andamento:** ${r.total} de ${banco.atividades.length} atividades com parecer — ` +
           `${r.ok} OK, ${r.ajustar} a ajustar, ${r.remover} a remover.\n`);
    L.push("---\n");

    for (const eixo of banco.eixos) {
      L.push(`## ${eixo.ordem}. ${eixo.nome}\n`);
      L.push(`*${eixo.descricao}*\n`);
      L.push(`Campo de experiência: ${eixo.campo_experiencia}\n`);
      for (const a of banco.atividades.filter((x) => x.eixo === eixo.id)) {
        const p = dados[a.id] || {};
        L.push(`### ${a.id} — nível ${a.nivel} · ${a.subhabilidade.replace(/_/g, " ")}\n`);
        L.push(`**Fala do jogo:** “${a.comando}”\n`);
        const est = descreverEstimulo(a.estimulo);
        if (est) L.push(`**${est[0]}:** ${est[1]}\n`);
        const [rot, itens] = descreverInteracao(a);
        if (itens.length) L.push(`**${rot}:** ${itens.join(" · ")}\n`);
        L.push(`**Acertou:** “${a.feedback.acerto}”  `);
        L.push(`**Errou:** “${a.feedback.erro}”\n`);
        L.push(`**Nota ao professor:** ${a.nota_professor || "—"}\n`);
        L.push(`**BNCC (a validar):** ${a.bncc_sugerido.join(", ")}\n`);
        const marca = (id) => (p.parecer === id ? "(X)" : "( )");
        L.push(`**Parecer:** ${marca("ok")} OK  ${marca("ajustar")} Ajustar  ` +
               `${marca("remover")} Remover${p.nota ? ` — ${p.nota}` : ""}\n`);
      }
      L.push("---\n");
    }
    L.push(`\n_Total: ${banco.atividades.length} atividades._\n`);
    return L.join("\n");
  }

  function baixarMarkdown(banco) {
    const hoje = new Date().toISOString().slice(0, 10);
    const blob = new Blob([markdown(banco)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parecer-pedagogico-${hoje}.md`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { limpar, resumo, montar, markdown };
})();
