import type { RSSFeedItem } from '@astrojs/rss';
import { rotuloDoCard } from '@/lib/card';
import { canonicalUrl, urlDoPost } from '@/lib/rotas';
import { ALTURA_OG, LARGURA_OG, ogImage } from '@/lib/sanity/imagem';
import type { CONSULTA_DO_FEED_RESULT } from '@/lib/sanity/tipos.gerados';
import { descricaoDoPost } from '@/lib/seo';

// O /rss.xml (#52): os últimos posts, com a capa no Media RSS. Política: docs/seo-urls.md#rss.

export const NAMESPACES_DO_FEED = {
  atom: 'http://www.w3.org/2005/Atom',
  media: 'http://search.yahoo.com/mrss/',
};

type PostDoFeed = CONSULTA_DO_FEED_RESULT[number];

const escaparXml = (texto: string) =>
  texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * O `<channel>` além do que o @astrojs/rss já monta: o idioma e o `atom:link` para o próprio feed,
 * que o W3C Feed Validator recomenda.
 */
export function dadosDoCanal(urlDoFeed: string): string {
  return [
    '<language>pt-br</language>',
    `<atom:link href="${escaparXml(urlDoFeed)}" rel="self" type="application/rss+xml"/>`,
  ].join('');
}

/**
 * Um `<item>`: título, description (a mesma do `<meta name="description">` do post), link
 * canônico, data, categorias (tipo, categoria ou formato e tags) e a capa como `media:content`,
 * no recorte 1200×630 do og:image. O `enclosure` pediria o tamanho do arquivo em bytes, que o
 * Sanity não informa sem baixar a imagem.
 */
export function itemDoFeed(post: PostDoFeed): RSSFeedItem {
  const capa = ogImage(post.capa);
  const alt = post.capa.alt?.trim();
  return {
    title: post.titulo,
    description: descricaoDoPost(post),
    link: canonicalUrl(urlDoPost(post)),
    pubDate: new Date(post.dataDePublicacao),
    categories: [...rotuloDoCard(post), ...(post.tags ?? []).map(({ nome }) => nome)],
    ...(capa && {
      customData:
        `<media:content url="${escaparXml(capa)}" medium="image" type="image/jpeg" width="${LARGURA_OG}" height="${ALTURA_OG}">` +
        (alt ? `<media:description>${escaparXml(alt)}</media:description>` : '') +
        '</media:content>',
    }),
  };
}
