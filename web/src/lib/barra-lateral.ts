import { urlDaCategoria, urlDoFormato } from '@/lib/rotas';
import type { CONSULTA_DA_TAXONOMIA_RESULT } from '@/lib/sanity/tipos.gerados';

export interface Frase {
  texto: string;
  autoria?: string | undefined;
}

export interface ItemDaTaxonomia {
  rotulo: string;
  href: string;
  /** Posts no ar nessa categoria ou formato. */
  total: number;
}

type Taxonomia = Pick<CONSULTA_DA_TAXONOMIA_RESULT, 'categorias' | 'formatos'>;

/**
 * A frase em destaque pronta para mostrar, ou `null` quando não há texto (a autora apagou a frase,
 * ou só sobraram espaços): sem frase, o bloco vinho some. Autoria vazia vira `undefined`.
 */
export function fraseParaMostrar(
  frase: { texto?: string | null; autoria?: string | null } | null | undefined,
): Frase | null {
  const texto = frase?.texto?.trim();
  if (!texto) return null;
  const autoria = frase?.autoria?.trim();
  return { texto, autoria: autoria || undefined };
}

/** Categorias (Reviews) e formatos (Pensamentos) da barra lateral, na ordem do menu. */
export function navegacaoDaBarraLateral(taxonomia: Taxonomia | null | undefined): {
  categorias: ItemDaTaxonomia[];
  formatos: ItemDaTaxonomia[];
} {
  return {
    categorias: (taxonomia?.categorias ?? []).map(({ nome, slug, total }) => ({
      rotulo: nome,
      href: urlDaCategoria(slug),
      total,
    })),
    formatos: (taxonomia?.formatos ?? []).map(({ nome, slug, total }) => ({
      rotulo: nome,
      href: urlDoFormato(slug),
      total,
    })),
  };
}

/** "1 post", "3 posts", "nenhum post": o total como o leitor de tela anuncia. */
export function rotuloDoTotal(total: number): string {
  if (total === 0) return 'nenhum post';
  return total === 1 ? '1 post' : `${total} posts`;
}
