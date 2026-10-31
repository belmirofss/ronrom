import { caminhoDoPost } from '../../../studio/lib/post';

import { totalDePaginas } from './paginacao';

// Redirects do build (#53): os fixos de web/redirects.mjs e um 301 de cada caminho antigo de post
// (`slugsAnteriores`) para o endereço atual. O astro.config.mjs monta a lista com o
// `montarRedirects` antes do build e, no fim, confere os destinos com o `conferirRedirects`.
// Regras: docs/cabecalhos.md#redirects.
//
// Este módulo roda dentro do astro.config, antes do astro:env, então não pode usar os helpers de
// rotas.ts (que leem a SITE_URL): o caminho do post sai do `caminhoDoPost` do Studio, e o das
// listagens é montado aqui, os dois iguais aos de rotas.ts.

export type StatusDeRedirect = 301 | 302 | 303 | 307 | 308;

export interface Redirect {
  status: StatusDeRedirect;
  destination: string;
}

/** Um item de web/redirects.mjs: só o destino (301) ou o status e o destino. */
export type RedirectFixo = string | Redirect;

/** Rota de um post, como as consultas devolvem. */
export interface RotaDoPost {
  tipo: 'review' | 'pensamento';
  slug: string;
  categoria: { slug: string } | null;
  formato: { slug: string } | null;
}

export interface PostComAnteriores extends RotaDoPost {
  anteriores: string[] | null;
}

/** Uma categoria, um formato ou uma tag, com o total de posts da listagem. */
export interface ItemComListagem {
  slug: string;
  total: number;
}

/** Categorias, formatos e tags com post, cada um com a listagem dele. */
export interface TaxonomiaComPagina {
  categorias: ItemComListagem[];
  formatos: ItemComListagem[];
  tags: ItemComListagem[];
}

/**
 * Tudo o que o build sabe do site antes de gerar as páginas. Um caminho que é de uma página ou de
 * um post no ar não pode virar redirect: o Astro deixa de gerar a página, só com um aviso no log.
 */
export interface DadosDosRedirects {
  fixos: Record<string, RedirectFixo>;
  posts: PostComAnteriores[];
  rotasDosPosts: RotaDoPost[];
  taxonomia: TaxonomiaComPagina;
  /** Caminhos das páginas sem parâmetro (`/sobre`), do `caminhosDasPaginas`. */
  paginas: string[];
}

// `/` ou `/um/ou/mais/segmentos`, sem barra no final, sem domínio, query ou fragmento.
const FORMATO_DO_CAMINHO = /^\/(?:[^/\s?#]+(?:\/[^/\s?#]+)*)?$/;

// Rota com parâmetro (`/reviews/antigo/[slug]`), como a troca do slug de uma categoria
// (docs/seo-urls.md): não dá para seguir a cadeia nem conferir o destino com as páginas geradas.
const ehDinamico = (caminho: string) => caminho.includes('[');

// Extensões dos arquivos de rota de src/pages. O endpoint `.ts` ou `.js` mantém a extensão do que
// serve (`posts-index.json.ts` vira `/posts-index.json`).
const EXTENSAO_DA_ROTA = /\.(?:astro|md|mdx|html|ts|js)$/;

/**
 * Caminho de cada página sem parâmetro, a partir dos arquivos de src/pages (relativos a ela, com
 * `/`). Ignora as rotas com parâmetro e o que começa com `_`, como o Astro.
 */
export function caminhosDasPaginas(arquivos: readonly string[]): string[] {
  return arquivos
    .filter((arquivo) => EXTENSAO_DA_ROTA.test(arquivo) && !ehDinamico(arquivo))
    .filter((arquivo) => !arquivo.split('/').some((parte) => parte.startsWith('_')))
    .map((arquivo) => `/${arquivo.replace(EXTENSAO_DA_ROTA, '')}`.replace(/\/index$/, '') || '/');
}

function caminho(post: RotaDoPost) {
  const resultado = caminhoDoPost({
    tipo: post.tipo,
    slug: post.slug,
    categoria: post.categoria?.slug,
    formato: post.formato?.slug,
  });
  if (!resultado) {
    throw new Error(`Redirects: o post "${post.slug}" (${post.tipo}) está sem categoria/formato.`);
  }
  return resultado;
}

function conferirCaminho(valor: string, onde: string) {
  if (!FORMATO_DO_CAMINHO.test(valor)) {
    throw new Error(
      `Redirects: "${valor}" (${onde}) não é um caminho do site. Use /caminho, sem domínio e sem barra no final (docs/cabecalhos.md#redirects).`,
    );
  }
}

interface RedirectComOrigem extends Redirect {
  /** De onde veio, para as mensagens de erro. */
  fonte: string;
}

/**
 * Junta os redirects fixos com os dos posts. Encurta cadeias (A → B → C vira A → C) e ignora, com
 * um aviso, o caminho antigo de post que hoje é de outra página (a página no ar ganha). Lança um
 * erro, que derruba o build, para loop, caminho fora do formato, origem com dois destinos e
 * redirect fixo por cima de uma página.
 */
export function montarRedirects({
  fixos,
  posts,
  rotasDosPosts,
  taxonomia,
  paginas,
}: DadosDosRedirects) {
  const avisos: string[] = [];
  // As listagens nos mesmos caminhos do urlDaCategoria, urlDoFormato e urlDaTag (rotas.ts), com
  // o número de páginas de cada uma.
  const listagens = new Map<string, number>([
    ...taxonomia.categorias.map(({ slug, total }) => [`/reviews/${slug}`, total] as const),
    ...taxonomia.formatos.map(({ slug, total }) => [`/pensamentos/${slug}`, total] as const),
    ...taxonomia.tags.map(({ slug, total }) => [`/tags/${slug}`, total] as const),
  ]);
  const noAr = new Set([...paginas, ...rotasDosPosts.map(caminho), ...listagens.keys()]);
  const mapa = new Map<string, RedirectComOrigem>();

  for (const [origem, valor] of Object.entries(fixos)) {
    const redirect =
      typeof valor === 'string' ? { status: 301 as const, destination: valor } : valor;
    conferirCaminho(origem, 'web/redirects.mjs');
    conferirCaminho(redirect.destination, `destino de ${origem} em web/redirects.mjs`);
    if (noAr.has(origem)) {
      throw new Error(
        `Redirects: ${origem} (web/redirects.mjs) é o endereço de uma página no ar, que o redirect esconderia. Tire o item de web/redirects.mjs.`,
      );
    }
    mapa.set(origem, { ...redirect, fonte: 'web/redirects.mjs' });

    // Para uma listagem, as páginas vão junto: `{origem}/pagina/N` leva à página N do destino,
    // para cada página que o destino tem. Uma página N da listagem antiga que o destino não tem
    // fica sem redirect: o Astro só aceita redirect com parâmetro para uma rota igual (#143).
    const total = listagens.get(redirect.destination);
    if (total === undefined) continue;
    for (let n = 2; n <= totalDePaginas(total); n++) {
      mapa.set(`${origem}/pagina/${n}`, {
        status: redirect.status,
        destination: `${redirect.destination}/pagina/${n}`,
        fonte: `web/redirects.mjs (página ${n} de ${origem})`,
      });
    }
  }

  for (const post of posts) {
    const destino = caminho(post);
    for (const origem of post.anteriores ?? []) {
      if (origem === destino) continue;
      conferirCaminho(origem, `slugsAnteriores do post ${destino}`);
      if (noAr.has(origem)) {
        avisos.push(
          `${origem}, endereço antigo de ${destino}, hoje é de outra página e fica sem redirect.`,
        );
        continue;
      }
      const existente = mapa.get(origem);
      if (existente) {
        throw new Error(
          `Redirects: ${origem} leva a dois lugares, ${existente.destination} (${existente.fonte}) e ${destino} (slugsAnteriores do post). Tire o caminho de um dos dois (docs/cabecalhos.md#redirects).`,
        );
      }
      mapa.set(origem, {
        status: 301,
        destination: destino,
        fonte: `slugsAnteriores de ${destino}`,
      });
    }
  }

  const redirects: Record<string, Redirect> = {};
  for (const [origem, { status, destination }] of mapa) {
    const cadeia = [origem];
    let destino = destination;
    while (!ehDinamico(destino) && mapa.has(destino)) {
      if (cadeia.includes(destino)) {
        throw new Error(`Redirects: loop em ${[...cadeia, destino].join(' → ')}.`);
      }
      cadeia.push(destino);
      destino = mapa.get(destino)!.destination;
    }
    if (cadeia.length > 1) {
      avisos.push(
        `Cadeia de redirects encurtada: ${[...cadeia, destino].join(' → ')} vira ${origem} → ${destino}.`,
      );
    }
    redirects[origem] = { status, destination: destino };
  }

  return { redirects, avisos };
}

/**
 * Depois do build: todo destino tem de ser uma página gerada. `paginas` são os caminhos gerados,
 * sem barra no final. Lança um erro com a lista dos redirects quebrados.
 */
export function conferirRedirects(redirects: Record<string, Redirect>, paginas: Iterable<string>) {
  const geradas = new Set(paginas);
  const quebrados = Object.entries(redirects).filter(
    ([, { destination }]) => !ehDinamico(destination) && !geradas.has(destination),
  );
  if (quebrados.length > 0) {
    const lista = quebrados.map(([origem, { destination }]) => `${origem} → ${destination}`);
    throw new Error(
      `Redirects para uma página que não existe (docs/cabecalhos.md#redirects):\n- ${lista.join('\n- ')}`,
    );
  }
}
