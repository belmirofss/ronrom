import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  criarBusca,
  filtrosDoEstado,
  lerEstado,
  ordemDoEstado,
  paraFiltros,
  paraResultado,
  rotuloDaContagem,
  temBusca,
  urlDaBusca,
  type DadosDoPagefind,
  type Pagefind,
} from '@/lib/busca-cliente';

const diasPerfeitos: DadosDoPagefind = {
  url: '/reviews/filmes/dias-perfeitos/',
  excerpt: 'Hirayama toma <mark>café</mark> em lata',
  meta: {
    title: 'Dias Perfeitos',
    url: '/reviews/filmes/dias-perfeitos',
    image: 'https://cdn.sanity.io/images/abc/production/f00.jpg?w=320',
    image_alt: 'Hirayama no banheiro público',
    date: '2025-03-10T12:00:00Z',
    nota: '4,5 corações',
  },
  filters: {
    tipo: ['Review'],
    categoria: ['Filmes'],
    nota: ['4,5 corações'],
  },
};

const sobreCafe: DadosDoPagefind = {
  url: '/pensamentos/textos/sobre-cafe/',
  excerpt: 'o <mark>café</mark> da manhã',
  meta: { title: 'Sobre café', date: '2025-01-02T12:00:00Z' },
  filters: { tipo: ['Pensamento'], formato: ['Textos'] },
};

describe('lerEstado', () => {
  it('lê os três parâmetros, com o tipo em minúsculas', () => {
    const estado = lerEstado(new URLSearchParams('q=+caf%C3%A9+&tipo=Review&categoria=Filmes'));
    expect(estado).toEqual({ q: 'café', tipo: 'review', categoria: 'Filmes' });
  });

  it('ignora tipo desconhecido e campos vazios', () => {
    expect(lerEstado(new URLSearchParams('tipo=receita&categoria=%20'))).toEqual({
      q: '',
      tipo: undefined,
      categoria: undefined,
    });
  });
});

describe('urlDaBusca', () => {
  it('monta a query na ordem fixa e sem campos vazios', () => {
    expect(urlDaBusca({ categoria: 'Séries', q: 'café', tipo: undefined })).toBe(
      '/busca?q=caf%C3%A9&categoria=S%C3%A9ries',
    );
    expect(urlDaBusca({ q: '  ' })).toBe('/busca');
  });

  it('volta ao mesmo estado ao ler a própria URL', () => {
    const estado = { q: 'café', tipo: 'pensamento' as const, categoria: 'Textos' };
    const url = new URL(urlDaBusca(estado), 'https://ronrom.blog');
    expect(lerEstado(url.searchParams)).toEqual(estado);
  });
});

describe('temBusca', () => {
  it('pede termo ou algum filtro', () => {
    expect(temBusca({ q: '' })).toBe(false);
    expect(temBusca({ q: ' ' })).toBe(false);
    expect(temBusca({ q: 'café' })).toBe(true);
    expect(temBusca({ q: '', tipo: 'review' })).toBe(true);
  });
});

describe('filtrosDoEstado e ordemDoEstado', () => {
  it('traduz o tipo e casa a categoria com categoria ou formato', () => {
    expect(filtrosDoEstado({ q: 'x', tipo: 'review', categoria: 'Filmes' })).toEqual({
      tipo: 'Review',
      any: [{ categoria: 'Filmes' }, { formato: 'Filmes' }],
    });
    expect(filtrosDoEstado({ q: 'x' })).toEqual({});
  });

  it('ordena por data só sem termo', () => {
    expect(ordemDoEstado({ q: 'café' })).toBeUndefined();
    expect(ordemDoEstado({ q: '', tipo: 'review' })).toEqual({ date: 'desc' });
  });
});

describe('paraResultado', () => {
  it('usa os metadados do índice, com o meta.url sem barra', () => {
    expect(paraResultado(diasPerfeitos)).toEqual({
      url: '/reviews/filmes/dias-perfeitos',
      title: 'Dias Perfeitos',
      excerpt: 'Hirayama toma <mark>café</mark> em lata',
      image: 'https://cdn.sanity.io/images/abc/production/f00.jpg?w=320',
      image_alt: 'Hirayama no banheiro público',
      tipo: 'review',
      categoria: 'Filmes',
      nota: '4,5 corações',
      data: '2025-03-10T12:00:00Z',
    });
  });

  it('cai no url do Pagefind sem a barra e lê o formato do pensamento', () => {
    expect(paraResultado(sobreCafe)).toMatchObject({
      url: '/pensamentos/textos/sobre-cafe',
      tipo: 'pensamento',
      categoria: 'Textos',
      image: undefined,
      image_alt: undefined,
      nota: undefined,
    });
  });
});

describe('paraFiltros', () => {
  it('junta categorias e formatos, sem valores zerados, em ordem alfabética', () => {
    expect(
      paraFiltros({
        tipo: { Review: 3, Pensamento: 1 },
        categoria: { Séries: 1, Filmes: 2 },
        formato: { Textos: 1, Opiniões: 0 },
      }),
    ).toEqual({
      tipos: [
        { valor: 'review', rotulo: 'Reviews', total: 3 },
        { valor: 'pensamento', rotulo: 'Pensamentos', total: 1 },
      ],
      categorias: [
        { valor: 'Filmes', rotulo: 'Filmes', total: 2 },
        { valor: 'Séries', rotulo: 'Séries', total: 1 },
        { valor: 'Textos', rotulo: 'Textos', total: 1 },
      ],
    });
  });
});

describe('rotuloDaContagem', () => {
  it('concorda o número', () => {
    expect(rotuloDaContagem(0)).toBe('Nenhum resultado');
    expect(rotuloDaContagem(1)).toBe('1 resultado');
    expect(rotuloDaContagem(1200)).toBe('1.200 resultados');
  });
});

describe('criarBusca', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function falsoPagefind(total: number) {
    const resultados = Array.from({ length: total }, (_, i) => ({
      id: String(i),
      data: vi.fn(async () => ({
        ...diasPerfeitos,
        meta: { ...diasPerfeitos.meta, url: `/post-${i}` },
      })),
    }));
    const pagefind = {
      options: vi.fn(async () => {}),
      init: vi.fn(async () => {}),
      search: vi.fn(async () => ({ results: resultados })),
      filters: vi.fn(async () => ({ tipo: { Review: total } })),
    } satisfies Pagefind;
    return { pagefind, resultados };
  }

  it('carrega o índice uma vez, com o tamanho do trecho, e pagina de 10 em 10', async () => {
    const { pagefind, resultados } = falsoPagefind(23);
    const carregar = vi.fn(async () => pagefind);
    const busca = criarBusca({ carregar });

    const pedido = busca.buscar({ q: 'café', tipo: 'review' });
    await vi.advanceTimersByTimeAsync(200);
    const pagina = await pedido;

    expect(carregar).toHaveBeenCalledTimes(1);
    expect(pagefind.options).toHaveBeenCalledWith({ excerptLength: 24 });
    expect(pagefind.search).toHaveBeenCalledWith('café', { filters: { tipo: 'Review' } });
    expect(pagina?.total).toBe(23);
    expect(pagina?.resultados).toHaveLength(10);
    expect(pagina?.temMais).toBe(true);
    // Só a primeira página teve os dados carregados.
    expect(resultados[10]?.data).not.toHaveBeenCalled();

    expect(await pagina?.carregarMais()).toHaveLength(10);
    const ultimos = await pagina?.carregarMais();
    expect(ultimos?.map(({ url }) => url)).toEqual(['/post-20', '/post-21', '/post-22']);
    expect(pagina?.temMais).toBe(false);

    await busca.filtros();
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  it('espera 200 ms sem nova chamada e descarta as anteriores', async () => {
    const { pagefind } = falsoPagefind(1);
    const busca = criarBusca({ carregar: async () => pagefind });

    const primeira = busca.buscar({ q: 'ca' });
    await vi.advanceTimersByTimeAsync(150);
    const segunda = busca.buscar({ q: 'café' });
    await vi.advanceTimersByTimeAsync(150);
    expect(pagefind.search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50);

    expect(await primeira).toBeNull();
    expect((await segunda)?.estado.q).toBe('café');
    expect(pagefind.search).toHaveBeenCalledTimes(1);
  });

  it('busca só com filtro, pelos mais recentes, e não busca sem nada', async () => {
    const { pagefind } = falsoPagefind(1);
    const busca = criarBusca({ carregar: async () => pagefind });

    const vazia = busca.buscar({ q: ' ' });
    await vi.advanceTimersByTimeAsync(200);
    expect(await vazia).toBeNull();
    expect(pagefind.search).not.toHaveBeenCalled();

    const pedido = busca.buscar({ q: '', categoria: 'Filmes' });
    await vi.advanceTimersByTimeAsync(200);
    await pedido;
    expect(pagefind.search).toHaveBeenCalledWith(null, {
      filters: { any: [{ categoria: 'Filmes' }, { formato: 'Filmes' }] },
      sort: { date: 'desc' },
    });
  });

  it('tenta carregar de novo depois de uma falha', async () => {
    const { pagefind } = falsoPagefind(1);
    const carregar = vi
      .fn<() => Promise<Pagefind>>()
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValue(pagefind);
    const busca = criarBusca({ carregar, espera: 0 });

    await expect(busca.filtros()).rejects.toThrow('404');
    await expect(busca.filtros()).resolves.toMatchObject({ tipos: [{ valor: 'review' }] });
    expect(carregar).toHaveBeenCalledTimes(2);
  });
});
