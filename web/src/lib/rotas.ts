import { URL_DO_SITE } from '@/lib/utils/site';

// Única fonte de URLs do site (docs/seo-urls.md#helpers-de-rota). A #33 (WEB-03) completa com
// urlDoPost, urlDoFormato, urlDaTag, urlDaPagina e os testes deles.

const FORMATO_DO_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validarSlug(slug: string, onde: string): void {
  if (!FORMATO_DO_SLUG.test(slug)) {
    throw new Error(`Slug inválido em ${onde}: "${slug}" (veja docs/seo-urls.md#formato).`);
  }
}

export function urlDaCategoria(slug: string): string {
  validarSlug(slug, 'urlDaCategoria');
  return `/reviews/${slug}`;
}

// URL absoluta e canônica de um caminho, com a origem da SITE_URL. Sem query string nem fragmento,
// sem `index.html`/`.html` e sem barra no final (menos na home): `/sobre/`, `/sobre/index.html` e
// `/sobre` dão o mesmo resultado.
export function canonicalUrl(path: string): string {
  // `//outro.site/x` também é uma URL absoluta (sem protocolo).
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`canonicalUrl recebe um caminho começando com "/", não "${path}".`);
  }
  const { origin, pathname } = new URL(path, URL_DO_SITE);
  const caminho = pathname.replace(/(?:\/index)?\.html$/, '').replace(/\/+$/, '');
  return `${origin}${caminho || '/'}`;
}
