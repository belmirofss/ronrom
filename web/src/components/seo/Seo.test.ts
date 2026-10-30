import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it, vi } from 'vitest';
import Seo from '@/components/seo/Seo.astro';
import type { Metadados } from '@/lib/seo';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

async function renderizar(props: Metadados): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Seo, { props });
}

const contar = (html: string, trecho: string) => html.split(trecho).length - 1;

describe('<Seo>', () => {
  it('emite uma tag de cada, com canonical e og:image absolutos', async () => {
    const html = await renderizar({
      title: 'Sobre',
      description: 'A autora.',
      canonical: '/sobre/',
    });

    for (const trecho of [
      '<title>',
      'name="description"',
      'rel="canonical"',
      'name="robots"',
      'property="og:title"',
      'property="og:image"',
      'name="twitter:card"',
    ]) {
      expect(contar(html, trecho), trecho).toBe(1);
    }
    expect(html).toContain('<title>Sobre · Ronrom</title>');
    expect(html).toContain('<link rel="canonical" href="https://ronrom-blog.vercel.app/sobre">');
    expect(html).toContain('content="https://ronrom-blog.vercel.app/og-padrao.jpg"');
    expect(html).toContain('content="index,follow,max-image-preview:large"');
  });

  it('usa a tagline na home', async () => {
    const html = await renderizar({ description: 'Home.', canonical: '/' });

    expect(html).toContain('<title>Ronrom · Reviews e pensamentos</title>');
    expect(html).toContain('property="og:title" content="Ronrom · Reviews e pensamentos"');
  });

  it('pede noindex,follow quando a prop manda', async () => {
    const html = await renderizar({ description: 'Busca.', canonical: '/busca', noindex: true });

    expect(html).toContain('name="robots" content="noindex,follow"');
  });

  it('só emite as metas de artigo em article', async () => {
    const artigo = {
      title: 'Dias Perfeitos',
      description: 'Review.',
      canonical: '/reviews/filmes/dias-perfeitos',
      publishedTime: '2026-03-14T12:00:00-03:00',
      tags: ['Japão', 'Cinema'],
      section: 'Filmes',
    };

    expect(await renderizar(artigo)).not.toContain('article:');

    const html = await renderizar({ ...artigo, type: 'article' });
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('property="article:published_time"');
    expect(html).toContain('property="article:section" content="Filmes"');
    expect(contar(html, 'property="article:tag"')).toBe(2);
  });

  it('avisa no build quando o título passa de 65 caracteres', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await renderizar({ title: 'x'.repeat(60), description: 'Longo.', canonical: '/x' });

    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('Título com 69 caracteres'));
    aviso.mockRestore();
  });
});
