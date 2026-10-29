import { urlDaCategoria } from '@/lib/rotas';

export interface LinkDeNavegacao {
  rotulo: string;
  href: string;
}

// As seções do cabeçalho e do rodapé, na ordem da navegação.
export const SECOES: readonly LinkDeNavegacao[] = [
  { rotulo: 'Início', href: '/' },
  { rotulo: 'Reviews', href: '/reviews' },
  { rotulo: 'Pensamentos', href: '/pensamentos' },
  { rotulo: 'Sobre', href: '/sobre' },
];

// Categorias fixas das reviews (criadas com _id fixo pela #18; slugs congelados em
// docs/seo-urls.md#categorias-reviews), listadas no rodapé.
export const CATEGORIAS_PRINCIPAIS: readonly LinkDeNavegacao[] = [
  { rotulo: 'Filmes', href: urlDaCategoria('filmes') },
  { rotulo: 'Séries', href: urlDaCategoria('series') },
  { rotulo: 'Livros', href: urlDaCategoria('livros') },
  { rotulo: 'Restaurantes e cafés', href: urlDaCategoria('restaurantes-e-cafes') },
  { rotulo: 'Lugares', href: urlDaCategoria('lugares') },
  { rotulo: 'Comidas', href: urlDaCategoria('comidas') },
];

// No build (formato `directory`), Astro.url.pathname termina em "/"; no dev, não.
function semBarraNoFinal(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/**
 * Valor de aria-current de uma seção para a página atual: "page" quando é a própria página da
 * seção, "true" numa página dentro dela (/reviews/filmes/... marca Reviews) e undefined fora.
 * A home só é a seção atual em "/".
 */
export function estadoDaSecao(href: string, pathname: string): 'page' | 'true' | undefined {
  const atual = semBarraNoFinal(pathname);
  if (atual === href) return 'page';
  if (href !== '/' && atual.startsWith(`${href}/`)) return 'true';
  return undefined;
}
