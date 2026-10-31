import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Abas from '@/components/ui/Abas.astro';

const ABAS = [
  { id: 'ultimos', titulo: 'Últimos posts' },
  { id: 'mais-lidos', titulo: 'Mais lidos' },
];

async function renderizar(slots: Record<string, string> = {}) {
  const container = await AstroContainer.create();
  return container.renderToString(Abas, {
    props: { abas: ABAS, rotulo: 'Posts' },
    slots: {
      ultimos: '<p>Lista dos últimos</p>',
      'mais-lidos': '<p>Lista dos mais lidos</p>',
      ...slots,
    },
  });
}

function contar(html: string, trecho: string) {
  return html.split(trecho).length - 1;
}

describe('<Abas>', () => {
  it('monta um tablist com nome e uma aba por item', async () => {
    const html = await renderizar();

    expect(contar(html, 'role="tablist"')).toBe(1);
    expect(html).toContain('aria-label="Posts"');
    expect(contar(html, 'role="tab"')).toBe(2);
  });

  it('começa com a primeira aba selecionada e só ela na ordem do Tab', async () => {
    const html = await renderizar();

    expect(html).toMatch(/id="aba-ultimos"[^>]*aria-selected="true"[^>]*tabindex="0"/);
    expect(html).toMatch(/id="aba-mais-lidos"[^>]*aria-selected="false"[^>]*tabindex="-1"/);
  });

  it('liga cada aba ao seu painel', async () => {
    const html = await renderizar();

    expect(html).toContain('aria-controls="painel-ultimos"');
    expect(html).toContain('aria-controls="painel-mais-lidos"');
    expect(html).toContain('id="painel-ultimos"');
    expect(html).toContain('id="painel-mais-lidos"');
  });

  it('dá a cada painel um título, para funcionar sem JS', async () => {
    const html = await renderizar();

    expect(html).toMatch(/<section[^>]*id="painel-ultimos"[^>]*aria-labelledby="titulo-ultimos"/);
    expect(html).toMatch(/<h2[^>]*id="titulo-ultimos"[^>]*>\s*Últimos posts\s*<\/h2>/);
    expect(html).toMatch(/<h2[^>]*id="titulo-mais-lidos"[^>]*>\s*Mais lidos\s*<\/h2>/);
  });

  it('põe o conteúdo de cada slot no seu painel, todos no HTML', async () => {
    const html = await renderizar();

    expect(html.indexOf('Lista dos últimos')).toBeGreaterThan(html.indexOf('id="painel-ultimos"'));
    expect(html.indexOf('Lista dos mais lidos')).toBeGreaterThan(
      html.indexOf('id="painel-mais-lidos"'),
    );
    expect(html).not.toContain(' hidden');
  });

  it('deixa o slot ao-lado fora do tablist', async () => {
    const semAoLado = await renderizar();
    const comAoLado = await renderizar({ 'ao-lado': '<form role="search"></form>' });

    expect(semAoLado).not.toContain('abas__ao-lado');
    const fimDoTablist = comAoLado.indexOf('</div>', comAoLado.indexOf('role="tablist"'));
    expect(comAoLado.indexOf('role="search"')).toBeGreaterThan(fimDoTablist);
  });

  it('derruba a renderização sem nenhuma aba', async () => {
    const container = await AstroContainer.create();
    await expect(
      container.renderToString(Abas, { props: { abas: [], rotulo: 'Posts' } }),
    ).rejects.toThrow(/sem nenhuma aba/);
  });
});
