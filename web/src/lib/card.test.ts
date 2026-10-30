import { describe, expect, it } from 'vitest';
import { chamadaDoCard, rotuloDoCard, secaoDoCard } from '@/lib/card';

const REVIEW = {
  tipo: 'review',
  slug: 'dias-perfeitos',
  categoria: { nome: 'Restaurantes e cafés', slug: 'restaurantes-e-cafes' },
  formato: null,
} as const;

const PENSAMENTO = {
  tipo: 'pensamento',
  slug: 'sobre-gatos',
  categoria: null,
  formato: { nome: 'Frases soltas', slug: 'frases' },
} as const;

describe('secaoDoCard', () => {
  it('usa a categoria na review e o formato no pensamento', () => {
    expect(secaoDoCard(REVIEW)).toBe('Restaurantes e cafés');
    expect(secaoDoCard(PENSAMENTO)).toBe('Frases soltas');
  });

  it('ignora o formato numa review e a categoria num pensamento', () => {
    expect(() => secaoDoCard({ ...REVIEW, categoria: null, formato: PENSAMENTO.formato })).toThrow(
      'Card sem categoria em "dias-perfeitos".',
    );
    expect(() =>
      secaoDoCard({ ...PENSAMENTO, formato: null, categoria: REVIEW.categoria }),
    ).toThrow('Card sem formato em "sobre-gatos".');
  });
});

describe('rotuloDoCard', () => {
  it('junta o tipo e a seção', () => {
    expect(rotuloDoCard(REVIEW)).toEqual(['Review', 'Restaurantes e cafés']);
    expect(rotuloDoCard(PENSAMENTO)).toEqual(['Pensamento', 'Frases soltas']);
  });
});

describe('chamadaDoCard', () => {
  it('chama para a review ou para o texto', () => {
    expect(chamadaDoCard(REVIEW)).toBe('Ler review');
    expect(chamadaDoCard(PENSAMENTO)).toBe('Ler texto');
  });
});
