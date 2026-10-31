import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonicalUrl, urlDaCategoria, urlDaPagina, urlDoFormato, urlDoPost } from '@/lib/rotas';

// A URL base não pode depender do web/.env de quem roda o teste (docs/testes.md).
vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

// Os exemplos de docs/seo-urls.md#exemplos-viram-casos-de-teste, um `it` por linha.
describe('exemplos do seo-urls.md', () => {
  it('review: /reviews/{categoria}/{slug}', () => {
    expect(
      urlDoPost({ tipo: 'review', slug: 'dias-perfeitos', categoria: { slug: 'filmes' } }),
    ).toBe('/reviews/filmes/dias-perfeitos');
  });

  it('pensamento: /pensamentos/{formato}/{slug}', () => {
    expect(
      urlDoPost({ tipo: 'pensamento', slug: 'sobre-gatos', formato: { slug: 'frases' } }),
    ).toBe('/pensamentos/frases/sobre-gatos');
  });

  it('review sem categoria lança erro', () => {
    expect(() => urlDoPost({ tipo: 'review', slug: 'x' })).toThrow();
  });

  it('categoria: /reviews/{slug}', () => {
    expect(urlDaCategoria('restaurantes-e-cafes')).toBe('/reviews/restaurantes-e-cafes');
  });

  it('página 1 é a própria listagem', () => {
    expect(urlDaPagina('/reviews/filmes', 1)).toBe('/reviews/filmes');
  });

  it('página 2 em diante fica em /pagina/{n}', () => {
    expect(urlDaPagina('/reviews/filmes', 2)).toBe('/reviews/filmes/pagina/2');
  });

  it('página 0 lança erro', () => {
    expect(() => urlDaPagina('/posts', 0)).toThrow();
  });

  it('canonical da home termina em /', () => {
    expect(canonicalUrl('/')).toBe('https://ronrom-blog.vercel.app/');
  });

  it('canonical tira a barra final', () => {
    expect(canonicalUrl('/reviews/filmes/dias-perfeitos/')).toBe(
      'https://ronrom-blog.vercel.app/reviews/filmes/dias-perfeitos',
    );
  });

  it('canonical tira a query string', () => {
    expect(canonicalUrl('/busca?q=cafe')).toBe('https://ronrom-blog.vercel.app/busca');
  });

  it('canonical recusa URL absoluta', () => {
    expect(() => canonicalUrl('https://outro.site/x')).toThrow();
  });
});

describe('urlDoPost', () => {
  it('pensamento sem formato lança erro', () => {
    expect(() => urlDoPost({ tipo: 'pensamento', slug: 'x', formato: null })).toThrow();
    expect(() => urlDoPost({ tipo: 'pensamento', slug: 'x', formato: { slug: null } })).toThrow();
  });

  it('não usa a seção do outro tipo', () => {
    // Pensamento com categoria (sobra de quando era review) continua sem formato.
    expect(() =>
      urlDoPost({ tipo: 'pensamento', slug: 'x', categoria: { slug: 'filmes' }, formato: null }),
    ).toThrow();
  });

  it('lança erro sem slug', () => {
    expect(() => urlDoPost({ tipo: 'review', categoria: { slug: 'filmes' } })).toThrow();
    expect(() => urlDoPost({ tipo: 'review', slug: '', categoria: { slug: 'filmes' } })).toThrow();
    expect(() =>
      urlDoPost({ tipo: 'review', slug: null, categoria: { slug: 'filmes' } }),
    ).toThrow();
  });

  it.each(['Dias Perfeitos', 'dias_perfeitos', 'café', '-dias', 'dias--perfeitos', 'pagina'])(
    'lança erro com o slug "%s"',
    (slug) => {
      expect(() => urlDoPost({ tipo: 'review', slug, categoria: { slug: 'filmes' } })).toThrow(
        /Slug inválido/,
      );
    },
  );

  it('lança erro com slug de categoria fora do formato', () => {
    expect(() => urlDoPost({ tipo: 'review', slug: 'x', categoria: { slug: 'Filmes' } })).toThrow();
  });
});

describe('urlDoFormato e urlDaCategoria', () => {
  it('formato: /pensamentos/{slug}', () => {
    expect(urlDoFormato('opinioes')).toBe('/pensamentos/opinioes');
  });

  it.each([
    ['urlDaCategoria', urlDaCategoria],
    ['urlDoFormato', urlDoFormato],
  ])('%s recusa slug fora do formato e o reservado "pagina"', (_nome, helper) => {
    expect(() => helper('Café')).toThrow();
    expect(() => helper('')).toThrow();
    expect(() => helper('pagina')).toThrow();
  });
});

describe('urlDaPagina', () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('lança erro com n = %s', (n) => {
    expect(() => urlDaPagina('/posts', n)).toThrow(/Página inválida/);
  });

  it.each(['/', '', 'posts', '/posts/', '/reviews/Filmes'])(
    'lança erro com a base "%s"',
    (base) => {
      expect(() => urlDaPagina(base, 2)).toThrow(/Base de listagem inválida/);
    },
  );

  it('funciona com a base de qualquer listagem', () => {
    expect(urlDaPagina(urlDoFormato('frases'), 3)).toBe('/pensamentos/frases/pagina/3');
    expect(urlDaPagina('/posts', 10)).toBe('/posts/pagina/10');
  });
});

describe('barra final', () => {
  it('nenhum helper de caminho termina em /', () => {
    const caminhos = [
      urlDoPost({ tipo: 'review', slug: 'a', categoria: { slug: 'filmes' } }),
      urlDoPost({ tipo: 'pensamento', slug: 'a', formato: { slug: 'frases' } }),
      urlDaCategoria('filmes'),
      urlDoFormato('frases'),
      urlDaPagina('/posts', 1),
      urlDaPagina('/posts', 2),
    ];
    for (const caminho of caminhos) expect(caminho).not.toMatch(/\/$/);
  });

  it('/sobre/, /sobre/index.html, /sobre.html e /sobre dão a mesma canonical', () => {
    const esperado = 'https://ronrom-blog.vercel.app/sobre';
    expect(canonicalUrl('/sobre/')).toBe(esperado);
    expect(canonicalUrl('/sobre/index.html')).toBe(esperado);
    expect(canonicalUrl('/sobre.html')).toBe(esperado);
    expect(canonicalUrl('/sobre')).toBe(esperado);
  });

  it('/index.html e /?q=x viram a canonical da home', () => {
    expect(canonicalUrl('/index.html')).toBe('https://ronrom-blog.vercel.app/');
    expect(canonicalUrl('/?q=x')).toBe('https://ronrom-blog.vercel.app/');
  });
});

describe('canonicalUrl', () => {
  afterEach(() => {
    vi.doUnmock('astro:env/client');
    vi.resetModules();
  });

  it('tira o #fragmento', () => {
    expect(canonicalUrl('/sobre#autora')).toBe('https://ronrom-blog.vercel.app/sobre');
    expect(canonicalUrl('/busca?q=cafe#resultados')).toBe('https://ronrom-blog.vercel.app/busca');
  });

  it.each(['//outro.site/x', 'sobre', 'http://ronrom-blog.vercel.app/sobre', ''])(
    'recusa "%s"',
    (path) => {
      expect(() => canonicalUrl(path)).toThrow();
    },
  );

  it.each(['https://ronrom.com.br', 'https://ronrom.com.br/'])(
    'usa a origem da SITE_URL, com ou sem barra no fim (%s)',
    async (siteUrl) => {
      vi.resetModules();
      vi.doMock('astro:env/client', () => ({ SITE_URL: siteUrl }));
      const rotas = await import('@/lib/rotas');

      expect(rotas.canonicalUrl('/')).toBe('https://ronrom.com.br/');
      expect(rotas.canonicalUrl('/reviews/filmes/')).toBe('https://ronrom.com.br/reviews/filmes');
    },
  );
});
