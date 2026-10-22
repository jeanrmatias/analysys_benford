/* benford.js — toda a matemática da lei de Newcomb-Benford.
   Não depende de DOM nem de bibliotecas: pode ser testado isoladamente. */

(function (global) {
  'use strict';

  var DIGITOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  /* Probabilidade esperada de cada primeiro dígito: P(d) = log10(1 + 1/d).
     Resulta em ~30,1% para o 1 e ~4,6% para o 9. */
  var ESPERADO = DIGITOS.map(function (d) {
    return Math.log10(1 + 1 / d);
  });

  /* Limiares de MAD para o primeiro dígito (Nigrini, 2012). */
  var LIMIARES_MAD = [
    { limite: 0.006, rotulo: 'Conformidade próxima', nivel: 'ok' },
    { limite: 0.012, rotulo: 'Conformidade aceitável', nivel: 'ok' },
    { limite: 0.015, rotulo: 'Conformidade marginal', nivel: 'atencao' },
    { limite: Infinity, rotulo: 'Não conformidade', nivel: 'alerta' }
  ];

  /* Valores críticos de qui-quadrado com 8 graus de liberdade. */
  var CHI2_5 = 15.507;
  var CHI2_1 = 20.090;

  /**
   * Extrai o primeiro dígito significativo (1 a 9).
   * Ignora sinal, zeros à esquerda e zeros decimais.
   * Retorna null quando não há dígito significativo (zero puro ou não numérico).
   */
  function primeiroDigito(valor) {
    if (valor === null || valor === undefined) return null;

    if (typeof valor === 'number') {
      if (!isFinite(valor) || valor === 0) return null;
      // toExponential() sempre começa com o primeiro dígito significativo
      return Number(Math.abs(valor).toExponential()[0]);
    }

    var texto = String(valor).trim();
    if (!texto) return null;

    // match(/[1-9]/) resolve sinal negativo, zeros à esquerda e "0,045" de uma vez
    var achado = texto.match(/[1-9]/);
    return achado ? Number(achado[0]) : null;
  }

  /** Conta quantos números começam com cada dígito. */
  function contarDigitos(valores) {
    var contagem = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var validos = 0;

    for (var i = 0; i < valores.length; i++) {
      var digito = primeiroDigito(valores[i]);
      if (digito === null) continue;
      contagem[digito - 1]++;
      validos++;
    }

    return { contagem: contagem, validos: validos };
  }

  /** Converte contagem absoluta em frequência relativa. */
  function paraFrequencia(contagem, total) {
    return contagem.map(function (c) {
      return total > 0 ? c / total : 0;
    });
  }

  /** MAD = média das diferenças absolutas entre observado e esperado. */
  function calcularMAD(observado, esperado) {
    var soma = 0;
    for (var i = 0; i < 9; i++) {
      soma += Math.abs(observado[i] - esperado[i]);
    }
    return soma / 9;
  }

  /** Qui-quadrado: compara contagem observada com a esperada sob a lei. */
  function calcularChi2(contagem, total, esperado) {
    var soma = 0;
    for (var i = 0; i < 9; i++) {
      var esperadoAbsoluto = esperado[i] * total;
      var diferenca = contagem[i] - esperadoAbsoluto;
      soma += (diferenca * diferenca) / esperadoAbsoluto;
    }
    return soma;
  }

  function classificarMAD(valor) {
    for (var i = 0; i < LIMIARES_MAD.length; i++) {
      if (valor < LIMIARES_MAD[i].limite) return LIMIARES_MAD[i];
    }
    return LIMIARES_MAD[LIMIARES_MAD.length - 1];
  }

  function classificarChi2(valor) {
    if (valor < CHI2_5) return { rotulo: 'Compatível (5%)', nivel: 'ok' };
    if (valor < CHI2_1) return { rotulo: 'Divergente (5%)', nivel: 'atencao' };
    return { rotulo: 'Divergente (1%)', nivel: 'alerta' };
  }

  /** Analisa uma lista de números e devolve tudo o que a interface precisa. */
  function analisar(valores) {
    var resultado = contarDigitos(valores || []);
    var observado = paraFrequencia(resultado.contagem, resultado.validos);

    if (resultado.validos === 0) {
      return {
        vazio: true,
        validos: 0,
        linhasLidas: 0,
        contagem: resultado.contagem,
        observado: observado,
        esperado: ESPERADO.slice(),
        mad: null,
        chi2: null,
        madClasse: null,
        chiClasse: null
      };
    }

    var mad = calcularMAD(observado, ESPERADO);
    var chi2 = calcularChi2(resultado.contagem, resultado.validos, ESPERADO);

    return {
      vazio: false,
      validos: resultado.validos,
      linhasLidas: resultado.validos,
      contagem: resultado.contagem,
      observado: observado,
      esperado: ESPERADO.slice(),
      mad: mad,
      chi2: chi2,
      madClasse: classificarMAD(mad),
      chiClasse: classificarChi2(chi2)
    };
  }

  global.Benford = {
    DIGITOS: DIGITOS,
    ESPERADO: ESPERADO,
    CHI2_5: CHI2_5,
    CHI2_1: CHI2_1,
    primeiroDigito: primeiroDigito,
    contarDigitos: contarDigitos,
    analisar: analisar
  };
})(window);