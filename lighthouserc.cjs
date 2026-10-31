// Configuração do Lighthouse CI (#60), usada pelo workflow lighthouse. As URLs vêm do workflow;
// o orçamento de tamanho, do budget.json. Como funciona e como ler o resultado: docs/performance.md.
//
// Variáveis lidas:
// - LHCI_AMBIENTE: `preview` ou `producao`. No preview, Performance e Core Web Vitals só avisam
//   (o runner do Actions varia muito de uma execução para outra) e a auditoria `is-crawlable` sai,
//   porque todo preview tem `noindex`. Em produção, tudo é erro.
// - VERCEL_AUTOMATION_BYPASS_SECRET: o segredo da Protection Bypass for Automation, para passar
//   pela Vercel Authentication dos previews. Produção não precisa.
//
// É .cjs, e não JSON, para ler as variáveis; o package.json da raiz é ESM, daí a extensão.

const orcamento = require('./budget.json');

const preview = process.env.LHCI_AMBIENTE !== 'producao';
const nivel = preview ? 'warn' : 'error';
const segredo = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

// Mediana das 3 execuções, e não a melhor (o padrão do LHCI), para um resultado de sorte não
// esconder uma regressão.
const aggregationMethod = 'median-run';

// Páginas com noindex de propósito (docs/seo-urls.md#indexação): em produção, o `is-crawlable`
// reprova a página e derruba a nota de SEO para uns 66. Nelas, no lugar da nota, cada auditoria
// de SEO menos o `is-crawlable` tem de passar.
const NOINDEX = '/busca/?(?:[?#]|$)';
const AUDITORIAS_DE_SEO = [
  'document-title',
  'meta-description',
  'http-status-code',
  'link-text',
  'crawlable-anchors',
  'robots-txt',
  'image-alt',
  'hreflang',
  'canonical',
];

const categorias = {
  'categories:accessibility': ['error', { minScore: 0.95 }],
  'categories:best-practices': ['error', { minScore: 0.95 }],
  'categories:performance': [nivel, { minScore: 0.9 }],
  'largest-contentful-paint': [nivel, { maxNumericValue: 2500 }],
  'cumulative-layout-shift': [nivel, { maxNumericValue: 0.1 }],
  'total-blocking-time': [nivel, { maxNumericValue: 200 }],
};

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      // Sem `preset`: o padrão do Lighthouse é o celular (Moto G Power, 4G lento, CPU 4x mais lenta).
      settings: {
        skipAudits: preview ? ['is-crawlable'] : [],
        extraHeaders: segredo
          ? {
              'x-vercel-protection-bypass': segredo,
              // Sem a barra de ferramentas da Vercel, que só existe no preview e pesaria no JS.
              'x-vercel-skip-toolbar': '1',
            }
          : {},
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: `^(?!.*${NOINDEX})`,
          aggregationMethod,
          assertions: { ...categorias, 'categories:seo': ['error', { minScore: 0.95 }] },
        },
        {
          matchingUrlPattern: NOINDEX,
          aggregationMethod,
          assertions: {
            ...categorias,
            ...Object.fromEntries(AUDITORIAS_DE_SEO.map((id) => [id, ['error', { minScore: 1 }]])),
          },
        },
        // O Lighthouse 12 tirou os budgets.json nativos; cada linha do budget.json vira uma
        // asserção do resource-summary (tamanho transferido, com gzip, em bytes).
        ...orcamento.map(({ paginas, recurso, kb }) => ({
          matchingUrlPattern: paginas,
          aggregationMethod,
          assertions: {
            [`resource-summary:${recurso}:size`]: ['error', { maxNumericValue: kb * 1024 }],
          },
        })),
      ],
    },
  },
};
