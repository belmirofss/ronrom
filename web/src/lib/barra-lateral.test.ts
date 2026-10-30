import { describe, expect, it } from 'vitest';
import { fraseParaMostrar, navegacaoDaBarraLateral, rotuloDoTotal } from '@/lib/barra-lateral';

describe('fraseParaMostrar', () => {
  it('devolve o texto e a autoria sem espaços nas pontas', () => {
    expect(fraseParaMostrar({ texto: '  Devagar.  ', autoria: ' Avó ' })).toEqual({
      texto: 'Devagar.',
      autoria: 'Avó',
    });
  });

  it('deixa a autoria de fora quando está vazia', () => {
    expect(fraseParaMostrar({ texto: 'Devagar.', autoria: '   ' })).toEqual({
      texto: 'Devagar.',
      autoria: undefined,
    });
    expect(fraseParaMostrar({ texto: 'Devagar.', autoria: null })?.autoria).toBeUndefined();
  });

  it('esconde o bloco sem frase cadastrada', () => {
    expect(fraseParaMostrar(null)).toBeNull();
    expect(fraseParaMostrar(undefined)).toBeNull();
    expect(fraseParaMostrar({})).toBeNull();
    expect(fraseParaMostrar({ texto: '' })).toBeNull();
    expect(fraseParaMostrar({ texto: '  \n ', autoria: 'Avó' })).toBeNull();
  });
});

describe('navegacaoDaBarraLateral', () => {
  it('monta as URLs pelos helpers de rota, na ordem recebida, com o total', () => {
    const { categorias, formatos } = navegacaoDaBarraLateral({
      categorias: [
        { _id: 'a', nome: 'Séries', slug: 'series', descricao: null, total: 2 },
        { _id: 'b', nome: 'Filmes', slug: 'filmes', descricao: null, total: 0 },
      ],
      formatos: [{ _id: 'c', nome: 'Frases soltas', slug: 'frases', descricao: null, total: 1 }],
    });

    expect(categorias).toEqual([
      { rotulo: 'Séries', href: '/reviews/series', total: 2 },
      { rotulo: 'Filmes', href: '/reviews/filmes', total: 0 },
    ]);
    expect(formatos).toEqual([{ rotulo: 'Frases soltas', href: '/pensamentos/frases', total: 1 }]);
  });

  it('devolve listas vazias sem taxonomia', () => {
    expect(navegacaoDaBarraLateral(null)).toEqual({ categorias: [], formatos: [] });
  });

  it('derruba o build com slug inválido', () => {
    expect(() =>
      navegacaoDaBarraLateral({
        categorias: [{ _id: 'a', nome: 'X', slug: 'Com Espaço', descricao: null, total: 0 }],
        formatos: [],
      }),
    ).toThrow(/Slug inválido/);
  });
});

describe('rotuloDoTotal', () => {
  it('concorda no singular e no plural', () => {
    expect(rotuloDoTotal(0)).toBe('nenhum post');
    expect(rotuloDoTotal(1)).toBe('1 post');
    expect(rotuloDoTotal(12)).toBe('12 posts');
  });
});
