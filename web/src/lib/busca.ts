import { notaPorExtenso } from '@/lib/nota';
import type { CONSULTA_DO_POST_RESULT } from '@/lib/sanity/tipos.gerados';
import { urlDaMiniatura } from '@/lib/sanity/imagem';

// O que a página do post entrega ao Pagefind (#54) além do texto: filtros, metadados do resultado
// e a chave de ordenação. A integração que gera o índice no build fica em web/integracao-pagefind.mjs;
// o que entra no índice e por quê: docs/busca.md.

type Post = NonNullable<CONSULTA_DO_POST_RESULT>;

/** Largura da miniatura do resultado, em pixels, no CDN do Sanity. */
export const LARGURA_DA_MINIATURA = 320;

/** Proporção da miniatura: a mesma dos cards e das listagens. */
export const PROPORCAO_DA_MINIATURA = 4 / 3;

export interface IndiceDoPost {
  /** `data-pagefind-filter`: pares chave/valor, uma chave pode repetir (as tags). */
  filtros: [string, string][];
  /** `data-pagefind-meta`: o que o resultado da busca mostra. Sem campos vazios. */
  metadados: [string, string][];
  /** `data-pagefind-sort="date"`: ISO 8601, que ordena certo como texto. */
  data: string;
}

/**
 * Filtros, metadados e data de um post para o índice da busca. `url` é o caminho do post
 * (`urlDoPost`): o Pagefind calcula o próprio a partir do arquivo, com barra no final, e o
 * `trailingSlash: 'never'` do site transformaria cada clique num redirect.
 */
export function indiceDoPost(
  post: Pick<
    Post,
    | 'tipo'
    | 'titulo'
    | 'subtitulo'
    | 'dataDePublicacao'
    | 'categoria'
    | 'formato'
    | 'nota'
    | 'tags'
    | 'capa'
  >,
  url: string,
): IndiceDoPost {
  const ehReview = post.tipo === 'review';
  const nota = ehReview ? notaPorExtenso(post.nota) : undefined;
  const secao = ehReview ? post.categoria?.nome : post.formato?.nome;
  const tags = (post.tags ?? []).flatMap(({ nome }) => (nome?.trim() ? [nome.trim()] : []));
  const imagem = urlDaMiniatura(post.capa, LARGURA_DA_MINIATURA, PROPORCAO_DA_MINIATURA);

  const filtros: [string, string | undefined][] = [
    ['tipo', ehReview ? 'Review' : 'Pensamento'],
    [ehReview ? 'categoria' : 'formato', secao?.trim()],
    ...tags.map((tag): [string, string] => ['tags', tag]),
    ['nota', nota],
  ];

  const metadados: [string, string | null | undefined][] = [
    ['title', post.titulo],
    ['url', url],
    ['image', imagem],
    ['image_alt', imagem ? post.capa.alt?.trim() : undefined],
    ['date', post.dataDePublicacao],
    ['subtitulo', post.subtitulo?.trim()],
    ['nota', nota],
  ];

  return {
    filtros: filtros.filter((par): par is [string, string] => Boolean(par[1])),
    metadados: metadados.filter((par): par is [string, string] => Boolean(par[1])),
    data: post.dataDePublicacao,
  };
}
