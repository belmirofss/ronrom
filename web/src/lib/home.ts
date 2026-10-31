// O que a home (pages/index.astro) mostra embaixo do destaque.

/** Quantos posts a aba "Últimos posts" mostra. O resto fica em /posts. */
export const POSTS_NA_HOME = 6;

/**
 * Os últimos `quantos` posts para a aba "Últimos posts", na ordem recebida (do mais recente),
 * sem o post do destaque, que já aparece logo acima.
 */
export function ultimosSemODestaque<T extends { _id: string }>(
  posts: readonly T[],
  destaque: { _id: string } | null | undefined,
  quantos = POSTS_NA_HOME,
): T[] {
  return posts.filter((post) => post._id !== destaque?._id).slice(0, quantos);
}
