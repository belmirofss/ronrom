import { describe, expect, it } from 'vitest';
import { parametrosDosPosts } from '@/lib/post';

const rotas = [
  {
    tipo: 'review' as const,
    slug: 'dias-perfeitos',
    categoria: { slug: 'filmes' },
    formato: null,
  },
  {
    tipo: 'pensamento' as const,
    slug: 'sobre-gatos',
    categoria: null,
    formato: { slug: 'frases' },
  },
  // Categoria apagada ou fora do ar: o `categoria->` volta `null`.
  { tipo: 'review' as const, slug: 'orfa', categoria: null, formato: null },
];

describe('parametrosDosPosts', () => {
  it('devolve só os posts do tipo, com a seção certa', () => {
    expect(parametrosDosPosts(rotas, 'review')).toEqual([
      { secao: 'filmes', slug: 'dias-perfeitos' },
    ]);
    expect(parametrosDosPosts(rotas, 'pensamento')).toEqual([
      { secao: 'frases', slug: 'sobre-gatos' },
    ]);
  });

  it('não gera página para post sem categoria', () => {
    const slugs = parametrosDosPosts(rotas, 'review').map(({ slug }) => slug);

    expect(slugs).not.toContain('orfa');
    expect(slugs).toHaveLength(1);
  });

  it('aceita a consulta vazia', () => {
    expect(parametrosDosPosts(null, 'review')).toEqual([]);
  });
});
