// Única fonte de URLs do site (docs/seo-urls.md#helpers-de-rota). A #33 (WEB-03) completa com
// urlDoPost, urlDoFormato, urlDaTag, urlDaPagina, canonicalUrl e os testes.

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
