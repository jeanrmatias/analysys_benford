/* parsers.js — converte arquivos e texto em listas de números.
   Depende de PapaParse (CSV) e SheetJS (XLSX), carregados via CDN. */

(function (global) {
  'use strict';

  var formato = 'br'; // 'br' = 1.234,56 | 'en' = 1,234.56

  function definirFormato(novo) { formato = novo === 'en' ? 'en' : 'br'; }
  function obterFormato() { return formato; }

  /**
   * Converte um valor bruto em número, respeitando o formato escolhido.
   * Formato brasileiro: ponto é milhar, vírgula é decimal.
   * Formato internacional: vírgula é milhar, ponto é decimal.
   * Se os dois aparecem, o último é tratado como decimal (regra mais segura).
   */
  function paraNumero(bruto) {
    if (bruto === null || bruto === undefined) return null;
    if (typeof bruto === 'number') return isFinite(bruto) ? bruto : null;

    var limpo = String(bruto).replace(/[^\d.,\-]/g, '').trim();
    if (!limpo || limpo === '-' || limpo === '.' || limpo === ',') return null;

    var temPonto = limpo.indexOf('.') > -1;
    var temVirgula = limpo.indexOf(',') > -1;

    if (temPonto && temVirgula) {
      if (limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.');
      } else {
        limpo = limpo.replace(/,/g, '');
      }
    } else if (temVirgula) {
      limpo = formato === 'br' ? limpo.replace(',', '.') : limpo.replace(/,/g, '');
    } else if (temPonto && formato === 'br') {
      limpo = limpo.replace(/\./g, ''); // ponto como separador de milhar
    }

    var numero = Number(limpo);
    return isFinite(numero) ? numero : null;
  }

  /** Converte um texto livre em lista de números. */
  function lerTexto(texto) {
    if (!texto) return [];

    var tokens = String(texto).split(/[\n\r\t;]+/);
    var expandidos = [];

    tokens.forEach(function (token) {
      var aparado = token.trim();
      if (!aparado) return;
      // "1,2,3,4,5" numa única linha: várias vírgulas sem ponto = lista
      if ((aparado.match(/,/g) || []).length >= 2 && aparado.indexOf('.') === -1) {
        expandidos = expandidos.concat(aparado.split(','));
      } else {
        expandidos.push(aparado);
      }
    });

    return expandidos.map(paraNumero).filter(function (n) { return n !== null; });
  }

  /** Transforma matriz de células em cabeçalho + linhas, detectando se há título. */
  function normalizar(linhasBrutas) {
    var linhas = linhasBrutas.filter(function (linha) {
      return Array.isArray(linha) && linha.some(function (celula) {
        return String(celula === null || celula === undefined ? '' : celula).trim() !== '';
      });
    });

    if (!linhas.length) return { cabecalho: [], linhas: [], colunas: 0 };

    var primeira = linhas[0];
    var primeiraTemNumero = primeira.some(function (celula) {
      return paraNumero(celula) !== null;
    });

    var cabecalho;
    var corpo;

    if (primeiraTemNumero) {
      corpo = linhas;
      cabecalho = primeira.map(function (_, i) { return 'Coluna ' + (i + 1); });
    } else {
      corpo = linhas.slice(1);
      cabecalho = primeira.map(function (celula, i) {
        var titulo = String(celula === null || celula === undefined ? '' : celula).trim();
        return titulo || 'Coluna ' + (i + 1);
      });
    }

    var colunas = linhas.reduce(function (maior, linha) {
      return Math.max(maior, linha.length);
    }, 0);

    return { cabecalho: cabecalho, linhas: corpo, colunas: colunas };
  }

  /** Extrai apenas os números válidos de uma coluna. */
  function extrairColuna(dados, indice) {
    var valores = [];
    dados.linhas.forEach(function (linha) {
      var numero = paraNumero(linha[indice]);
      if (numero !== null) valores.push(numero);
    });
    return valores;
  }

  function lerCSV(arquivo, callback) {
    if (!global.Papa) {
      callback(new Error('PapaParse não foi carregado. Verifique a conexão.'));
      return;
    }
    global.Papa.parse(arquivo, {
      skipEmptyLines: 'greedy',
      complete: function (resultado) {
        if (!resultado.data || !resultado.data.length) {
          callback(new Error('O arquivo está vazio.'));
          return;
        }
        callback(null, normalizar(resultado.data));
      },
      error: function (erro) { callback(erro); }
    });
  }

  function lerXLSX(arquivo, callback) {
    if (!global.XLSX) {
      callback(new Error('SheetJS não foi carregado. Verifique a conexão.'));
      return;
    }
    var leitor = new FileReader();
    leitor.onload = function (evento) {
      try {
        var pasta = global.XLSX.read(new Uint8Array(evento.target.result), { type: 'array' });
        var primeiraAba = pasta.Sheets[pasta.SheetNames[0]];
        var linhas = global.XLSX.utils.sheet_to_json(primeiraAba, {
          header: 1, blankrows: false, raw: true
        });
        callback(null, normalizar(linhas));
      } catch (erro) {
        callback(erro);
      }
    };
    leitor.onerror = function () { callback(new Error('Não foi possível ler o arquivo.')); };
    leitor.readAsArrayBuffer(arquivo);
  }

  /** Escolhe o leitor pela extensão do arquivo. */
  function lerArquivo(arquivo, callback) {
    var nome = (arquivo.name || '').toLowerCase();
    if (/\.(xlsx|xls)$/.test(nome)) return lerXLSX(arquivo, callback);
    return lerCSV(arquivo, callback);
  }

  global.Parsers = {
    definirFormato: definirFormato,
    obterFormato: obterFormato,
    paraNumero: paraNumero,
    lerTexto: lerTexto,
    lerArquivo: lerArquivo,
    extrairColuna: extrairColuna
  };
})(window);