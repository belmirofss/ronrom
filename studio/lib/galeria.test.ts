import { describe, expect, it } from 'vitest';

import { MAXIMO_DE_IMAGENS, problemaNaQuantidadeDeImagens, urlDaMiniatura } from './galeria';

describe('problemaNaQuantidadeDeImagens', () => {
  it.each([0, 1])('recusa %i imagem, sugerindo o bloco "Imagem"', (quantidade) => {
    expect(problemaNaQuantidadeDeImagens(quantidade)).toMatch(/pelo menos 2 imagens/);
  });

  it.each([2, 7, MAXIMO_DE_IMAGENS])('aceita %i imagens', (quantidade) => {
    expect(problemaNaQuantidadeDeImagens(quantidade)).toBeNull();
  });

  it('recusa acima de 12 e diz quantas sobram', () => {
    expect(problemaNaQuantidadeDeImagens(14)).toBe(
      'A galeria aceita até 12 imagens. Divida em duas galerias ou tire 2.',
    );
  });
});

describe('urlDaMiniatura', () => {
  it('pede ao CDN um quadrado com o dobro do tamanho mostrado', () => {
    expect(urlDaMiniatura('https://cdn.sanity.io/images/abc/production/x-800x600.jpg', 48)).toBe(
      'https://cdn.sanity.io/images/abc/production/x-800x600.jpg?w=96&h=96&fit=crop&auto=format',
    );
  });
});
