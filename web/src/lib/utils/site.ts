import { SITE_URL } from 'astro:env/client';

export const NOME_DO_SITE = 'Ronrom';
export const IDIOMA = 'pt-BR';

// Complemento do título da home ("Ronrom · Reviews e pensamentos", #32).
export const TAGLINE = 'Reviews e pensamentos';

// Description da home e fallback de qualquer página sem description própria. Quando a consulta de
// configurações estiver ligada (#33), a home passa a usar a `seo.descricao` do Studio, se houver.
export const DESCRICAO_DO_SITE =
  'Reviews de filmes, séries, livros, restaurantes, lugares e comidas, e pensamentos em artigos, textos, frases e opiniões.';

// URL base absoluta, igual ao `site` do astro.config (inclusive nos previews da Vercel).
export const URL_DO_SITE = SITE_URL;
