import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Umami from '@/components/layout/Umami.astro';

const ID = '3f2b8c1e-7a4d-4e9b-9c1a-2d5e6f7a8b9c';

const ambiente = vi.hoisted(() => ({
  PUBLIC_UMAMI_ID: undefined as string | undefined,
  VERCEL_ENV: undefined as string | undefined,
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: false,
}));

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom.blog' }));
vi.mock('astro:env/server', () => ambiente);

async function renderizar(): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Umami);
}

describe('<Umami>', () => {
  beforeEach(() => {
    ambiente.PUBLIC_UMAMI_ID = ID;
    ambiente.VERCEL_ENV = 'production';
    ambiente.PUBLIC_SANITY_VISUAL_EDITING_ENABLED = false;
  });

  it('em produção, carrega o script sem cookies, com Do Not Track e só no host do site', async () => {
    const html = await renderizar();

    expect(html).toContain('src="https://cloud.umami.is/script.js"');
    expect(html).toMatch(/<script[^>]* defer/);
    expect(html).toContain(`data-website-id="${ID}"`);
    expect(html).toContain('data-domains="ronrom.blog"');
    expect(html).toContain('data-do-not-track="true"');
    expect(html).toContain('data-exclude-search="true"');
  });

  it('não sai nos previews, na prévia de rascunhos nem sem o website-id', async () => {
    ambiente.VERCEL_ENV = 'preview';
    expect(await renderizar()).not.toContain('<script');

    ambiente.VERCEL_ENV = 'production';
    ambiente.PUBLIC_SANITY_VISUAL_EDITING_ENABLED = true;
    expect(await renderizar()).not.toContain('<script');

    ambiente.PUBLIC_SANITY_VISUAL_EDITING_ENABLED = false;
    ambiente.PUBLIC_UMAMI_ID = undefined;
    expect(await renderizar()).not.toContain('<script');
  });
});
