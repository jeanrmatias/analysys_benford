/* charts.js — desenho dos gráficos com Chart.js.
   Cada instância fica guardada no próprio canvas para poder ser destruída
   antes de um novo desenho (evita sobreposição de gráficos). */

(function (global) {
  'use strict';

  var CORES_BASES = ['#2563eb', '#16a34a', '#d97706'];
  var COR_ESPERADO = '#dc2626';

  function destruir(canvas) {
    if (canvas && canvas._grafico) {
      canvas._grafico.destroy();
      canvas._grafico = null;
    }
  }

  function emPorcentagem(fracao) {
    return Number((fracao * 100).toFixed(2));
  }

  /** Gráfico de uma base: barras observadas + linha do esperado. */
  function desenharBase(canvas, analise, cor) {
    if (!canvas) return;
    destruir(canvas);
    if (!analise || analise.vazio) return;

    canvas._grafico = new global.Chart(canvas, {
      type: 'bar',
      data: {
        labels: global.Benford.DIGITOS.map(String),
        datasets: [
          {
            label: 'Observado (%)',
            data: analise.observado.map(emPorcentagem),
            backgroundColor: cor,
            borderRadius: 4
          },
          {
            type: 'line',
            label: 'Esperado Benford (%)',
            data: analise.esperado.map(emPorcentagem),
            borderColor: COR_ESPERADO,
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: '% dos números', font: { size: 11 } },
            ticks: { font: { size: 10 } }
          },
          x: {
            title: { display: true, text: 'Primeiro dígito', font: { size: 11 } },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }

  /** Gráfico comparativo: uma série de barras por base + linha do esperado. */
  function desenharComparativo(canvas, bases) {
    if (!canvas) return;
    destruir(canvas);

    var comDados = bases.filter(function (base) {
      return base.analise && !base.analise.vazio;
    });
    if (!comDados.length) return;

    var conjuntos = comDados.map(function (base, i) {
      return {
        label: base.nome || 'Base ' + (base.indice + 1),
        data: base.analise.observado.map(emPorcentagem),
        backgroundColor: CORES_BASES[i % CORES_BASES.length],
        borderRadius: 3
      };
    });

    conjuntos.push({
      type: 'line',
      label: 'Esperado Benford (%)',
      data: global.Benford.ESPERADO.map(emPorcentagem),
      borderColor: COR_ESPERADO,
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 4,
      fill: false
    });

    canvas._grafico = new global.Chart(canvas, {
      type: 'bar',
      data: { labels: global.Benford.DIGITOS.map(String), datasets: conjuntos },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { boxWidth: 12, font: { size: 12 } } } },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: '% dos números' },
            ticks: { font: { size: 11 } }
          },
          x: {
            title: { display: true, text: 'Primeiro dígito' },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }

  global.Charts = {
    desenharBase: desenharBase,
    desenharComparativo: desenharComparativo,
    destruir: destruir,
    CORES_BASES: CORES_BASES
  };
})(window);