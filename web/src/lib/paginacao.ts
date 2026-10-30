// Os números que a `Paginacao.astro` mostra entre "Anterior" e "Próxima".

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
