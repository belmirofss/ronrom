import { describe, expect, it } from 'vitest';
import {
  coracoesDaNota,
  ERRO_SEM_NOTA,
  NOTAS,
  notaValida,
  problemaNaNota,
  rotuloDaNota,
} from './nota';

describe('NOTAS', () => {
  it('vai de meio a 5 em passos de meio', () => {
    expect(NOTAS).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
  });
});

describe('notaValida', () => {
  it.each(NOTAS)('aceita %d', (nota) => {
    expect(notaValida(nota)).toBe(true);
  });

  it.each([undefined, 0, 4.3, 5.5, -1, Number.NaN, '4'])('recusa %s', (nota) => {
    expect(notaValida(nota)).toBe(false);
  });
});

describe('rotuloDaNota', () => {
  it.each([
    [0.5, 'meio coração'],
    [1, '1 coração'],
    [1.5, '1 coração e meio'],
    [2, '2 corações'],
    [3.5, '3 corações e meio'],
    [4.5, '4 corações e meio'],
    [5, '5 corações'],
  ])('%d vira "%s"', (nota, rotulo) => {
    expect(rotuloDaNota(nota)).toBe(rotulo);
  });
});

describe('coracoesDaNota', () => {
  it.each(NOTAS)('desenha sempre 5 corações para %d', (nota) => {
    const coracoes = coracoesDaNota(nota);
    expect(coracoes).toHaveLength(5);
    expect(coracoes.filter((c) => c === 'cheio')).toHaveLength(Math.floor(nota));
    expect(coracoes.filter((c) => c === 'meio')).toHaveLength(Number.isInteger(nota) ? 0 : 1);
  });

  it('põe o meio coração logo depois dos cheios', () => {
    expect(coracoesDaNota(3.5)).toEqual(['cheio', 'cheio', 'cheio', 'meio', 'vazio']);
    expect(coracoesDaNota(0.5)).toEqual(['meio', 'vazio', 'vazio', 'vazio', 'vazio']);
  });

  it.each([undefined, 0, 4.3, 5.5])('desenha tudo vazio para a nota inválida %s', (nota) => {
    expect(coracoesDaNota(nota)).toEqual(['vazio', 'vazio', 'vazio', 'vazio', 'vazio']);
  });
});

describe('problemaNaNota', () => {
  it('aceita a review com nota válida', () => {
    expect(problemaNaNota('review', 4)).toBeUndefined();
    expect(problemaNaNota('review', 0.5)).toBeUndefined();
  });

  it('pede a nota da review', () => {
    expect(problemaNaNota('review', undefined)).toBe(ERRO_SEM_NOTA);
  });

  it.each([0, 4.3, 5.5])('recusa a nota %d na review', (nota) => {
    expect(problemaNaNota('review', nota)).toContain(ERRO_SEM_NOTA);
  });

  it('recusa nota em pensamento', () => {
    expect(problemaNaNota('pensamento', 4)).toContain('Só review tem nota');
  });

  it('aceita pensamento e post sem tipo sem nota', () => {
    expect(problemaNaNota('pensamento', undefined)).toBeUndefined();
    expect(problemaNaNota(undefined, undefined)).toBeUndefined();
  });
});
