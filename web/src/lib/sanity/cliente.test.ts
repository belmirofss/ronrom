import { beforeEach, describe, expect, it, vi } from 'vitest';

// Modo Sanity com o @sanity/client trocado por um dublê: confere a configuração do cliente e os
// parâmetros enviados, sem rede.
const { createClient, fetch } = vi.hoisted(() => {
  const fetch = vi.fn(async () => ({ ok: true }));
  return { fetch, createClient: vi.fn(() => ({ fetch })) };
});

vi.mock('@sanity/client', () => ({ createClient }));
vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: false,
  SANITY_PROJECT_ID: 'projeto',
  SANITY_DATASET: 'development',
  SANITY_API_VERSION: '2025-02-19',
  SANITY_API_READ_TOKEN: 'token-secreto',
}));

describe('cliente do Sanity', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('lê só o publicado, sem CDN, com a versão da API fixa e sem token', async () => {
    await import('./cliente');

    expect(createClient).toHaveBeenCalledExactlyOnceWith({
      projectId: 'projeto',
      dataset: 'development',
      apiVersion: '2025-02-19',
      useCdn: false,
      perspective: 'published',
    });
  });

  it('manda a consulta e os parâmetros, inclusive o $tag, para o Sanity', async () => {
    const { consultar } = await import('./cliente');

    expect(await consultar('*[slug.current == $tag]', { tag: 'cafe', inicio: 0 })).toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledExactlyOnceWith('*[slug.current == $tag]', {
      tag: 'cafe',
      inicio: 0,
    });
  });
});
