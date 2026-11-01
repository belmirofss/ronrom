import { describe, expect, it, vi } from 'vitest';
import {
  trilhaDaCategoria,
  trilhaDaPagina,
  trilhaDeTodosOsPosts,
  trilhaDoFormato,
  trilhaDoPost,
  trilhaDoTipo,
} from '@/lib/trilha';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom.blog' }));

const FILMES = { nome: 'Filmes', slug: 'filmes' };
const FRASES = { nome: 'Frases soltas', slug: 'frases' };

describe('trilhaDaCategoria e trilhaDoFormato', () => {
  it('monta Início › Reviews › categoria', () => {
    expect(trilhaDaCategoria(FILMES)).toEqual([
      { rotulo: 'Início', href: '/' },
      { rotulo: 'Reviews', href: '/reviews' },
      { rotulo: 'Filmes', href: '/reviews/filmes' },
    ]);
  });

  it('monta Início › Pensamentos › formato', () => {
    expect(trilhaDoFormato(FRASES)).toEqual([
      { rotulo: 'Início', href: '/' },
      { rotulo: 'Pensamentos', href: '/pensamentos' },
      { rotulo: 'Frases soltas', href: '/pensamentos/frases' },
    ]);
  });

  it('lança erro sem nome ou com slug inválido', () => {
    expect(() => trilhaDaCategoria({ slug: 'filmes' })).toThrow(/Nome ausente/);
    expect(() => trilhaDoFormato({ nome: 'Frases', slug: 'Frases Soltas' })).toThrow(
      /Slug inválido/,
    );
  });
});

describe('trilhaDoPost', () => {
  it('termina na review, depois da categoria', () => {
    const trilha = trilhaDoPost({
      tipo: 'review',
      titulo: 'Dias Perfeitos',
      slug: 'dias-perfeitos',
      categoria: FILMES,
      formato: null,
    });

    expect(trilha.map((item) => item.rotulo)).toEqual([
      'Início',
      'Reviews',
      'Filmes',
      'Dias Perfeitos',
    ]);
    expect(trilha.at(-1)).toEqual({
      rotulo: 'Dias Perfeitos',
      href: '/reviews/filmes/dias-perfeitos',
    });
  });

  it('termina no pensamento, depois do formato', () => {
    const trilha = trilhaDoPost({
      tipo: 'pensamento',
      titulo: 'Sobre gatos',
      slug: 'sobre-gatos',
      categoria: null,
      formato: FRASES,
    });

    expect(trilha.map((item) => item.href)).toEqual([
      '/',
      '/pensamentos',
      '/pensamentos/frases',
      '/pensamentos/frases/sobre-gatos',
    ]);
  });

  it('lança erro sem título, sem categoria ou sem o nome dela', () => {
    const review = { tipo: 'review' as const, slug: 'dias-perfeitos', categoria: FILMES };

    expect(() => trilhaDoPost(review)).toThrow(/Título ausente/);
    expect(() => trilhaDoPost({ ...review, titulo: 'X', categoria: null })).toThrow(
      /Slug inválido/,
    );
    expect(() => trilhaDoPost({ ...review, titulo: 'X', categoria: { slug: 'filmes' } })).toThrow(
      /Nome ausente/,
    );
  });
});

describe('trilhas das listagens', () => {
  it('monta Início › Todos os posts e Início › Reviews/Pensamentos', () => {
    expect(trilhaDeTodosOsPosts().map((item) => item.href)).toEqual(['/', '/posts']);
    expect(trilhaDoTipo('review').at(-1)).toEqual({ rotulo: 'Reviews', href: '/reviews' });
    expect(trilhaDoTipo('pensamento').at(-1)).toEqual({
      rotulo: 'Pensamentos',
      href: '/pensamentos',
    });
  });

  it('acrescenta "Página n" só da 2 em diante', () => {
    const trilha = trilhaDaCategoria(FILMES);

    expect(trilhaDaPagina(trilha, 1)).toEqual(trilha);
    expect(trilhaDaPagina(trilha, 3).at(-1)).toEqual({
      rotulo: 'Página 3',
      href: '/reviews/filmes/pagina/3',
    });
  });
});
