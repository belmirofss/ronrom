import { consultar } from './cliente';
import {
  CONSULTA_DA_TAXONOMIA,
  CONSULTA_DAS_CONFIGURACOES,
  CONSULTA_DAS_ROTAS_DOS_POSTS,
  CONSULTA_DO_DESTAQUE,
  CONSULTA_DO_FEED,
  CONSULTA_DO_INDICE_DE_POSTS,
  CONSULTA_DO_LEIA_TAMBEM,
  CONSULTA_DO_POST,
  CONSULTA_DO_SITEMAP,
  CONSULTA_DO_SOBRE,
  CONSULTA_DOS_POSTS_DA_CATEGORIA,
  CONSULTA_DOS_POSTS_DA_TAG,
  CONSULTA_DOS_POSTS_DO_FORMATO,
  CONSULTA_DOS_POSTS_DO_TIPO,
  CONSULTA_DOS_REDIRECTS,
  CONSULTA_DOS_ULTIMOS_POSTS,
} from './consultas';
import type {
  CONSULTA_DAS_CONFIGURACOES_RESULT,
  CONSULTA_DAS_ROTAS_DOS_POSTS_RESULT,
  CONSULTA_DA_TAXONOMIA_RESULT,
  CONSULTA_DOS_POSTS_DA_CATEGORIA_RESULT,
  CONSULTA_DOS_POSTS_DA_TAG_RESULT,
  CONSULTA_DOS_POSTS_DO_FORMATO_RESULT,
  CONSULTA_DOS_POSTS_DO_TIPO_RESULT,
  CONSULTA_DOS_REDIRECTS_RESULT,
  CONSULTA_DOS_ULTIMOS_POSTS_RESULT,
  CONSULTA_DO_DESTAQUE_RESULT,
  CONSULTA_DO_FEED_RESULT,
  CONSULTA_DO_INDICE_DE_POSTS_RESULT,
  CONSULTA_DO_LEIA_TAMBEM_RESULT,
  CONSULTA_DO_POST_RESULT,
  CONSULTA_DO_SITEMAP_RESULT,
  CONSULTA_DO_SOBRE_RESULT,
} from './tipos.gerados';

// Funções de acesso ao conteúdo: é daqui que páginas, componentes e endpoints leem o Sanity (ou
// as fixtures), nunca do @sanity/client nem do cliente.ts. Uma função por consulta de
// consultas.ts; o formato de cada resultado está no README desta pasta.

export type TipoDePost = 'review' | 'pensamento';

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

// --- Site ---

export const buscarConfiguracoes = () =>
  consultar<CONSULTA_DAS_CONFIGURACOES_RESULT>(CONSULTA_DAS_CONFIGURACOES);

export const buscarSobre = () => consultar<CONSULTA_DO_SOBRE_RESULT>(CONSULTA_DO_SOBRE);

// --- Home e listagens ---

/** O post em destaque na home: o escolhido em Configurações ou o mais recente. */
export const buscarDestaque = () => consultar<CONSULTA_DO_DESTAQUE_RESULT>(CONSULTA_DO_DESTAQUE);

/** Página `n` de todos os posts, do mais recente para o mais antigo. */
export const buscarUltimos = (pagina = 1) =>
  consultar<CONSULTA_DOS_ULTIMOS_POSTS_RESULT>(CONSULTA_DOS_ULTIMOS_POSTS, fatiaDaPagina(pagina));

export const buscarPostsDoTipo = (tipo: TipoDePost, pagina = 1) =>
  consultar<CONSULTA_DOS_POSTS_DO_TIPO_RESULT>(CONSULTA_DOS_POSTS_DO_TIPO, {
    tipo,
    ...fatiaDaPagina(pagina),
  });

/** `categoria` vem `null` se o slug não existe. */
export const buscarPostsDaCategoria = (categoria: string, pagina = 1) =>
  consultar<CONSULTA_DOS_POSTS_DA_CATEGORIA_RESULT>(CONSULTA_DOS_POSTS_DA_CATEGORIA, {
    categoria,
    ...fatiaDaPagina(pagina),
  });

/** `formato` vem `null` se o slug não existe. */
export const buscarPostsDoFormato = (formato: string, pagina = 1) =>
  consultar<CONSULTA_DOS_POSTS_DO_FORMATO_RESULT>(CONSULTA_DOS_POSTS_DO_FORMATO, {
    formato,
    ...fatiaDaPagina(pagina),
  });

/** `tag` vem `null` se o slug não existe. */
export const buscarPostsDaTag = (tag: string, pagina = 1) =>
  consultar<CONSULTA_DOS_POSTS_DA_TAG_RESULT>(CONSULTA_DOS_POSTS_DA_TAG, {
    tag,
    ...fatiaDaPagina(pagina),
  });

/** Categorias, formatos e tags (só as com post), com o total de posts no ar de cada um. */
export const buscarTaxonomia = () => consultar<CONSULTA_DA_TAXONOMIA_RESULT>(CONSULTA_DA_TAXONOMIA);

// --- Post ---

/**
 * Um post pelo endereço: o tipo, a seção (slug da categoria, em review, ou do formato, em
 * pensamento) e o slug. `null` se não existe nesse endereço.
 */
export const buscarPost = (post: { tipo: TipoDePost; secao: string; slug: string }) =>
  consultar<CONSULTA_DO_POST_RESULT>(CONSULTA_DO_POST, post);

/** Tipo e slugs de cada post, para o `getStaticPaths` e o `urlDoPost`. */
export const buscarRotasDosPosts = () =>
  consultar<CONSULTA_DAS_ROTAS_DOS_POSTS_RESULT>(CONSULTA_DAS_ROTAS_DOS_POSTS);

/** Até 3 cards para o "Leia também" do post de `_id` `id`. */
export const buscarLeiaTambem = (id: string) =>
  consultar<CONSULTA_DO_LEIA_TAMBEM_RESULT>(CONSULTA_DO_LEIA_TAMBEM, { id });

// --- Dados gerados no build ---

/** Cards de todos os posts, sem o corpo: `/posts-index.json` (#57) e busca (#54). */
export const buscarIndiceDePosts = () =>
  consultar<CONSULTA_DO_INDICE_DE_POSTS_RESULT>(CONSULTA_DO_INDICE_DE_POSTS);

/** Posts que mudaram de endereço, com os caminhos antigos (#53). */
export const buscarRedirects = () =>
  consultar<CONSULTA_DOS_REDIRECTS_RESULT>(CONSULTA_DOS_REDIRECTS);

/** Datas de posts, taxonomia, Sobre e Configurações, para o `lastmod` do sitemap (#52). */
export const buscarSitemap = () => consultar<CONSULTA_DO_SITEMAP_RESULT>(CONSULTA_DO_SITEMAP);

/** Os 30 posts mais recentes, para o /rss.xml (#52). */
export const buscarFeed = () => consultar<CONSULTA_DO_FEED_RESULT>(CONSULTA_DO_FEED);
