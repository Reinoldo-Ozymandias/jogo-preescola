/* Shell do jogo: carrega o banco, monta as sessões e conduz o fluxo. */

/* Sem `import`/`export`: o jogo abre com um duplo clique no index.html, e o
 * navegador recusa `type="module"` em `file://`. Os outros arquivos publicam
 * seus nomes em Midia, Som, Atividades, Progresso e Revisao. */
(function () {
  "use strict";
  const { criarFigura, descreverArquivo } = Midia;
  const som = Som;
  const { montarAtividade } = Atividades;
  const prog = Progresso;
  const revisao = Revisao;


  const $ = (id) => document.getElementById(id);
  const TELAS = ["tela-abertura", "tela-jogo", "tela-fim", "tela-professor", "tela-revisao"];

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

  /* O jogo roda o corte fixo, não o banco inteiro: são as 20 verificadas como
   * jogáveis hoje (ver conteudo/piloto.json). As outras 100 continuam existindo em
   * dist/atividades.json e são alcançadas pela tela de revisão e pelo atalho ?id=,
   * mas ninguém tropeça nelas jogando. */
  function carregarBanco() {
    if (!window.BANCO_PILOTO) throw new Error("dist/piloto.js não foi carregado");
    estado.banco = window.BANCO_PILOTO;
  }

  /* ─── sessão ─────────────────────────────────────────────────────────── */

  /** Ordem de leitura: eixo por eixo, na ordem do índice, e dentro do eixo do
   *  mais fácil para o mais difícil. */
  function porEixoENivel(lista, eixos) {
    const ordem = new Map(eixos.map((e) => [e.id, e.ordem]));
    return lista.slice().sort((a, b) =>
      (ordem.get(a.eixo) ?? 99) - (ordem.get(b.eixo) ?? 99)
      || a.nivel - b.nivel
      || a.id.localeCompare(b.id));
  }

  /** A sessão é o acervo inteiro, na mesma ordem toda vez.
   *
   *  Não há sorteio nem tamanho configurável: são 20 atividades fixas, agrupadas
   *  por eixo e do fácil para o difícil dentro de cada um. O que sorteava um
   *  recorte saiu junto com o controle de quantidade — está no histórico do git,
   *  e volta quando as outras 100 forem conferidas. */
  function iniciarSessao(filtroEixo = null) {
    const universo = filtroEixo
      ? estado.banco.atividades.filter((a) => a.eixo === filtroEixo.id)
      : estado.banco.atividades;

    estado.filtroEixo = filtroEixo;
    estado.sessao = porEixoENivel(universo, estado.banco.eixos);
    estado.indice = 0;
    estado.resultados = [];
    mostrar("tela-jogo");
    renderAtividade();
  }

  /* A fila de pontos tem de CABER na barra. Com 20 atividades, os 15px de ponto e
   * 10px de intervalo do desenho original dão 493px: num celular de 390px o fim da
   * sessão ficava fora da tela, e no monitor a fila parecia o banco inteiro. Então
   * o ponto encolhe conforme a quantidade — e, se nem no menor tamanho couber,
   * vira uma barra contínua em vez de transbordar. */
  function pontosDeProgresso() {
    const alvo = $("progresso-pontos");
    alvo.replaceChildren();                 // medir vazio dá a largura disponível
    const total = estado.sessao.length;
    // teto próprio: mesmo sobrando tela, uma fila de 490px atravessando o monitor
    // parece o banco inteiro, não o pedaço de sessão que é
    const disponivel = Math.min(alvo.clientWidth || 260, 320);

    // maior ponto que ainda cabe; o intervalo acompanha o tamanho
    let tamanho = 0, intervalo = 0;
    for (let t = 15; t >= 6; t--) {
      const g = t >= 12 ? 10 : t >= 9 ? 6 : 3;
      if (total * t + (total - 1) * g <= disponivel) { tamanho = t; intervalo = g; break; }
    }

    if (!tamanho) {                         // muitas para desenhar uma a uma
      alvo.classList.add("em-barra");
      const trilho = document.createElement("i");
      trilho.style.width = `${Math.round((estado.indice / total) * 100)}%`;
      alvo.appendChild(trilho);
      return;
    }

    alvo.classList.remove("em-barra");
    alvo.style.setProperty("--ponto", `${tamanho}px`);
    alvo.style.setProperty("--intervalo-ponto", `${intervalo}px`);
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

  /** Frases curtas que o jogo fala e não vêm do banco (fim da sessão, som que
   *  falta). Têm mp3 como todo o resto: na voz do navegador elas eram silêncio
   *  em qualquer máquina sem voz pt-BR — inclusive no fim do jogo. */
  async function falarExtra(nome, texto) {
    if (await som.tocarArquivo(`audio/extras/${nome}.mp3`)) return;
    await som.falar(texto);
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
          await falarExtra("sem-som", "Esse som ainda não foi gravado.");
          return;
        }
        // 700 ms: em 5–6 anos, o intervalo entre dois sons da mesma questão é
        // o que separa "ouvi dois sons" de "ouvi um som comprido"
        if (i < caminhos.length - 1) await som.espera(700);
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
        retorno(ativ, "erro");
      },
      aoConcluir: () => {
        estado.tentativas++;
        prog.registrar(ativ, estado.tentativas);
        estado.resultados.push({ ativ, tentativas: estado.tentativas });
        retorno(ativ, "acerto", avancar);
      },
    });

    // "Toque no sol, depois no peixe e por último na casa" é muita coisa para
    // guardar de cabeça enquanto se monta a sequência — e, ao contrário da escolha
    // simples, aqui a criança fica um tempo na tela. O 🔊 do topo já repete, mas é
    // um ícone pequeno num canto: nestas o botão vem grande, junto da mão.
    if (ativ.tipo === "ordenar_sequencia") {
      const repetir = document.createElement("button");
      repetir.type = "button";
      repetir.className = "botao-som";
      repetir.append(
        Object.assign(document.createElement("span"), { textContent: "🔊" }),
        Object.assign(document.createElement("span"), { textContent: "Ouvir a pergunta de novo" }),
      );
      repetir.addEventListener("click", () => falarComando());
      acao.appendChild(repetir);
    }

    falarComando();
  }

  function retorno(ativ, campo, depois) {
    const acertou = campo === "acerto";
    const texto = ativ.feedback[campo];
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
    Promise.all([som.falarFeedback(ativ.id, campo, texto), som.espera(MINIMO)]).then(() => {
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
    falarExtra("fim", "Muito bem! Você terminou.");
  }

  /* ─── painel do professor ────────────────────────────────────────────── */

  function montarPainel() {
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

  /* ─── revisão pedagógica ─────────────────────────────────────────────── */

  /* A revisão lê o banco completo por conta própria — não depende de o jogo estar
   * no piloto ou não. */
  async function abrirRevisao() {
    mostrar("tela-revisao");
    try {
      await revisao.montar({
        lista: $("rev-lista"),
        aviso: $("rev-aviso"),
        andamento: $("rev-andamento"),
        filtroEixo: $("rev-eixo"),
        soPendentes: $("rev-pendentes"),
        baixar: $("btn-rev-baixar"),
      });
    } catch (err) {
      $("rev-lista").replaceChildren();
      $("rev-lista").append(
        Object.assign(document.createElement("p"), {
          className: "vazio",
          textContent: `Não consegui carregar o banco completo: ${err.message}`,
        }));
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

    $("btn-revisao").addEventListener("click", () => abrirRevisao());
    $("btn-fechar-revisao").addEventListener("click", () => { montarPainel(); mostrar("tela-professor"); });

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

  /* Um atalho que abre uma SESSÃO (?id=, ?eixo=) é consumido: sai da barra de
   * endereço assim que abre. Sem isso a aba fica presa nele — recarregar caía de
   * novo na prévia de uma atividade só, que termina no primeiro acerto, e parecia
   * que o jogo tinha virado uma pergunta. O link continua funcionando ao ser
   * clicado; só não gruda. ?revisao NÃO é limpo: ali é uma tela onde se fica, e
   * recarregar deve devolver a mesma tela. */
  function consumirAtalho() {
    // Em `file://` a origem é "null" e alguns navegadores recusam mexer no
    // histórico. Não é motivo para derrubar o jogo: a URL só fica suja.
    try {
      history.replaceState(null, "", location.pathname);
    } catch {}
  }

  /** ?id=NE-001 abre direto uma atividade; ?eixo=cores abre direto um eixo.
   *  ?revisao abre a folha de parecer da coordenação.
   *  Serve para depurar um tipo de interação sem jogar até chegar nele, e para
   *  mostrar um item específico numa reunião de revisão. */
  async function atalhoDaURL() {
    const q = new URLSearchParams(location.search);
    const id = q.get("id");
    if (id) {
      // O jogo roda os 20 fixos, mas o atalho tem de alcançar as 120: é ele que a
      // tela de revisão usa no "▶ ver no jogo", e são justamente as outras 100 que
      // a coordenação precisa ver.
      let ativ = estado.banco.atividades.find((a) => a.id === id.toUpperCase());
      if (!ativ) {
        const completo = window.BANCO_COMPLETO;
        if (completo) {
          ativ = completo.atividades.find((a) => a.id === id.toUpperCase());
          // NÃO trocar estado.banco pelo completo: o atalho mostra UMA atividade,
          // mas o banco é o que a próxima sessão joga — trocá-lo fazia o "voltar ao
          // início" abrir uma sessão de 120. O índice de eixos que o chip precisa
          // já vem no piloto.json, então não falta nada aqui.
        }
      }
      if (!ativ) return false;
      estado.filtroEixo = null;
      estado.sessao = [ativ];
      estado.indice = 0;
      estado.resultados = [];
      mostrar("tela-jogo");
      renderAtividade();
      consumirAtalho();
      return true;
    }
    if (q.has("revisao")) { abrirRevisao(); return true; }
    const eixoId = q.get("eixo");
    if (eixoId) {
      const eixo = estado.banco.eixos.find((e) => e.id === eixoId);
      if (eixo) { iniciarSessao(eixo); consumirAtalho(); return true; }
    }
    return false;
  }

  (async function iniciar() {
    try {
      carregarBanco();
    } catch (err) {
      document.body.innerHTML =
        `<div style="padding:40px;font-family:system-ui;line-height:1.6">
           <h1>Não consegui carregar o banco de atividades</h1>
           <p><code>${err.message}</code></p>
           <p>O <code>index.html</code> carrega <code>dist/piloto.js</code> por
              <code>&lt;script&gt;</code>. Se esse arquivo não existir, gere com:</p>
           <pre>python3 ferramentas/validar.py --build</pre>
         </div>`;
      return;
    }
    ligarEventos();
    if (!(await atalhoDaURL())) return;
    som.liberarAudio();
  })();
})();
