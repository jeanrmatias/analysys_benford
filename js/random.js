/* random.js — geradores de amostras para comparar com a lei de Benford.
   Todas as funções recebem quantidade e faixa [min, max] e devolvem um array. */

(function (global) {
  'use strict';

  /** Reais uniformes. NÃO segue Benford: todos os dígitos ficam parecidos. */
  function uniformes(quantidade, min, max) {
    var valores = [];
    for (var i = 0; i < quantidade; i++) {
      valores.push(min + Math.random() * (max - min));
    }
    return valores;
  }

  /** Inteiros uniformes. NÃO segue Benford, pelo mesmo motivo. */
  function inteiros(quantidade, min, max) {
    var valores = [];
    for (var i = 0; i < quantidade; i++) {
      valores.push(Math.floor(min + Math.random() * (max - min + 1)));
    }
    return valores;
  }

  /**
   * Distribuição log-uniforme: o expoente é uniforme, o valor é 10^expoente.
   * Percorre várias ordens de grandeza e por isso SEGUE Benford.
   */
  function logUniformes(quantidade, min, max) {
    var inicio = Math.log10(min);
    var fim = Math.log10(max);
    var valores = [];
    for (var i = 0; i < quantidade; i++) {
      valores.push(Math.pow(10, inicio + Math.random() * (fim - inicio)));
    }
    return valores;
  }

  /**
   * Benford puro: sorteia o primeiro dígito com a probabilidade da lei
   * e monta um número com esse dígito dentro da faixa pedida.
   * Serve como controle: a adesão é garantida por construção.
   */
  function benfordPuro(quantidade, min, max) {
    var acumulado = [];
    var soma = 0;
    for (var d = 1; d <= 9; d++) {
      soma += Math.log10(1 + 1 / d);
      acumulado.push(soma);
    }

    var valores = [];
    var tentativas = 0;
    var limiteTentativas = quantidade * 20;

    while (valores.length < quantidade && tentativas < limiteTentativas) {
      tentativas++;

      var sorteio = Math.random();
      var digito = 9;
      for (var k = 0; k < acumulado.length; k++) {
        if (sorteio <= acumulado[k]) { digito = k + 1; break; }
      }

      var mantissa = digito + Math.random();          // sempre em [d, d+1)
      var expoenteMin = Math.ceil(Math.log10(min / mantissa));
      var expoenteMax = Math.floor(Math.log10(max / mantissa));
      if (expoenteMax < expoenteMin) continue;

      var expoente = expoenteMin +
        Math.floor(Math.random() * (expoenteMax - expoenteMin + 1));

      valores.push(mantissa * Math.pow(10, expoente));
    }

    return valores;
  }

  global.Random = {
    uniformes: uniformes,
    inteiros: inteiros,
    logUniformes: logUniformes,
    benfordPuro: benfordPuro
  };
})(window);