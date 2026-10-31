// Regras da migração que juntou Artigos, Textos e Opiniões em "Textos e opiniões" (#143), sem
// depender do Sanity. O scripts/unificar-formatos.ts busca os posts, grava o plano daqui e apaga os
// formatos antigos.

import { caminhoDoPost, slugsAnterioresAoPublicar } from './post';
import { referencia } from './seed';
import { FORMATOS_UNIFICADOS } from './taxonomia';

/** Um post como o script lê na perspectiva `raw`: publicado, rascunho ou versão. */
export interface PostParaUnificar {
  _id: string;
  tipo?: string;
  slug?: string;
  formato?: string;
  slugsAnteriores?: string[];
}

export interface PatchDaUnificacao {
  _id: string;
  set: { formato?: ReturnType<typeof referencia>; slugsAnteriores?: string[] };
}

// `drafts.x` e `versions.lancamento.x` são do post `x`.
export function idPublicado(id: string) {
  return id.replace(/^drafts\./, '').replace(/^versions\.[^.]+\./, '');
}

const SLUG_REMOVIDO = new Map<string, string>(
  FORMATOS_UNIFICADOS.removidos.map(({ _id, slug }) => [_id, slug]),
);

/**
 * Os patches que tiram os posts dos formatos removidos. Cada post passa para o formato de destino
 * e, se a versão publicada estava num formato removido, todas as versões dele (publicada, rascunho
 * e de lançamento) guardam o caminho publicado em `slugsAnteriores`, como faria o "Publicar". O
 * rascunho também precisa da lista, porque é dela que o "Publicar" parte da próxima vez.
 * `slugsDosFormatos` traz o slug de cada formato que continua no ar, por `_id`.
 */
export function planoDaUnificacao(
  posts: readonly PostParaUnificar[],
  slugsDosFormatos: ReadonlyMap<string, string>,
): PatchDaUnificacao[] {
  const { destino } = FORMATOS_UNIFICADOS;
  const publicados = new Map(
    posts.filter((post) => post._id === idPublicado(post._id)).map((post) => [post._id, post]),
  );

  return posts.flatMap((post) => {
    const removido = post.formato !== undefined && SLUG_REMOVIDO.has(post.formato);
    const publicado = publicados.get(idPublicado(post._id));
    const caminhoPublicado =
      publicado?.formato && SLUG_REMOVIDO.has(publicado.formato)
        ? caminhoDoPost({ ...publicado, formato: SLUG_REMOVIDO.get(publicado.formato) })
        : undefined;
    const caminhoNovo = caminhoDoPost({
      ...post,
      formato: removido ? destino.slug : post.formato && slugsDosFormatos.get(post.formato),
    });

    const set: PatchDaUnificacao['set'] = {};
    if (removido) set.formato = referencia(destino._id);
    const anteriores =
      caminhoPublicado &&
      slugsAnterioresAoPublicar(post.slugsAnteriores ?? [], caminhoPublicado, caminhoNovo);
    if (anteriores) set.slugsAnteriores = anteriores;

    return Object.keys(set).length > 0 ? [{ _id: post._id, set }] : [];
  });
}
