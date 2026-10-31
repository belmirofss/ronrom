import { describe, expect, it, vi } from 'vitest';

// O projeto ronrom-previa (#43) builda com VERCEL_ENV=production, como o site: a prévia de
// rascunhos não pode sair indexável por isso.
vi.mock('astro:env/server', async (original) => ({
  ...(await original<object>()),
  VERCEL_ENV: 'production',
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: true,
}));

describe('indexação na prévia de rascunhos', () => {
  it('bloqueia o robots.txt e as páginas mesmo com VERCEL_ENV=production', async () => {
    const { ROBOTS_BLOQUEADO, robotsDaPagina, SITE_INDEXAVEL } = await import('./seo');

    expect(SITE_INDEXAVEL).toBe(false);
    expect(robotsDaPagina(false)).toBe(ROBOTS_BLOQUEADO);
  });
});
