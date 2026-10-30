import { URL_DO_SITE } from '@/lib/utils/site';

// Única fonte de URLs do site (docs/seo-urls.md#helpers-de-rota). Páginas, componentes, sitemap,
// RSS, JSON-LD e o índice de posts montam caminhos só por aqui. Os helpers devolvem caminhos
// relativos à raiz, sem barra no final; só o `canonicalUrl` devolve URL absoluta.

const FORMATO_DO_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// `/reviews/pagina/2` tem de ser sempre a página 2 das reviews (docs/seo-urls.md#slugs-reservados).
const SLUGS_RESERVADOS = new Set(['pagina']);

// Base de uma listagem paginada: um ou mais segmentos, sem barra no final. A home não é paginada.
const FORMATO_DA_BASE = /^(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

/**
 * O que o `urlDoPost` precisa de um post. É o formato que as consultas GROQ devolvem (`tipo`,
 * `slug`, `categoria.slug`, `formato.slug`), com tudo opcional: o typegen não sabe que review
 * sempre tem categoria e pensamento sempre tem formato, então quem confere é o próprio helper.
 */
export interface PostComRota {
  tipo: 'review' | 'pensamento';
  slug?: string | null | undefined;
  categoria?: { slug?: string | null | undefined } | null | undefined;
  formato?: { slug?: string | null | undefined } | null | undefined;
}

// Slug ausente ou fora do formato derruba o build: link quebrado não chega a produção.
function validarSlug(slug: string | null | undefined, onde: string): string {
  if (!slug || !FORMATO_DO_SLUG.test(slug) || SLUGS_RESERVADOS.has(slug)) {
    throw new Error(`Slug inválido em ${onde}: "${slug}" (veja docs/seo-urls.md#formato).`);
  }
  return slug;
}

/** `/reviews/{categoria}/{slug}` ou `/pensamentos/{formato}/{slug}`. */
export function urlDoPost(post: PostComRota): string {
  const slug = validarSlug(post.slug, 'urlDoPost');
  switch (post.tipo) {
    case 'review':
      return `${urlDaCategoria(validarSlug(post.categoria?.slug, `urlDoPost (categoria de "${slug}")`))}/${slug}`;
    case 'pensamento':
      return `${urlDoFormato(validarSlug(post.formato?.slug, `urlDoPost (formato de "${slug}")`))}/${slug}`;
    default:
      throw new Error(`Tipo de post inválido em urlDoPost: "${String(post.tipo)}".`);
  }
}

/** `/reviews/{slug}` */
export function urlDaCategoria(slug: string): string {
  return `/reviews/${validarSlug(slug, 'urlDaCategoria')}`;
}

/** `/pensamentos/{slug}` */
export function urlDoFormato(slug: string): string {
  return `/pensamentos/${validarSlug(slug, 'urlDoFormato')}`;
}

/** `/tags/{slug}` */
export function urlDaTag(slug: string): string {
  return `/tags/${validarSlug(slug, 'urlDaTag')}`;
}

/** Página `n` de uma listagem: a própria `base` na página 1 e `{base}/pagina/{n}` da 2 em diante. */
export function urlDaPagina(base: string, n: number): string {
  if (!FORMATO_DA_BASE.test(base)) {
    throw new Error(`Base de listagem inválida em urlDaPagina: "${base}".`);
  }
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Página inválida em urlDaPagina: ${n} (precisa ser inteiro a partir de 1).`);
  }
  return n === 1 ? base : `${base}/pagina/${n}`;
}

/**
 * URL absoluta e canônica de um caminho, com a origem da `SITE_URL`. Tira query string,
 * `#fragmento`, `index.html`/`.html` e a barra final (menos na home), então `/sobre/`,
 * `/sobre/index.html` e `/sobre` dão o mesmo resultado.
 */
export function canonicalUrl(path: string): string {
  // `//outro.site/x` também é URL absoluta (sem protocolo): a origem vem sempre da SITE_URL.
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`canonicalUrl recebe um caminho começando com "/", não "${path}".`);
  }
  const caminho =
    (path.split(/[?#]/, 1)[0] ?? '').replace(/(?:\/index)?\.html$/, '').replace(/\/+$/, '') || '/';
  return new URL(caminho, URL_DO_SITE).href;
}
