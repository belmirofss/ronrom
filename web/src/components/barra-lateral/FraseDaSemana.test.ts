import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import FraseDaSemana from '@/components/barra-lateral/FraseDaSemana.astro';

async function renderizar(frase: { texto?: string | null; autoria?: string | null } | null) {
  const container = await AstroContainer.create();
  return container.renderToString(FraseDaSemana, { props: { frase } });
}

describe('<FraseDaSemana>', () => {
  it('mostra a frase num <blockquote> com a autoria no <figcaption>', async () => {
    const html = await renderizar({ texto: 'Devagar também chega.', autoria: 'Ditado de avó' });

    expect(html).toMatch(/<blockquote[^>]*>\s*<p[^>]*>Devagar também chega\.<\/p>/);
    expect(html).toMatch(/<figcaption[^>]*>— Ditado de avó<\/figcaption>/);
    expect(html).toContain('superficie-vinho');
  });

  it('não tem <figcaption> sem autoria', async () => {
    const html = await renderizar({ texto: 'Devagar também chega.', autoria: '' });

    expect(html).toContain('<blockquote');
    expect(html).not.toContain('<figcaption');
  });

  it('não renderiza nada sem frase cadastrada', async () => {
    expect((await renderizar(null)).trim()).toBe('');
    expect((await renderizar({ texto: '   ', autoria: 'Ditado de avó' })).trim()).toBe('');
  });
});
