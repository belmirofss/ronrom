import { describe, expect, it } from 'vitest';
import { problemaNoSlug } from './slug';
import { CATEGORIAS, FORMATOS } from './taxonomia';

describe.each([
  ['categoria', CATEGORIAS],
  ['formato', FORMATOS],
])('taxonomia inicial: %s', (tipo, itens) => {
  it.each(itens.map((item) => [item.nome, item]))('%s tem slug válido e _id fixo', (_, item) => {
    expect(problemaNoSlug(item.slug)).toBeUndefined();
    expect(item._id).toBe(`${tipo}-${item.slug}`);
  });

  it('não repete slug nem ordem', () => {
    expect(new Set(itens.map((item) => item.slug)).size).toBe(itens.length);
    expect(new Set(itens.map((item) => item.ordem)).size).toBe(itens.length);
  });

  it('tem descrição de até 160 caracteres', () => {
    for (const item of itens) {
      expect(item.descricao.length, item.nome).toBeGreaterThan(0);
      expect(item.descricao.length, item.nome).toBeLessThanOrEqual(160);
    }
  });
});

describe('categorias', () => {
  it('têm os slugs de docs/seo-urls.md, na ordem do menu', () => {
    expect(CATEGORIAS.map((categoria) => categoria.slug)).toEqual([
      'filmes',
      'series',
      'livros',
      'restaurantes-e-cafes',
      'lugares',
      'comidas',
    ]);
  });
});

describe('formatos', () => {
  it('têm os slugs de docs/seo-urls.md, na ordem do menu', () => {
    expect(FORMATOS.map((formato) => formato.slug)).toEqual(['textos', 'frases']);
  });
});
