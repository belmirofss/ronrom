import { secaoDoCard } from '@/lib/card';
import type { ItemDoIndice } from '@/lib/mais-lidos';
import { validarNota } from '@/lib/nota';
import { urlDoPost } from '@/lib/rotas';
import { versaoDaImagem } from '@/lib/sanity/imagem';
import type { CONSULTA_DO_INDICE_DE_POSTS_RESULT } from '@/lib/sanity/tipos.gerados';
import { tempoDeLeitura } from '@/lib/utils/leitura';

// O /posts-index.json (#57): um item por post publicado, com o que o card do "Mais lidos" mostra,
// já resolvido no build (URL, miniatura, nome da seção, tempo de leitura). O navegador só junta
// com o ranking pelo `id`.

/**
 * Largura da miniatura no índice: o card a mostra com até 15rem (240px), então 480px cobre telas
 * com densidade 2.
 */
export const LARGURA_DA_MINIATURA = 480;

type PostDoIndice = CONSULTA_DO_INDICE_DE_POSTS_RESULT[number];

/** O item do índice de um post. Slug, seção ou nota inválidos derrubam o build, como nos cards. */
export function itemDoIndice(post: PostDoIndice): ItemDoIndice {
  return {
    id: post._id,
    url: urlDoPost(post),
    titulo: post.titulo,
    subtitulo: post.subtitulo,
    capa: versaoDaImagem(post.capa, LARGURA_DA_MINIATURA, 4 / 3),
    alt: post.capa.alt ?? '',
    tipo: post.tipo,
    categoria: secaoDoCard(post),
    nota: post.tipo === 'review' ? validarNota(post.nota) : null,
    data: post.dataDePublicacao,
    leitura: tempoDeLeitura(post.textoDoCorpo),
  };
}
