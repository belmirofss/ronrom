import { describe, expect, it, vi } from 'vitest';
import { canonicalUrl, urlDaCategoria } from '@/lib/rotas';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

describe('urlDaCategoria', () => {
  it('monta o caminho da categoria', () => {
    expect(urlDaCategoria('restaurantes-e-cafes')).toBe('/reviews/restaurantes-e-cafes');
  });
});

describe('canonicalUrl', () => {
  it('mantém a barra só na home', () => {
    expect(canonicalUrl('/')).toBe('https://ronrom-blog.vercel.app/');
  });

  it('tira a barra do final', () => {
    expect(canonicalUrl('/reviews/filmes/dias-perfeitos/')).toBe(
      'https://ronrom-blog.vercel.app/reviews/filmes/dias-perfeitos',
    );
  });

  it('dá o mesmo resultado com barra, com index.html e sem nada', () => {
    const esperado = 'https://ronrom-blog.vercel.app/sobre';
    expect(canonicalUrl('/sobre/')).toBe(esperado);
    expect(canonicalUrl('/sobre/index.html')).toBe(esperado);
    expect(canonicalUrl('/sobre.html')).toBe(esperado);
    expect(canonicalUrl('/sobre')).toBe(esperado);
    expect(canonicalUrl('/index.html')).toBe('https://ronrom-blog.vercel.app/');
  });

  it('tira a query string e o fragmento', () => {
    expect(canonicalUrl('/busca?q=cafe')).toBe('https://ronrom-blog.vercel.app/busca');
    expect(canonicalUrl('/sobre#redes')).toBe('https://ronrom-blog.vercel.app/sobre');
  });

  it('recusa URL absoluta e caminho sem barra no começo', () => {
    expect(() => canonicalUrl('https://outro.site/x')).toThrow();
    expect(() => canonicalUrl('//outro.site/x')).toThrow();
    expect(() => canonicalUrl('sobre')).toThrow();
  });

  it('funciona com a SITE_URL terminando em barra', async () => {
    vi.resetModules();
    vi.doMock('astro:env/client', () => ({ SITE_URL: 'https://ronrom.com.br/' }));
    const rotas = await import('@/lib/rotas');

    expect(rotas.canonicalUrl('/sobre/')).toBe('https://ronrom.com.br/sobre');
    expect(rotas.canonicalUrl('/')).toBe('https://ronrom.com.br/');
    vi.doUnmock('astro:env/client');
  });
});
