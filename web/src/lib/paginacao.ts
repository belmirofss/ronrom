// Paginação das listagens: o tamanho da página e os números que a `Paginacao.astro` mostra entre
// "Anterior" e "Próxima". Sem import do cliente do Sanity, porque o src/lib/redirects.ts, que roda
// no astro.config antes do astro:env, também usa o `totalDePaginas`.

export type ItemDaPaginacao = number | 'reticencias';

// Páginas ao lado da atual que sempre aparecem (2 → 3 [4] 5).
const VIZINHAS = 1;

/**
 * Primeira, última, a atual e as vizinhas dela; o resto vira reticências. Reticências nunca
 * escondem uma página só (1 … 3 vira 1 2 3), então a lista tem sempre o mesmo tamanho a partir de
 * 7 páginas: `paginasVisiveis(5, 10)` → `[1, 'reticencias', 4, 5, 6, 'reticencias', 10]`.
 */
export function paginasVisiveis(atual: number, total: number): ItemDaPaginacao[] {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error(`Total de páginas inválido: ${total} (precisa ser inteiro a partir de 1).`);
  }
  if (!Number.isInteger(atual) || atual < 1 || atual > total) {
    throw new Error(`Página atual inválida: ${atual} (precisa estar entre 1 e ${total}).`);
  }

  // Com poucas páginas, todas aparecem: as reticências não economizariam espaço.
  const tamanho = 2 * VIZINHAS + 5;
  if (total <= tamanho) return Array.from({ length: total }, (_, i) => i + 1);

  // A janela em volta da atual, empurrada para dentro perto das pontas (1 2 3 4 5 … 10).
  const inicio = Math.min(Math.max(atual - VIZINHAS, 3), total - 2 - 2 * VIZINHAS);
  const fim = inicio + 2 * VIZINHAS;
  const janela = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);

  return [
    1,
    inicio === 3 ? 2 : 'reticencias',
    ...janela,
    fim === total - 2 ? total - 1 : 'reticencias',
    total,
  ];
}

/** Posts por página nas listagens (#1). A página 2 em diante fica em `{listagem}/pagina/[n]`. */
export const POSTS_POR_PAGINA = 12;

/** A fatia `[inicio...fim]` (fim exclusivo) da página `n` de uma listagem. */
export function fatiaDaPagina(n: number): { inicio: number; fim: number } {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Página inválida: ${n} (precisa ser inteiro a partir de 1).`);
  }
  return { inicio: (n - 1) * POSTS_POR_PAGINA, fim: n * POSTS_POR_PAGINA };
}

/** Quantas páginas uma listagem com `total` posts tem. Sem post, a página 1 existe vazia. */
export function totalDePaginas(total: number): number {
  return Math.max(1, Math.ceil(total / POSTS_POR_PAGINA));
}
