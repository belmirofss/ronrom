import { describe, expect, it, vi } from 'vitest';

import { filtroDoStega } from './stega';

// O cliente no build da prévia de rascunhos (#43), com o @sanity/client e o
// @sanity/preview-url-secret trocados por dublês: confere que a prévia lê os rascunhos com o token
// e o stega, e que o segredo do Presentation é conferido sem stega.
const { createClient, validatePreviewUrl } = vi.hoisted(() => {
  return {
    createClient: vi.fn((config: object) => ({ fetch: vi.fn(), config })),
    validatePreviewUrl: vi.fn(async () => ({ isValid: true, redirectTo: '/sobre' })),
  };
});

vi.mock('@sanity/client', () => ({ createClient }));
vi.mock('@sanity/preview-url-secret', () => ({ validatePreviewUrl }));
vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: false,
  SANITY_PROJECT_ID: 'projeto',
  SANITY_DATASET: 'production',
  SANITY_API_VERSION: '2025-02-19',
  STUDIO_URL: 'https://ronrom.sanity.studio',
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: true,
  SANITY_API_READ_TOKEN: 'token-secreto',
}));

describe('cliente do Sanity na prévia', () => {
  it('lê os rascunhos com o token viewer e marca os textos com o stega', async () => {
    await import('./cliente');

    expect(createClient).toHaveBeenCalledExactlyOnceWith({
      projectId: 'projeto',
      dataset: 'production',
      apiVersion: '2025-02-19',
      useCdn: false,
      perspective: 'drafts',
      token: 'token-secreto',
      stega: { enabled: true, studioUrl: 'https://ronrom.sanity.studio', filter: filtroDoStega },
    });
  });

  it('confere o segredo do Presentation com o cliente sem stega', async () => {
    const { validarUrlDaPrevia } = await import('./cliente');
    const url = 'https://ronrom-previa.vercel.app/api/previa/ativar?sanity-preview-secret=x';

    expect(await validarUrlDaPrevia(url)).toEqual({ isValid: true, redirectTo: '/sobre' });
    expect(validatePreviewUrl).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        config: expect.objectContaining({
          perspective: 'drafts',
          token: 'token-secreto',
          stega: false,
        }),
      }),
      url,
    );
  });
});
