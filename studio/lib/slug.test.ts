import { describe, expect, it } from 'vitest';
import { FORMATO_DO_SLUG, problemaNoSlug, slugify, TAMANHO_MAXIMO_DO_SLUG } from './slug';

describe('slugify', () => {
  it('remove acentos e cedilha, passa para minúsculas e troca espaço por hífen', () => {
    expect(slugify('Café com Pão')).toBe('cafe-com-pao');
  });

  // Tabela de docs/seo-urls.md#formato.
  it.each([
    ['Séries', 'series'],
    ['Restaurantes e cafés', 'restaurantes-e-cafes'],
    ['Opiniões', 'opinioes'],
    ['Café com pão de queijo', 'cafe-com-pao-de-queijo'],
    ['O Poderoso Chefão (1972)', 'o-poderoso-chefao-1972'],
    ['Ação & aventura!', 'acao-aventura'],
  ])('"%s" vira "%s"', (titulo, slug) => {
    expect(slugify(titulo)).toBe(slug);
  });

  it('junta hífens repetidos e tira os do começo e do fim', () => {
    expect(slugify('  --Frases -- soltas!--  ')).toBe('frases-soltas');
  });

  it.each(['Ünïcødé — ñ', '...Livros', 'Ç', 'Fim de ano?!', '2026: o ano'])(
    'o resultado de "%s" casa com o formato do slug',
    (titulo) => {
      expect(slugify(titulo)).toMatch(FORMATO_DO_SLUG);
    },
  );

  it('corta no limite de caracteres sem deixar hífen no fim', () => {
    const slug = slugify(`${'a'.repeat(TAMANHO_MAXIMO_DO_SLUG - 1)} b`);

    expect(slug).toHaveLength(TAMANHO_MAXIMO_DO_SLUG - 1);
    expect(slug).toMatch(FORMATO_DO_SLUG);
  });

  it('devolve texto vazio quando não sobra letra nem número', () => {
    expect(slugify('?!')).toBe('');
  });
});

describe('problemaNoSlug', () => {
  it('aceita slug no formato', () => {
    expect(problemaNoSlug('restaurantes-e-cafes')).toBeUndefined();
  });

  it.each(['Dias Perfeitos', 'séries', '-filmes', 'filmes-', 'a--b', ''])(
    'recusa "%s", fora do formato',
    (slug) => {
      expect(problemaNoSlug(slug)).toBeDefined();
    },
  );

  it('recusa slug acima do limite', () => {
    expect(problemaNoSlug('a'.repeat(TAMANHO_MAXIMO_DO_SLUG + 1))).toBeDefined();
  });

  it('recusa "pagina", reservado para a paginação', () => {
    expect(problemaNoSlug('pagina')).toContain('reservado');
  });
});
