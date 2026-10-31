// @ts-check
// Sitemap do site (#52), com o @astrojs/sitemap. Os caminhos saem dos helpers de rota (rotas.ts),
// que dependem do astro:env e não rodam no astro.config.mjs. Por isso o lastmod e a lista de páginas
// noindex vêm do /sitemap-dados.json, que o build gera a partir de src/lib/sitemap.ts. A integração `ronrom:sitemap-dados` vem antes do sitemap na lista: lê o
// arquivo, o apaga (ele não vai para o deploy) e guarda os dados para o `filter` e o `serialize`.
// Política: docs/seo-urls.md#sitemap.
import sitemap from '@astrojs/sitemap';
import { readFileSync, rmSync } from 'node:fs';

// O nome do endpoint src/pages/sitemap-dados.json.ts.
const ARQUIVO_DOS_DADOS = 'sitemap-dados.json';

// Fora do sitemap, além das páginas noindex: a busca, a 404, as rotas da API e qualquer arquivo
// (rss.xml, robots.txt, o próprio sitemap-dados.json).
const FORA_DO_SITEMAP = [/^\/busca$/, /^\/404$/, /^\/api(?:\/|$)/, /\.[a-z0-9]+$/i];

/** Caminho de uma URL do sitemap, sem barra no final (menos na home). */
function caminhoDaUrl(/** @type {string} */ url) {
  return new URL(url).pathname.replace(/\/+$/, '') || '/';
}

/** @returns {import('astro').AstroIntegration[]} */
export function sitemapDoSite() {
  /** @type {{ lastmod: Record<string, string>; noindex: string[] } | undefined} */
  let dados;

  const carregados = () => {
    if (!dados) throw new Error(`[sitemap] ${ARQUIVO_DOS_DADOS} não foi lido no build.`);
    return dados;
  };

  return [
    {
      name: 'ronrom:sitemap-dados',
      hooks: {
        'astro:build:done': ({ dir }) => {
          // Sem o arquivo, o build quebra aqui: sitemap sem lastmod não chega a produção.
          const arquivo = new URL(ARQUIVO_DOS_DADOS, dir);
          dados = JSON.parse(readFileSync(arquivo, 'utf-8'));
          rmSync(arquivo);
        },
      },
    },
    sitemap({
      // Só <loc> e <lastmod>: sem os namespaces de notícia, imagem, vídeo e idiomas.
      namespaces: { news: false, image: false, video: false, xhtml: false },
      filter: (url) => {
        const caminho = caminhoDaUrl(url);
        return (
          !FORA_DO_SITEMAP.some((padrao) => padrao.test(caminho)) &&
          !carregados().noindex.includes(caminho)
        );
      },
      serialize: (item) => {
        const caminho = caminhoDaUrl(item.url);
        const lastmod = carregados().lastmod[caminho];
        if (!lastmod) {
          // Página nova fora do mapa: entra no sitemap, mas sem lastmod.
          console.warn(`[sitemap] ${caminho} sem lastmod: inclua a página em src/lib/sitemap.ts.`);
          return item;
        }
        return { ...item, lastmod };
      },
    }),
  ];
}
