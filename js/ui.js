/* ui.js — estado das três bases, eventos e renderização.
   Este é o único módulo que conhece o HTML. */

(function (global) {
  'use strict';

  var CHAVE_STORAGE = 'benford.bases.v1';
  var LIMITE_PERSISTENCIA = 10000; // valores salvos por base no localStorage
  var FAIXA_MIN = 1;
  var FAIXA_MAX = 1000000;

  var estado = { bases: [] };

  /* ---------- Utilidades ---------- */

  function campo(cartao, nome) {
    return cartao.querySelector('[data-campo="' + nome + '"]');
  }

  function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatarInteiro(n) {
    return Number(n).toLocaleString('pt-BR');
  }

  function formatarDecimal(n) {
    return Number(n).toLocaleString('pt-BR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  }

  function veredito(analise) {
    if (analise.madClasse.nivel === 'alerta' || analise.chiClasse.nivel === 'alerta') {
      return { texto: 'Divergente', nivel: 'alerta' };
    }
    if (analise.madClasse.nivel === 'atencao' || analise.chiClasse.nivel === 'atencao') {
      return { texto: 'Atenção', nivel: 'atencao' };
    }
    return { texto: 'Compatível', nivel: 'ok' };
  }

  /* ---------- Persistência ---------- */

  function salvar() {
    try {
      var dados = estado.bases.map(function (base) {
        return {
          nome: base.nome,
          fonte: base.fonte,
          urlFonte: base.urlFonte,
          valores: base.valores.slice(0, LIMITE_PERSISTENCIA)
        };
      });
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
    } catch (e) {
      /* armazenamento cheio ou indisponível: a página segue funcionando */
    }
  }

  function carregar() {
    try {
      var bruto = localStorage.getItem(CHAVE_STORAGE);
      if (!bruto) return;
      var dados = JSON.parse(bruto);
      if (!Array.isArray(dados)) return;
      dados.forEach(function (item, i) {
        if (!estado.bases[i]) return;
        estado.bases[i].nome = item.nome || estado.bases[i].nome;
        estado.bases[i].fonte = item.fonte || '';
        estado.bases[i].urlFonte = item.urlFonte || '';
        estado.bases[i].valores = Array.isArray(item.valores) ? item.valores : [];
      });
    } catch (e) {
      /* JSON corrompido: ignora */
    }
  }

  /* ---------- Construção dos cartões ---------- */

  function criarCartoes() {
    var container = document.getElementById('bases');
    var modelo = document.getElementById('modelo-base');
    container.innerHTML = '';

    estado.bases.forEach(function (base) {
      var fragmento = modelo.content.cloneNode(true);
      var cartao = fragmento.querySelector('.card');

      cartao.dataset.indice = base.indice;
      cartao.querySelector('.card-numero').textContent = base.indice + 1;
      container.appendChild(fragmento);

      campo(cartao, 'nome').value = base.nome;
      campo(cartao, 'fonte').value = base.fonte;
      campo(cartao, 'url').value = base.urlFonte;

      ligarEventos(cartao, base);
    });
  }

  function ligarEventos(cartao, base) {
    campo(cartao, 'nome').addEventListener('input', function (e) {
      base.nome = e.target.value;
      salvar();
      renderizarResumo();
    });

    campo(cartao, 'fonte').addEventListener('input', function (e) {
      base.fonte = e.target.value;
      salvar();
      renderizarResumo();
    });

    campo(cartao, 'url').addEventListener('input', function (e) {
      base.urlFonte = e.target.value;
      salvar();
    });

    // Troca de aba
    cartao.querySelectorAll('.aba').forEach(function (botao) {
      botao.addEventListener('click', function () {
        cartao.querySelectorAll('.aba').forEach(function (b) {
          b.classList.remove('ativa');
        });
        botao.classList.add('ativa');

        cartao.querySelectorAll('.painel').forEach(function (painel) {
          painel.classList.toggle('escondido', painel.dataset.painel !== botao.dataset.aba);
        });
      });
    });

    // Upload de arquivo
    campo(cartao, 'arquivo').addEventListener('change', function (e) {
      var arquivo = e.target.files[0];
      if (!arquivo) return;

      Parsers.lerArquivo(arquivo, function (erro, dados) {
        if (erro) {
          alert('Não foi possível ler o arquivo: ' + erro.message);
          return;
        }
        base.dadosArquivo = dados;
        prepararColunas(cartao, base);
      });
    });

    // Escolha da coluna
    campo(cartao, 'coluna').addEventListener('change', function (e) {
      if (!base.dadosArquivo) return;
      var indice = Number(e.target.value);
      var valores = Parsers.extrairColuna(base.dadosArquivo, indice);
      aplicarValores(cartao, base, valores, base.dadosArquivo.linhas.length);
    });

    // Texto colado ou digitado
    cartao.querySelector('[data-acao="aplicar-texto"]').addEventListener('click', function () {
      var valores = Parsers.lerTexto(campo(cartao, 'texto').value);
      aplicarValores(cartao, base, valores);
    });

    // Amostra aleatória
    cartao.querySelector('[data-acao="gerar"]').addEventListener('click', function () {
      gerarAmostra(cartao, base);
    });

    // Limpar base
    cartao.querySelector('[data-acao="limpar"]').addEventListener('click', function () {
      base.valores = [];
      base.analise = null;
      base.dadosArquivo = null;
      campo(cartao, 'texto').value = '';
      campo(cartao, 'arquivo').value = '';
      campo(cartao, 'coluna-wrap').classList.add('escondido');
      Charts.destruir(campo(cartao, 'grafico'));
      renderizarMetricas(cartao, base);
      salvar();
      renderizarResumo();
    });
  }

  /* ---------- Fluxo de dados ---------- */

  function prepararColunas(cartao, base) {
    var select = campo(cartao, 'coluna');
    var dados = base.dadosArquivo;

    select.innerHTML = '';
    dados.cabecalho.forEach(function (titulo, i) {
      var opcao = document.createElement('option');
      opcao.value = String(i);
      opcao.textContent = titulo;
      select.appendChild(opcao);
    });

    campo(cartao, 'coluna-wrap').classList.remove('escondido');
    campo(cartao, 'info-arquivo').textContent =
      dados.linhas.length + ' linhas lidas · ' + dados.colunas + ' colunas';

    // Escolhe a primeira coluna que tenha números suficientes
    var escolhida = 0;
    for (var i = 0; i < dados.cabecalho.length; i++) {
      var amostra = Parsers.extrairColuna(dados, i).slice(0, 30);
      if (amostra.length >= 5) { escolhida = i; break; }
    }

    select.value = String(escolhida);
    aplicarValores(cartao, base,
      Parsers.extrairColuna(dados, escolhida), dados.linhas.length);
  }

  function aplicarValores(cartao, base, valores, linhasLidas) {
    base.valores = valores;
    base.analise = Benford.analisar(valores);
    base.analise.linhasLidas =
      typeof linhasLidas === 'number' ? linhasLidas : valores.length;

    renderizarMetricas(cartao, base);
    Charts.desenharBase(
      campo(cartao, 'grafico'),
      base.analise,
      Charts.CORES_BASES[base.indice % Charts.CORES_BASES.length]
    );
    salvar();
    renderizarResumo();
  }

  function gerarAmostra(cartao, base) {
    var tipo = campo(cartao, 'tipo-aleatorio').value;
    var quantidade = parseInt(campo(cartao, 'qtd').value, 10) || 1000;
    quantidade = Math.min(Math.max(quantidade, 10), 200000);

    var valores;
    if (tipo === 'uniforme') valores = Random.uniformes(quantidade, FAIXA_MIN, FAIXA_MAX);
    else if (tipo === 'inteiro') valores = Random.inteiros(quantidade, FAIXA_MIN, FAIXA_MAX);
    else if (tipo === 'loguniforme') valores = Random.logUniformes(quantidade, FAIXA_MIN, FAIXA_MAX);
    else valores = Random.benfordPuro(quantidade, FAIXA_MIN, FAIXA_MAX);

    aplicarValores(cartao, base, valores);

    // Nomeia automaticamente se o usuário não tiver escolhido um nome
    if (!base.nome || /^Base \d+$/.test(base.nome)) {
      var rotulos = {
        uniforme: 'Aleatório uniforme',
        inteiro: 'Aleatório inteiro',
        loguniforme: 'Aleatório log-uniforme',
        benford: 'Aleatório Benford puro'
      };
      base.nome = rotulos[tipo];
      campo(cartao, 'nome').value = base.nome;
      salvar();
      renderizarResumo();
    }
  }

  /* ---------- Renderização ---------- */

  function renderizarMetricas(cartao, base) {
    var alvo = campo(cartao, 'metricas');
    var analise = base.analise;

    if (!analise || analise.vazio) {
      alvo.innerHTML = '<p class="vazio">Nenhum número válido carregado.</p>';
      return;
    }

    var ignorados = Math.max(0, analise.linhasLidas - analise.validos);

    alvo.innerHTML =
      '<div class="metrica">' +
        '<span class="rotulo">Amostra</span>' +
        '<span class="valor">' + formatarInteiro(analise.validos) + '</span>' +
        (ignorados > 0 ? '<span class="vazio">' + formatarInteiro(ignorados) + ' ignorados</span>' : '') +
      '</div>' +
      '<div class="metrica">' +
        '<span class="rotulo">MAD</span>' +
        '<span class="valor">' + formatarDecimal(analise.mad) + '</span>' +
        '<span class="selo ' + analise.madClasse.nivel + '">' + analise.madClasse.rotulo + '</span>' +
      '</div>' +
      '<div class="metrica">' +
        '<span class="rotulo">Qui-quadrado</span>' +
        '<span class="valor">' + formatarDecimal(analise.chi2) + '</span>' +
        '<span class="selo ' + analise.chiClasse.nivel + '">' + analise.chiClasse.rotulo + '</span>' +
      '</div>';
  }

  function renderizarResumo() {
    var comDados = estado.bases.filter(function (base) {
      return base.analise && !base.analise.vazio;
    });

    Charts.desenharComparativo(
      document.getElementById('grafico-comparativo'),
      comDados
    );

    var corpo = document.querySelector('#tabela-resumo tbody');

    if (!comDados.length) {
      corpo.innerHTML =
        '<tr><td colspan="6" class="vazio">Nenhuma base carregada ainda.</td></tr>';
      return;
    }

    corpo.innerHTML = comDados.map(function (base) {
      var analise = base.analise;
      var julgamento = veredito(analise);

      var fonte = base.fonte ? escapar(base.fonte) : '—';
      if (base.fonte && base.urlFonte) {
        fonte = '<a href="' + escapar(base.urlFonte) +
          '" target="_blank" rel="noopener noreferrer">' + escapar(base.fonte) + '</a>';
      }

      return '<tr>' +
        '<td><strong>' + escapar(base.nome) + '</strong></td>' +
        '<td>' + fonte + '</td>' +
        '<td class="num">' + formatarInteiro(analise.validos) + '</td>' +
        '<td class="num">' + formatarDecimal(analise.mad) + '</td>' +
        '<td class="num">' + formatarDecimal(analise.chi2) + '</td>' +
        '<td><span class="selo ' + julgamento.nivel + '">' + julgamento.texto + '</span></td>' +
      '</tr>';
    }).join('');
  }

  /* ---------- Inicialização ---------- */

  function limparTudo() {
    if (!confirm('Apagar os dados das três bases?')) return;
    estado.bases = [0, 1, 2].map(criarBase);
    try { localStorage.removeItem(CHAVE_STORAGE); } catch (e) { /* ignora */ }
    criarCartoes();
    estado.bases.forEach(function (base) {
      var cartao = document.querySelector('.card[data-indice="' + base.indice + '"]');
      renderizarMetricas(cartao, base);
    });
    renderizarResumo();
  }

  function criarBase(indice) {
    return {
      indice: indice,
      nome: 'Base ' + (indice + 1),
      fonte: '',
      urlFonte: '',
      valores: [],
      analise: null,
      dadosArquivo: null
    };
  }

  function iniciar() {
    estado.bases = [0, 1, 2].map(criarBase);

    carregar();
    criarCartoes();

    document.getElementById('formato').addEventListener('change', function (e) {
      Parsers.definirFormato(e.target.value);
    });

    document.getElementById('btn-limpar-tudo').addEventListener('click', limparTudo);

    // Recalcula o que veio do localStorage
    estado.bases.forEach(function (base) {
      var cartao = document.querySelector('.card[data-indice="' + base.indice + '"]');
      if (base.valores.length) {
        aplicarValores(cartao, base, base.valores);
      } else {
        renderizarMetricas(cartao, base);
      }
    });

    renderizarResumo();
  }

  global.UI = { iniciar: iniciar };
})(window);