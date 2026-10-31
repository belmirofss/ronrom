// A aba "Mais lidos" da home (#57), montada no navegador: o ranking vem da /api/mais-lidos e os
// dados dos cards do /posts-index.json, gerado no build. Este arquivo roda no navegador, então não
// importa nada que dependa do Sanity ou do astro:env. Detalhes em docs/visualizacoes.md.

/** O endereço do índice dos posts, gerado por src/pages/posts-index.json.ts. */
export const URL_DO_INDICE = '/posts-index.json';

/** Um post do /posts-index.json: o que o card do "Mais lidos" mostra, já pronto para exibir. */
export interface ItemDoIndice {
  /** O `_id` do post, a mesma chave do ranking no Redis. */
  id: string;
  url: string;
  titulo: string;
  subtitulo: string | null;
  /** A miniatura em 4:3, numa largura só. `null` se o asset da capa foi apagado. */
  capa: { src: string; width: number; height: number } | null;
  /** O texto alternativo da capa. O card a mostra como decorativa, já que o título é o link. */
  alt: string;
  tipo: 'review' | 'pensamento';
  /** O nome da categoria (review) ou do formato (pensamento), o do chip. */
  categoria: string;
  /** A nota em corações, só nas reviews. */
  nota: number | null;
  /** A data de publicação, em ISO 8601. */
  data: string;
  /** "X min de leitura". */
  leitura: string;
}

/**
 * Os `limite` posts da aba: os do ranking que ainda estão no índice, na ordem do ranking e sem
 * repetir, e, se faltar, os mais recentes que ainda não entraram. O índice já vem do mais recente
 * para o mais antigo. Um id do ranking que não está no índice (post despublicado ou apagado) é
 * descartado.
 */
export function juntarMaisLidos(
  ranking: readonly { id: string }[],
  indice: readonly ItemDoIndice[],
  limite: number,
): ItemDoIndice[] {
  const porId = new Map(indice.map((item) => [item.id, item]));
  const escolhidos = new Map<string, ItemDoIndice>();

  for (const { id } of ranking) {
    const item = porId.get(id);
    if (item) escolhidos.set(id, item);
    if (escolhidos.size >= limite) break;
  }
  for (const item of indice) {
    if (escolhidos.size >= limite) break;
    if (!escolhidos.has(item.id)) escolhidos.set(item.id, item);
  }
  return [...escolhidos.values()];
}
