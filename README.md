# Lei de Newcomb-Benford - análise comparativa de 3 bases

Página web estática que carrega até três bases de dados, aplica a lei de
Newcomb-Benford sobre o primeiro dígito e compara os resultados.

## Como executar

1. Baixe a pasta do projeto.
2. Abra `index.html` com dois cliques no navegador.

Não há etapa de build nem instalação. As bibliotecas (PapaParse, SheetJS e
Chart.js) são carregadas por CDN, então a primeira abertura precisa de internet.

Se preferir servir por HTTP (recomendado para testar upload de arquivos grandes),
use a extensão **Live Server** do VS Code ou rode `npx serve .` na pasta.

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| `js/benford.js` | Matemática: primeiro dígito, contagens, MAD, qui-quadrado |
| `js/parsers.js` | Conversão de CSV, XLSX e texto em listas de números |
| `js/random.js` | Geradores de amostras aleatórias |
| `js/charts.js` | Gráficos com Chart.js |
| `js/ui.js` | Estado, eventos e renderização |
| `js/app.js` | Bootstrap |

## Como usar

1. Em cada base, escolha a origem: **Upload**, **Colar ou digitar** ou **Aleatório**.
2. Preencha o nome e a fonte (o campo de URL virá como link na tabela final).
3. No upload, selecione a coluna que contém os números.
4. O gráfico e as métricas aparecem automaticamente; o comparativo fica no fim da página.

## Formato numérico

O seletor no topo controla a leitura:

- **Brasileiro** - ponto é milhar, vírgula é decimal (`1.234,56`).
- **Internacional** - vírgula é milhar, ponto é decimal (`1,234.56`).

Atenção: no modo brasileiro, `0.045` é lido como 45. Planilhas reais entregam
números já tipados e não passam por essa conversão.

## Testes rápidos

- Gere uma amostra **uniforme** e depois uma **log-uniforme** na mesma base:
  a segunda adere à lei, a primeira não.
- Compare `log10(1 + 1/1)` (0,30103) com a saída de uma amostra Benford pura.