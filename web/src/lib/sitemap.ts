import { CAMINHO_DO_MAPA } from '@/lib/mapa';
import { CAMINHO_DA_PRIVACIDADE, PRIVACIDADE_ATUALIZADA_EM } from '@/lib/privacidade';
import { urlDaCategoria, urlDaPagina, urlDoFormato, urlDoPost } from '@/lib/rotas';
import { POSTS_POR_PAGINA, totalDePaginas } from '@/lib/sanity/conteudo';
import type { CONSULTA_DO_SITEMAP_RESULT } from '@/lib/sanity/tipos.gerados';

// Dados do sitemap (#52). O @astrojs/sitemap roda no astro.config, onde os helpers de rota e a
// paginação (que dependem do astro:env) não rodam. Por isso o endpoint /sitemap-dados.json monta
// aqui o mapa caminho → lastmod e a lista de páginas noindex, e o web/sitemap.mjs lê o arquivo no
// fim do build e o apaga antes do deploy. Política: docs/seo-urls.md#sitemap.

export interface DadosDoSitemap {
  // Caminho (`/reviews/filmes`) → data ISO 8601 da última mudança do que a página mostra.
  lastmod: Record<string, string>;
  // Caminhos com `noindex`, que ficam fora do sitemap.
  noindex: string[];
}

type Post = CONSULTA_DO_SITEMAP_RESULT['posts'][number];

// Um post muda o que aparece quando é editado e também quando entra no ar: a data de publicação
// pode ser posterior ao último `_updatedAt` (post agendado que o rebuild diário publica).
function dataDoPost(post: Post): number {
  return Math.max(Date.parse(post._updatedAt), Date.parse(post.dataDePublicacao));
}

function maisRecente(datas: (string | number | null | undefined)[]): number {
  return Math.max(
    ...datas.map((data) => (typeof data === 'string' ? Date.parse(data) : (data ?? 0))),
    0,
  );
}

const iso = (data: number) => new Date(data).toISOString();

/**
 * O mapa do sitemap a partir da `CONSULTA_DO_SITEMAP`.
 * - Post: a última edição ou a entrada no ar.
 * - Página `n` de uma listagem: o post mais recente entre os que aparecem nela ou antes dela (um
 *   post novo empurra todos os outros uma posição), ou o documento da categoria ou do formato,
 *   cuja descrição a página mostra.
 * - Home: a data mais recente de tudo (destaque, abas e barra lateral). Sobre: o próprio documento.
 * - Privacidade: a última mudança no texto ou no Sobre, de onde vêm o nome e o e-mail da autora.
 * - Mapa: o post de lugar (restaurantes, cafés e lugares) mais recente.
 * - Sem data própria (listagem vazia de /reviews, /pensamentos ou /posts, Sobre ainda não
 *   publicado), vale a da home: o sitemap sai com lastmod em toda URL.
 */
export function dadosDoSitemap(dados: CONSULTA_DO_SITEMAP_RESULT): DadosDoSitemap {
  const lastmod: Record<string, string> = {};
  const noindex: string[] = [];

  const home = maisRecente([
    ...dados.posts.map(dataDoPost),
    ...[...dados.categorias, ...dados.formatos].map((doc) => doc._updatedAt),
    dados.configuracoes,
    dados.sobre,
  ]);

  for (const post of dados.posts) {
    const caminho = urlDoPost(post);
    lastmod[caminho] = iso(dataDoPost(post));
    if (post.noindex) noindex.push(caminho);
  }

  // `posts` já vem na ordem das listagens; o filtro mantém a ordem.
  const listagem = (base: string, posts: Post[], documento?: string | null) => {
    const datas = posts.map(dataDoPost);
    for (let n = 1; n <= totalDePaginas(posts.length); n++) {
      const data = maisRecente([...datas.slice(0, n * POSTS_POR_PAGINA), documento]);
      lastmod[urlDaPagina(base, n)] = iso(data || home);
    }
  };

  listagem('/posts', dados.posts);
  listagem(
    '/reviews',
    dados.posts.filter((post) => post.tipo === 'review'),
  );
  listagem(
    '/pensamentos',
    dados.posts.filter((post) => post.tipo === 'pensamento'),
  );
  for (const { slug, _updatedAt } of dados.categorias) {
    const posts = dados.posts.filter((p) => p.tipo === 'review' && p.categoria?.slug === slug);
    listagem(urlDaCategoria(slug), posts, _updatedAt);
  }
  for (const { slug, _updatedAt } of dados.formatos) {
    const posts = dados.posts.filter((p) => p.tipo === 'pensamento' && p.formato?.slug === slug);
    listagem(urlDoFormato(slug), posts, _updatedAt);
  }

  lastmod['/'] = iso(home);
  lastmod['/sobre'] = iso(maisRecente([dados.sobre]) || home);
  lastmod[CAMINHO_DO_MAPA] = iso(
    maisRecente(dados.posts.filter((post) => post.lugar).map(dataDoPost)) || home,
  );
  lastmod[CAMINHO_DA_PRIVACIDADE] = iso(maisRecente([PRIVACIDADE_ATUALIZADA_EM, dados.sobre]));

  return { lastmod, noindex };
}
