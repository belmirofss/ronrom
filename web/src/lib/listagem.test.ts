import { describe, expect, it, vi } from 'vitest';
import {
  paginasExtras,
  seoDaPaginacao,
  textosDaCategoria,
  textosDoFormato,
  tituloComPagina,
} from '@/lib/listagem';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

describe('paginasExtras', () => {
  it('gera da página 2 até a última, nunca a 1', () => {
    expect(paginasExtras(1)).toEqual([]);
    expect(paginasExtras(2)).toEqual([2]);
    expect(paginasExtras(4)).toEqual([2, 3, 4]);
  });

  it('recusa total de páginas inválido', () => {
    expect(() => paginasExtras(0)).toThrow(/Total de páginas inválido/);
    expect(() => paginasExtras(1.5)).toThrow(/Total de páginas inválido/);
  });
});

describe('seoDaPaginacao', () => {
  it('na página 1 de uma, só o canonical da base', () => {
    expect(seoDaPaginacao('/posts', 1, 1)).toEqual({
      canonical: '/posts',
      prev: undefined,
      next: undefined,
    });
  });

  it('a página 2 aponta para a base como anterior', () => {
    expect(seoDaPaginacao('/reviews/filmes', 2, 3)).toEqual({
      canonical: '/reviews/filmes/pagina/2',
      prev: '/reviews/filmes',
      next: '/reviews/filmes/pagina/3',
    });
  });

  it('a última não tem próxima', () => {
    expect(seoDaPaginacao('/pensamentos/frases', 3, 3)).toEqual({
      canonical: '/pensamentos/frases/pagina/3',
      prev: '/pensamentos/frases/pagina/2',
      next: undefined,
    });
  });

  it('recusa página fora da listagem', () => {
    expect(() => seoDaPaginacao('/posts', 0, 2)).toThrow(/Página inválida/);
    expect(() => seoDaPaginacao('/posts', 3, 2)).toThrow(/Página inválida/);
  });
});

describe('títulos e textos', () => {
  it('indica a página da 2 em diante', () => {
    expect(tituloComPagina('Reviews de filmes', 1)).toBe('Reviews de filmes');
    expect(tituloComPagina('Reviews de filmes', 2)).toBe('Reviews de filmes — página 2');
  });

  it('monta "Reviews de …" com a categoria em minúsculas', () => {
    expect(textosDaCategoria({ nome: 'Restaurantes e cafés', descricao: null })).toMatchObject({
      titulo: 'Reviews de restaurantes e cafés',
      descricao: null,
    });
  });

  it('usa o nome do formato', () => {
    expect(textosDoFormato({ nome: 'Frases soltas', descricao: 'Curtinhas.' })).toMatchObject({
      titulo: 'Frases soltas',
      descricao: 'Curtinhas.',
    });
  });
});
