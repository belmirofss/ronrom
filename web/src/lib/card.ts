import type {
  CONSULTA_DO_LEIA_TAMBEM_RESULT,
  CONSULTA_DOS_ULTIMOS_POSTS_RESULT,
} from '@/lib/sanity/tipos.gerados';

// O que os cards de post (Destaque, ItemDeLista e CardDePost, em components/post) mostram além
// do que vem pronto da consulta: o rótulo "Review · Filmes" e o texto do botão do destaque.

/** O card do "Leia também" e do índice (`CARD` em consultas.ts). */
export type Card = CONSULTA_DO_LEIA_TAMBEM_RESULT[number];

/** O card do destaque e das listagens (`CARD_COM_LEITURA`), com o texto para o tempo de leitura. */
export type CardComLeitura = CONSULTA_DOS_ULTIMOS_POSTS_RESULT['posts'][number];

/** O nível do título do card, conforme a página: h2 numa listagem, h3 embaixo de uma seção. */
export type NivelDoTitulo = 2 | 3 | 4 | 5 | 6;

type PostDoCard = Pick<Card, 'tipo' | 'slug' | 'categoria' | 'formato'>;

/** O nome do tipo no rótulo do card. */
export const NOME_DO_TIPO = { review: 'Review', pensamento: 'Pensamento' } as const;

/**
 * O nome da categoria (review) ou do formato (pensamento), o do chip. Sem ele, o build quebra,
 * como no `urlDoPost`: o card não sai com o chip vazio.
 */
export function secaoDoCard(post: PostDoCard): string {
  const nome = post.tipo === 'review' ? post.categoria?.nome : post.formato?.nome;
  if (!nome) {
    const falta = post.tipo === 'review' ? 'categoria' : 'formato';
    throw new Error(`Card sem ${falta} em "${post.slug}".`);
  }
  return nome;
}

/** As partes do rótulo do card, para juntar com " · ": `["Review", "Filmes"]`. */
export function rotuloDoCard(post: PostDoCard): [string, string] {
  return [NOME_DO_TIPO[post.tipo], secaoDoCard(post)];
}

/** O texto do botão do destaque: "Ler review" ou "Ler texto". */
export function chamadaDoCard(post: Pick<Card, 'tipo'>): string {
  return post.tipo === 'review' ? 'Ler review' : 'Ler texto';
}
