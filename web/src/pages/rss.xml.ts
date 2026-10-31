import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { dadosDoCanal, itemDoFeed, NAMESPACES_DO_FEED } from '@/lib/feed';
import { canonicalUrl } from '@/lib/rotas';
import { buscarFeed } from '@/lib/sanity/conteudo';
import { DESCRICAO_DO_SITE, NOME_DO_SITE, URL_DO_SITE } from '@/lib/utils/site';

// Feed RSS 2.0 dos últimos posts (#52), anunciado pelo <link rel="alternate"> do <Seo>.
export const GET: APIRoute = async () => {
  const posts = await buscarFeed();
  return rss({
    title: NOME_DO_SITE,
    description: DESCRICAO_DO_SITE,
    site: URL_DO_SITE,
    xmlns: NAMESPACES_DO_FEED,
    customData: dadosDoCanal(canonicalUrl('/rss.xml')),
    items: posts.map(itemDoFeed),
    // Os links já saem do canonicalUrl, sem barra no final (docs/seo-urls.md).
    trailingSlash: false,
  });
};
