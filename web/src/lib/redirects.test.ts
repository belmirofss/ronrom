import { describe, expect, it } from 'vitest';

import {
  caminhosDasPaginas,
  conferirRedirects,
  type DadosDosRedirects,
  montarRedirects,
  type PostComAnteriores,
} from '@/lib/redirects';
import { buscarDadosDosRedirects } from '@/lib/sanity/redirects';

const filme = (slug: string, anteriores: string[] | null = null): PostComAnteriores => ({
  tipo: 'review',
  slug,
  categoria: { slug: 'filmes' },
  formato: null,
  anteriores,
});

function dados(parcial: Partial<DadosDosRedirects>): DadosDosRedirects {
  const posts = parcial.posts ?? [];
  return {
    fixos: {},
    posts,
    rotasDosPosts: posts,
    taxonomia: { categorias: [{ slug: 'filmes' }], formatos: [{ slug: 'frases' }] },
    paginas: ['/', '/sobre', '/reviews'],
    ...parcial,
  };
}

describe('montarRedirects', () => {
  it('leva cada caminho antigo ao endereço atual do post, com 301', () => {
    const { redirects, avisos } = montarRedirects(
      dados({
        posts: [filme('novo', ['/reviews/filmes/antigo', '/reviews/series/novo'])],
      }),
    );
    expect(redirects).toEqual({
      '/reviews/filmes/antigo': { status: 301, destination: '/reviews/filmes/novo' },
      '/reviews/series/novo': { status: 301, destination: '/reviews/filmes/novo' },
    });
    expect(avisos).toEqual([]);
  });

  it('junta os fixos, com o status de cada um', () => {
    const { redirects } = montarRedirects(
      dados({
        fixos: { '/contato': '/sobre', '/promo': { status: 302, destination: '/reviews' } },
      }),
    );
    expect(redirects).toEqual({
      '/contato': { status: 301, destination: '/sobre' },
      '/promo': { status: 302, destination: '/reviews' },
    });
  });

  it('encurta a cadeia: A → B → C vira A → C', () => {
    const { redirects, avisos } = montarRedirects(
      dados({
        fixos: { '/atalho': '/reviews/filmes/antigo' },
        posts: [filme('novo', ['/reviews/filmes/antigo'])],
      }),
    );
    expect(redirects['/atalho']).toEqual({ status: 301, destination: '/reviews/filmes/novo' });
    expect(avisos).toHaveLength(1);
  });

  it('falha com loop', () => {
    expect(() => montarRedirects(dados({ fixos: { '/a': '/b', '/b': '/c', '/c': '/a' } }))).toThrow(
      'loop em /a → /b → /c → /a',
    );
    expect(() => montarRedirects(dados({ fixos: { '/a': '/a' } }))).toThrow('loop');
  });

  it('ignora, com aviso, o caminho antigo que hoje é de outro post', () => {
    const { redirects, avisos } = montarRedirects(
      dados({ posts: [filme('novo', ['/reviews/filmes/outro']), filme('outro')] }),
    );
    expect(redirects).toEqual({});
    expect(avisos).toEqual([expect.stringContaining('/reviews/filmes/outro')]);
  });

  it('ignora o próprio endereço atual na lista de antigos', () => {
    const { redirects, avisos } = montarRedirects(
      dados({ posts: [filme('novo', ['/reviews/filmes/novo'])] }),
    );
    expect(redirects).toEqual({});
    expect(avisos).toEqual([]);
  });

  it('falha com redirect fixo por cima de uma página, um post ou uma listagem', () => {
    for (const origem of [
      '/sobre',
      '/reviews/filmes/novo',
      '/reviews/filmes',
      '/pensamentos/frases',
    ]) {
      expect(() =>
        montarRedirects(dados({ fixos: { [origem]: '/' }, posts: [filme('novo')] })),
      ).toThrow(`${origem} (web/redirects.mjs)`);
    }
  });

  it('falha com um caminho que leva a dois lugares', () => {
    expect(() =>
      montarRedirects(
        dados({
          fixos: { '/reviews/filmes/antigo': '/sobre' },
          posts: [filme('novo', ['/reviews/filmes/antigo'])],
        }),
      ),
    ).toThrow('leva a dois lugares');
    expect(() =>
      montarRedirects(
        dados({
          posts: [filme('um', ['/reviews/filmes/x']), filme('dois', ['/reviews/filmes/x'])],
        }),
      ),
    ).toThrow('leva a dois lugares');
  });

  it('falha com caminho fora do formato', () => {
    for (const caminho of ['sobre', '/sobre/', 'https://ronrom.com.br/sobre', '/a?b=1']) {
      expect(() => montarRedirects(dados({ fixos: { [caminho]: '/' } }))).toThrow(
        'não é um caminho do site',
      );
      expect(() => montarRedirects(dados({ fixos: { '/x': caminho } }))).toThrow(
        'não é um caminho do site',
      );
    }
  });

  it('aceita a rota com parâmetro da troca de slug de categoria, sem seguir a cadeia', () => {
    const { redirects } = montarRedirects(
      dados({ fixos: { '/reviews/antigo/[slug]': '/reviews/filmes/[slug]' } }),
    );
    expect(redirects).toEqual({
      '/reviews/antigo/[slug]': { status: 301, destination: '/reviews/filmes/[slug]' },
    });
  });
});

describe('conferirRedirects', () => {
  it('passa quando todo destino é uma página gerada', () => {
    expect(() =>
      conferirRedirects({ '/x': { status: 301, destination: '/sobre' } }, ['/', '/sobre']),
    ).not.toThrow();
  });

  it('falha listando os destinos que não existem', () => {
    expect(() =>
      conferirRedirects(
        {
          '/x': { status: 301, destination: '/sumiu' },
          '/y': { status: 301, destination: '/sobre' },
          '/z': { status: 301, destination: '/tambem-sumiu' },
        },
        ['/sobre'],
      ),
    ).toThrow('- /x → /sumiu\n- /z → /tambem-sumiu');
  });

  it('não confere destino com parâmetro', () => {
    expect(() =>
      conferirRedirects({ '/a/[slug]': { status: 301, destination: '/b/[slug]' } }, []),
    ).not.toThrow();
  });
});

describe('caminhosDasPaginas', () => {
  it('só as páginas sem parâmetro, com o caminho do site', () => {
    expect(
      caminhosDasPaginas([
        '404.astro',
        'index.astro',
        'sobre.astro',
        'api/health.ts',
        'posts-index.json.ts',
        'reviews/index.astro',
        'reviews/[categoria]/index.astro',
        'reviews/pagina/[n].astro',
        '_rascunho.astro',
        'reviews/_partes/Card.astro',
        'leia-me.txt',
      ]),
    ).toEqual(['/404', '/', '/sobre', '/api/health', '/posts-index.json', '/reviews']);
  });
});

describe('redirects das fixtures', () => {
  it('o endereço antigo da frase leva ao novo', async () => {
    const { redirects, avisos } = montarRedirects({
      fixos: {},
      paginas: [],
      ...(await buscarDadosDosRedirects({ tipo: 'fixtures', motivo: 'teste' })),
    });
    expect(redirects).toEqual({
      '/pensamentos/frases/gatos': { status: 301, destination: '/pensamentos/frases/sobre-gatos' },
    });
    expect(avisos).toEqual([]);
  });
});
