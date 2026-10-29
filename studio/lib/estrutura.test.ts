import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';

import {
  FILTRO_DOS_RASCUNHOS,
  FILTRO_POR_CATEGORIA,
  FILTRO_POR_FORMATO,
  FILTRO_POR_TIPO,
  valorInicialDoPost,
} from './estrutura';

describe('valorInicialDoPost', () => {
  it('preenche só o tipo fora das subpastas', () => {
    expect(valorInicialDoPost('review')).toEqual({ tipo: 'review' });
    expect(valorInicialDoPost('pensamento')).toEqual({ tipo: 'pensamento' });
  });

  it('preenche a categoria da review', () => {
    expect(valorInicialDoPost('review', 'categoria-livros')).toEqual({
      tipo: 'review',
      categoria: { _type: 'reference', _ref: 'categoria-livros' },
    });
  });

  it('preenche o formato do pensamento', () => {
    expect(valorInicialDoPost('pensamento', 'formato-frases')).toEqual({
      tipo: 'pensamento',
      formato: { _type: 'reference', _ref: 'formato-frases' },
    });
  });
});

describe('filtros das listas', () => {
  // Como as listas do Studio enxergam o dataset na perspectiva de rascunhos: um documento por post,
  // com o `_id` publicado e o id real em `_originalId` ("drafts." quando há rascunho).
  const dataset = [
    {
      _id: 'livro',
      _originalId: 'drafts.livro',
      _type: 'post',
      tipo: 'review',
      categoria: { _ref: 'categoria-livros' },
    },
    {
      _id: 'filme',
      _originalId: 'filme',
      _type: 'post',
      tipo: 'review',
      categoria: { _ref: 'categoria-filmes' },
    },
    {
      _id: 'frase',
      _originalId: 'frase',
      _type: 'post',
      tipo: 'pensamento',
      formato: { _ref: 'formato-frases' },
    },
    { _id: 'novo', _originalId: 'drafts.novo', _type: 'post', tipo: 'pensamento' },
    { _id: 'configuracoes', _originalId: 'drafts.configuracoes', _type: 'configuracoes' },
    { _id: 'categoria-livros', _originalId: 'categoria-livros', _type: 'categoria' },
  ];

  async function ids(filtro: string, params: Record<string, string> = {}) {
    const resultado = await evaluate(parse(`*[${filtro}]._id`), { dataset, params });
    return resultado.get();
  }

  it('separa reviews e pensamentos', async () => {
    expect(await ids(FILTRO_POR_TIPO, { tipo: 'review' })).toEqual(['livro', 'filme']);
    expect(await ids(FILTRO_POR_TIPO, { tipo: 'pensamento' })).toEqual(['frase', 'novo']);
  });

  it('filtra a review pela categoria', async () => {
    expect(await ids(FILTRO_POR_CATEGORIA, { id: 'categoria-livros' })).toEqual(['livro']);
  });

  it('filtra o pensamento pelo formato', async () => {
    expect(await ids(FILTRO_POR_FORMATO, { id: 'formato-frases' })).toEqual(['frase']);
  });

  it('mostra nos rascunhos só os posts com mudança não publicada', async () => {
    expect(await ids(FILTRO_DOS_RASCUNHOS)).toEqual(['livro', 'novo']);
  });
});
