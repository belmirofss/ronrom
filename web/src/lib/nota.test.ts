import { describe, expect, it } from 'vitest';
import { coracoesDaNota, rotuloDaNota, validarNota, type Preenchimento } from '@/lib/nota';

function contar(coracoes: Preenchimento[]) {
  return {
    cheios: coracoes.filter((c) => c === 'cheio').length,
    meios: coracoes.filter((c) => c === 'meio').length,
    vazios: coracoes.filter((c) => c === 'vazio').length,
  };
}

describe('coracoesDaNota', () => {
  it.each([
    [0.5, 0, 1, 4],
    [1, 1, 0, 4],
    [1.5, 1, 1, 3],
    [2, 2, 0, 3],
    [2.5, 2, 1, 2],
    [3, 3, 0, 2],
    [3.5, 3, 1, 1],
    [4, 4, 0, 1],
    [4.5, 4, 1, 0],
    [5, 5, 0, 0],
  ])('%d dá %d cheios, %d meio e %d vazios', (nota, cheios, meios, vazios) => {
    const coracoes = coracoesDaNota(nota);

    expect(coracoes).toHaveLength(5);
    expect(contar(coracoes)).toEqual({ cheios, meios, vazios });
  });

  it('desenha os cheios primeiro, depois o meio e por último os vazios', () => {
    expect(coracoesDaNota(2.5)).toEqual(['cheio', 'cheio', 'meio', 'vazio', 'vazio']);
  });

  it.each([0, 5.5, 4.3, -1, Number.NaN, Number.POSITIVE_INFINITY, null, undefined])(
    'lança erro para %s',
    (nota) => {
      expect(() => coracoesDaNota(nota)).toThrow(/Nota inválida/);
    },
  );
});

describe('validarNota', () => {
  it('devolve a própria nota quando é válida', () => {
    expect(validarNota(4.5)).toBe(4.5);
  });

  it('lança erro para nota fora dos passos de meio', () => {
    expect(() => validarNota(3.25)).toThrow(/Nota inválida/);
  });
});

describe('rotuloDaNota', () => {
  it.each([
    [4.5, 'Nota: 4,5 de 5 corações'],
    [0.5, 'Nota: 0,5 de 5 corações'],
    [5, 'Nota: 5 de 5 corações'],
    [1, 'Nota: 1 de 5 corações'],
  ])('%d vira "%s"', (nota, rotulo) => {
    expect(rotuloDaNota(nota)).toBe(rotulo);
  });

  it('lança erro para nota inválida', () => {
    expect(() => rotuloDaNota(0)).toThrow(/Nota inválida/);
  });
});
