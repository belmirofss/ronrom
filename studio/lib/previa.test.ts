import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';

import { DOCUMENTOS_DAS_ROTAS, locaisDoPost } from './previa';

describe('locaisDoPost', () => {
  it('leva a review para a página dela e para a home', () => {
    expect(
      locaisDoPost({ titulo: 'Duna', tipo: 'review', slug: 'duna', categoria: 'filmes' }),
    ).toEqual({
      locations: [
        { title: 'Duna', href: '/reviews/filmes/duna' },
        { title: 'Home', href: '/' },
      ],
    });
  });

  it('leva o pensamento para o endereço do formato', () => {
    expect(
      locaisDoPost({ titulo: 'Sobre gatos', tipo: 'pensamento', slug: 'gatos', formato: 'artigos' })
        .locations?.[0],
    ).toEqual({ title: 'Sobre gatos', href: '/pensamentos/artigos/gatos' });
  });

  it('mostra "Sem título" no rascunho ainda sem título', () => {
    expect(
      locaisDoPost({ tipo: 'review', slug: 'duna', categoria: 'filmes' }).locations?.[0]?.title,
    ).toBe('Sem título');
  });

  it.each([
    null,
    { titulo: 'Sem slug', tipo: 'review', categoria: 'filmes' },
    { titulo: 'Sem categoria', tipo: 'review', slug: 'duna' },
    { titulo: 'Sem tipo', slug: 'duna', categoria: 'filmes' },
  ])('avisa quando falta parte do endereço: %j', (post) => {
    expect(locaisDoPost(post)).toMatchObject({ tone: 'caution' });
  });
});

describe('DOCUMENTOS_DAS_ROTAS', () => {
  const dataset = [
    { _id: 'cat-filmes', _type: 'categoria', slug: { current: 'filmes' } },
    { _id: 'fmt-artigos', _type: 'formato', slug: { current: 'artigos' } },
    {
      _id: 'review-duna',
      _type: 'post',
      tipo: 'review',
      slug: { current: 'duna' },
      categoria: { _ref: 'cat-filmes' },
    },
    {
      _id: 'pensamento-duna',
      _type: 'post',
      tipo: 'pensamento',
      slug: { current: 'duna' },
      formato: { _ref: 'fmt-artigos' },
    },
    { _id: 'sobre', _type: 'sobre' },
    { _id: 'configuracoes', _type: 'configuracoes' },
  ];

  async function documentosDa(route: string, params: Record<string, string> = {}) {
    const rota = DOCUMENTOS_DAS_ROTAS.find((item) => item.route === route);
    if (!rota) throw new Error(`Rota ${route} sem documento.`);
    const resultado = await evaluate(parse(`*[${rota.filter}]._id`), { dataset, params });
    return resultado.get();
  }

  it('acha a review pelo slug e pela categoria', async () => {
    const rota = '/reviews/:secao/:slug';
    expect(await documentosDa(rota, { secao: 'filmes', slug: 'duna' })).toEqual(['review-duna']);
    expect(await documentosDa(rota, { secao: 'livros', slug: 'duna' })).toEqual([]);
  });

  it('acha o pensamento pelo slug e pelo formato, sem confundir com a review', async () => {
    const rota = '/pensamentos/:secao/:slug';
    expect(await documentosDa(rota, { secao: 'artigos', slug: 'duna' })).toEqual([
      'pensamento-duna',
    ]);
  });

  it('acha os singletons da home e do Sobre', async () => {
    expect(await documentosDa('/')).toEqual(['configuracoes']);
    expect(await documentosDa('/sobre')).toEqual(['sobre']);
  });
});
