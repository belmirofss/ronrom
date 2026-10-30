import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Coracoes from '@/components/ui/Coracoes.astro';

async function renderizar(nota: number) {
  const container = await AstroContainer.create();
  return container.renderToString(Coracoes, { props: { nota } });
}

function contar(html: string, trecho: string) {
  return html.split(trecho).length - 1;
}

describe('<Coracoes>', () => {
  it('anuncia a nota uma vez só, com vírgula decimal', async () => {
    const html = await renderizar(4.5);

    expect(contar(html, 'role="img"')).toBe(1);
    expect(contar(html, 'aria-label=')).toBe(1);
    expect(html).toContain('aria-label="Nota: 4,5 de 5 corações"');
  });

  it('esconde os SVGs do leitor de tela', async () => {
    const html = await renderizar(4.5);

    expect(contar(html, '<svg class="coracoes__coracao')).toBe(5);
    expect(contar(html, 'aria-hidden="true"')).toBe(5);
  });

  it('desenha 4 corações cheios e 1 meio para 4.5', async () => {
    const html = await renderizar(4.5);

    expect(contar(html, 'data-preenchimento="cheio"')).toBe(4);
    expect(contar(html, 'data-preenchimento="meio"')).toBe(1);
    expect(contar(html, 'data-preenchimento="vazio"')).toBe(0);
  });

  it('desenha 5 corações cheios para 5, sem ",0" no rótulo', async () => {
    const html = await renderizar(5);

    expect(html).toContain('aria-label="Nota: 5 de 5 corações"');
    expect(contar(html, 'data-preenchimento="cheio"')).toBe(5);
  });

  it('derruba a renderização com nota inválida', async () => {
    await expect(renderizar(4.3)).rejects.toThrow(/Nota inválida/);
  });
});
