import { describe, expect, it } from 'vitest';
import { paginasVisiveis } from '@/lib/paginacao';

const R = 'reticencias';

describe('paginasVisiveis', () => {
  it('mostra todas as páginas quando são até 7', () => {
    expect(paginasVisiveis(1, 1)).toEqual([1]);
    expect(paginasVisiveis(2, 3)).toEqual([1, 2, 3]);
    expect(paginasVisiveis(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each([
    [1, [1, 2, 3, 4, 5, R, 10]],
    [2, [1, 2, 3, 4, 5, R, 10]],
    [4, [1, 2, 3, 4, 5, R, 10]],
    [5, [1, R, 4, 5, 6, R, 10]],
    [6, [1, R, 5, 6, 7, R, 10]],
    [7, [1, R, 6, 7, 8, 9, 10]],
    [9, [1, R, 6, 7, 8, 9, 10]],
    [10, [1, R, 6, 7, 8, 9, 10]],
  ])('na página %d de 10 mostra %j', (atual, esperado) => {
    expect(paginasVisiveis(atual, 10)).toEqual(esperado);
  });

  it('sempre mostra a primeira, a última, a atual e as vizinhas, em 7 itens', () => {
    for (const total of [8, 9, 12, 50]) {
      for (let atual = 1; atual <= total; atual++) {
        const itens = paginasVisiveis(atual, total);
        const vizinhas = [atual - 1, atual, atual + 1].filter((n) => n >= 1 && n <= total);

        expect(itens).toHaveLength(7);
        expect(itens).toEqual(expect.arrayContaining([1, total, ...vizinhas]));
      }
    }
  });

  it('não esconde uma página só atrás das reticências', () => {
    expect(paginasVisiveis(4, 8)).toEqual([1, 2, 3, 4, 5, R, 8]);
    expect(paginasVisiveis(5, 8)).toEqual([1, R, 4, 5, 6, 7, 8]);
  });

  it.each([
    [0, 10],
    [11, 10],
    [1.5, 10],
    [1, 0],
    [1, Number.NaN],
  ])('lança erro para a página %d de %d', (atual, total) => {
    expect(() => paginasVisiveis(atual, total)).toThrow(/inválid/);
  });
});
