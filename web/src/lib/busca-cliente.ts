// A busca no navegador (#55): o estado na URL da /busca, o carregamento do índice do Pagefind e o
// contrato dos resultados para a UI. O índice e o que ele guarda de cada post vêm da #54
// (src/lib/busca.ts, que fica fora do bundle do cliente); o fluxo todo: docs/busca.md.

/** Caminho público do script do Pagefind, gerado no build (web/integracao-pagefind.mjs). */
export const CAMINHO_DO_PAGEFIND = '/pagefind/pagefind.js';

/** Espera depois da última tecla antes de buscar. */
export const ESPERA_DA_DIGITACAO_MS = 200;

/** Resultados por página do "carregar mais". */
export const RESULTADOS_POR_PAGINA = 10;

/** Palavras do trecho em volta do termo encontrado. */
export const TAMANHO_DO_TRECHO = 24;

export type TipoDoPost = 'review' | 'pensamento';

// Os valores do filtro `tipo` no índice (indiceDoPost) e os da URL, em minúsculas.
const TIPO_NO_INDICE: Record<TipoDoPost, string> = { review: 'Review', pensamento: 'Pensamento' };

const ROTULO_DO_TIPO: Record<TipoDoPost, string> = {
  review: 'Reviews',
  pensamento: 'Pensamentos',
};

/** O que a URL da /busca guarda: `?q=`, `?tipo=`, `?categoria=` e `?tag=`. Vazio é ausente. */
export interface EstadoDaBusca {
  q: string;
  tipo?: TipoDoPost | undefined;
  /** Nome da categoria (reviews) ou do formato (pensamentos), como no índice: `Filmes`. */
  categoria?: string | undefined;
  /** Nome da tag, sem `#`: `Wim Wenders`. */
  tag?: string | undefined;
}

/** Um resultado pronto para a UI (#61). Tudo texto puro, menos o `excerpt`. */
export interface ResultadoDeBusca {
  /** Caminho do post, sem barra no final (o `meta.url` do índice). */
  url: string;
  title: string;
  /**
   * Trecho do texto com o termo em `<mark>`. O Pagefind escapa o texto do post e só acrescenta
   * os `<mark>`, então o trecho pode ir para o `innerHTML`.
   */
  excerpt: string;
  /** Miniatura 4:3, 320 px, do CDN do Sanity. */
  image?: string | undefined;
  image_alt?: string | undefined;
  tipo: TipoDoPost;
  /** Categoria da review ou formato do pensamento. */
  categoria?: string | undefined;
  /** Por extenso, como no índice: `4,5 corações`. */
  nota?: string | undefined;
  /** Data de publicação em ISO 8601. */
  data?: string | undefined;
}

/** Um valor de filtro com quantos posts ele tem no índice inteiro. */
export interface OpcaoDeFiltro<Valor extends string = string> {
  valor: Valor;
  rotulo: string;
  total: number;
}

/** Os filtros que o índice oferece (`pagefind.filters()`), em ordem alfabética. */
export interface FiltrosDisponiveis {
  tipos: OpcaoDeFiltro<TipoDoPost>[];
  categorias: OpcaoDeFiltro[];
  tags: OpcaoDeFiltro[];
}

// O pedaço da API JS do Pagefind que o site usa (https://pagefind.app/docs/api/). O pacote
// `pagefind` só traz os tipos da API Node.
type ContagemDosFiltros = Record<string, Record<string, number>>;

type FiltrosDoPagefind = Record<string, string | string[] | Record<string, string>[]>;

export interface DadosDoPagefind {
  url: string;
  excerpt: string;
  meta: Record<string, string | undefined>;
  filters: Record<string, string[] | undefined>;
}

export interface ResultadoDoPagefind {
  id: string;
  data: () => Promise<DadosDoPagefind>;
}

export interface Pagefind {
  options: (opcoes: { excerptLength?: number }) => Promise<void>;
  init: () => Promise<void>;
  search: (
    termo: string | null,
    opcoes: { filters?: FiltrosDoPagefind; sort?: Record<string, 'asc' | 'desc'> },
  ) => Promise<{ results: ResultadoDoPagefind[] } | null>;
  filters: () => Promise<ContagemDosFiltros>;
}

const TIPOS = Object.keys(TIPO_NO_INDICE) as TipoDoPost[];

function ehTipo(valor: string | null | undefined): valor is TipoDoPost {
  return TIPOS.includes(valor as TipoDoPost);
}

function limpo(valor: string | null | undefined): string | undefined {
  return valor?.trim() || undefined;
}

/** O estado da busca a partir da query string. Tipo desconhecido é ignorado. */
export function lerEstado(parametros: URLSearchParams): EstadoDaBusca {
  const tipo = parametros.get('tipo')?.trim().toLowerCase();
  return {
    q: parametros.get('q')?.trim() ?? '',
    tipo: ehTipo(tipo) ? tipo : undefined,
    categoria: limpo(parametros.get('categoria')),
    tag: limpo(parametros.get('tag')),
  };
}

/** A query string do estado, sem os campos vazios e sempre na mesma ordem. */
export function parametrosDoEstado(estado: EstadoDaBusca): URLSearchParams {
  const parametros = new URLSearchParams();
  const pares: [string, string | undefined][] = [
    ['q', limpo(estado.q)],
    ['tipo', estado.tipo],
    ['categoria', limpo(estado.categoria)],
    ['tag', limpo(estado.tag)],
  ];
  for (const [chave, valor] of pares) {
    if (valor) parametros.set(chave, valor);
  }
  return parametros;
}

/** `/busca?q=café&tipo=review`: o endereço que dá para compartilhar. */
export function urlDaBusca(estado: EstadoDaBusca): string {
  const query = parametrosDoEstado(estado).toString();
  return query ? `/busca?${query}` : '/busca';
}

/** Sem termo e sem filtro, não há o que buscar: a página pede para digitar algo. */
export function temBusca(estado: EstadoDaBusca): boolean {
  return Boolean(limpo(estado.q) || estado.tipo || limpo(estado.categoria) || limpo(estado.tag));
}

/**
 * Os filtros do Pagefind para o estado. A `categoria` da URL vale para o filtro `categoria` (das
 * reviews) ou `formato` (dos pensamentos): o nome basta, e os dois não se repetem.
 */
export function filtrosDoEstado(estado: EstadoDaBusca): FiltrosDoPagefind {
  const filtros: FiltrosDoPagefind = {};
  if (estado.tipo) filtros['tipo'] = TIPO_NO_INDICE[estado.tipo];
  const categoria = limpo(estado.categoria);
  if (categoria) filtros['any'] = [{ categoria }, { formato: categoria }];
  const tag = limpo(estado.tag);
  if (tag) filtros['tags'] = tag;
  return filtros;
}

/**
 * Com termo, o Pagefind ordena por relevância; só com filtros (`/busca?tipo=review`), os mais
 * recentes primeiro, pela data que o índice guarda em `data-pagefind-sort="date"`.
 */
export function ordemDoEstado(estado: EstadoDaBusca): Record<string, 'desc'> | undefined {
  return limpo(estado.q) ? undefined : { date: 'desc' };
}

// O `url` do Pagefind vem do arquivo, com barra no final; com o `trailingSlash: 'never'`, cada
// clique viraria um redirect. O `meta.url` do índice não tem barra; o outro é só reserva.
function semBarraNoFinal(url: string): string {
  return url.length > 1 ? url.replace(/\/+$/, '') : url;
}

/** O resultado do Pagefind no formato da UI. */
export function paraResultado(dados: DadosDoPagefind): ResultadoDeBusca {
  const tipoNoIndice = dados.filters['tipo']?.[0];
  const tipo =
    TIPOS.find((chave) => TIPO_NO_INDICE[chave] === tipoNoIndice) ??
    (dados.filters['formato'] ? 'pensamento' : 'review');
  const image = limpo(dados.meta['image']);
  return {
    url: limpo(dados.meta['url']) ?? semBarraNoFinal(dados.url),
    title: limpo(dados.meta['title']) ?? '',
    excerpt: dados.excerpt,
    image,
    image_alt: image ? (limpo(dados.meta['image_alt']) ?? '') : undefined,
    tipo,
    categoria: limpo(dados.filters['categoria']?.[0] ?? dados.filters['formato']?.[0]),
    nota: limpo(dados.meta['nota']),
    data: limpo(dados.meta['date']),
  };
}

function opcoes(contagem: Record<string, number> | undefined): OpcaoDeFiltro[] {
  return Object.entries(contagem ?? {})
    .filter(([, total]) => total > 0)
    .map(([valor, total]) => ({ valor, rotulo: valor, total }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

/** Os filtros do `pagefind.filters()`, com categorias e formatos numa lista só. */
export function paraFiltros(contagem: ContagemDosFiltros): FiltrosDisponiveis {
  const tipos = TIPOS.flatMap((tipo): OpcaoDeFiltro<TipoDoPost>[] => {
    const total = contagem['tipo']?.[TIPO_NO_INDICE[tipo]] ?? 0;
    return total > 0 ? [{ valor: tipo, rotulo: ROTULO_DO_TIPO[tipo], total }] : [];
  });
  const categorias = new Map<string, number>();
  for (const chave of ['categoria', 'formato']) {
    for (const [valor, total] of Object.entries(contagem[chave] ?? {})) {
      categorias.set(valor, (categorias.get(valor) ?? 0) + total);
    }
  }
  return {
    tipos,
    categorias: opcoes(Object.fromEntries(categorias)),
    tags: opcoes(contagem['tags']),
  };
}

/** Uma busca feita: o total e a primeira página, com o "carregar mais" para as seguintes. */
export interface PaginaDeResultados {
  estado: EstadoDaBusca;
  total: number;
  resultados: ResultadoDeBusca[];
  temMais: boolean;
  /** Os próximos `RESULTADOS_POR_PAGINA` resultados (só os novos). */
  carregarMais: () => Promise<ResultadoDeBusca[]>;
}

export interface Busca {
  /**
   * Busca depois de `ESPERA_DA_DIGITACAO_MS` sem nova chamada. Devolve `null` quando outra busca
   * veio depois (a resposta antiga não serve mais) e quando o estado não tem o que buscar.
   */
  buscar: (estado: EstadoDaBusca) => Promise<PaginaDeResultados | null>;
  /** Os filtros do índice inteiro. */
  filtros: () => Promise<FiltrosDisponiveis>;
}

export interface OpcoesDaBusca {
  /** Como carregar o Pagefind. Padrão: o import dinâmico de `CAMINHO_DO_PAGEFIND`. */
  carregar?: () => Promise<Pagefind>;
  espera?: number;
  porPagina?: number;
}

// Fora do bundle: o arquivo só existe na saída do build, e o Vite não deve tentar resolvê-lo.
const importarPagefind = () => import(/* @vite-ignore */ CAMINHO_DO_PAGEFIND) as Promise<Pagefind>;

/** A busca da página: carrega o índice na primeira chamada e reaproveita depois. */
export function criarBusca({
  carregar = importarPagefind,
  espera = ESPERA_DA_DIGITACAO_MS,
  porPagina = RESULTADOS_POR_PAGINA,
}: OpcoesDaBusca = {}): Busca {
  let carregando: Promise<Pagefind> | undefined;
  const pagefind = () => {
    carregando ??= carregar().then(async (modulo) => {
      await modulo.options({ excerptLength: TAMANHO_DO_TRECHO });
      await modulo.init();
      return modulo;
    });
    // Se o carregamento falhar (índice ausente no dev, rede), a próxima chamada tenta de novo.
    carregando.catch(() => {
      carregando = undefined;
    });
    return carregando;
  };

  let ultima = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let liberarAnterior: (() => void) | undefined;

  const esperar = () =>
    new Promise<boolean>((resolver) => {
      clearTimeout(timer);
      // A chamada anterior que ainda esperava não vai mais buscar: resolve com `false`.
      liberarAnterior?.();
      liberarAnterior = () => resolver(false);
      timer = setTimeout(() => {
        liberarAnterior = undefined;
        resolver(true);
      }, espera);
    });

  return {
    async buscar(estado) {
      const vez = ++ultima;
      if (!(await esperar()) || vez !== ultima || !temBusca(estado)) return null;

      const modulo = await pagefind();
      const sort = ordemDoEstado(estado);
      const resposta = await modulo.search(limpo(estado.q) ?? null, {
        filters: filtrosDoEstado(estado),
        ...(sort ? { sort } : {}),
      });
      if (!resposta || vez !== ultima) return null;

      const { results } = resposta;
      let carregados = 0;
      const proximos = async () => {
        const pedaco = results.slice(carregados, carregados + porPagina);
        carregados += pedaco.length;
        return Promise.all(pedaco.map(async (resultado) => paraResultado(await resultado.data())));
      };
      const resultados = await proximos();
      if (vez !== ultima) return null;

      const pagina: PaginaDeResultados = {
        estado,
        total: results.length,
        resultados,
        temMais: carregados < results.length,
        carregarMais: async () => {
          const novos = await proximos();
          pagina.temMais = carregados < results.length;
          return novos;
        },
      };
      return pagina;
    },

    async filtros() {
      return paraFiltros(await (await pagefind()).filters());
    },
  };
}

/** "1 resultado", "12 resultados" e, sem nada, "Nenhum resultado". */
export function rotuloDaContagem(total: number): string {
  if (total === 0) return 'Nenhum resultado';
  return `${total.toLocaleString('pt-BR')} ${total === 1 ? 'resultado' : 'resultados'}`;
}
