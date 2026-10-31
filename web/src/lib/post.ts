import type { TipoDePost } from '@/lib/sanity/conteudo';
import type { CONSULTA_DAS_ROTAS_DOS_POSTS_RESULT } from '@/lib/sanity/tipos.gerados';

// O que as páginas de post (#42) precisam além do que vem pronto da consulta.

type Rota = CONSULTA_DAS_ROTAS_DOS_POSTS_RESULT[number];

/** Os parâmetros de `/reviews/[categoria]/[slug]` ou `/pensamentos/[formato]/[slug]`. */
export type ParametrosDoPost = { secao: string; slug: string };

/**
 * Os posts do `tipo` que têm página: a seção (categoria ou formato) e o slug de cada um. Só sai
 * página no endereço certo: post cuja categoria ou formato não existe (apagado ou fora do ar) não
 * ganha página quebrada, e qualquer outra combinação de seção e slug dá 404.
 */
export function parametrosDosPosts(
  rotas: readonly Rota[] | null | undefined,
  tipo: TipoDePost,
): ParametrosDoPost[] {
  return (rotas ?? []).flatMap((rota) => {
    if (rota.tipo !== tipo || !rota.slug) return [];
    const secao = (tipo === 'review' ? rota.categoria : rota.formato)?.slug;
    return secao ? [{ secao, slug: rota.slug }] : [];
  });
}
