import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';

import { CORPO_NO_GROQ } from './corpo';

const referenciaDoAsset = { _type: 'reference', _ref: 'image-xicara-800x600-jpg' };

// Um parágrafo com um link externo e um interno, uma imagem no meio do texto, uma galeria e uma
// citação.
const corpo = [
  {
    _type: 'block',
    _key: 'p1',
    style: 'normal',
    markDefs: [
      { _type: 'link', _key: 'externo', href: 'https://www.imdb.com' },
      { _type: 'linkInterno', _key: 'interno', post: { _type: 'reference', _ref: 'destino' } },
    ],
    children: [{ _type: 'span', _key: 's1', text: 'Veja também', marks: ['interno'] }],
  },
  {
    _type: 'imagem',
    _key: 'i1',
    asset: referenciaDoAsset,
    hotspot: { x: 0.5, y: 0.3, width: 1, height: 1 },
    alt: 'Uma xícara',
    legenda: 'Foto: autora',
    largura: 'normal',
  },
  {
    _type: 'galeria',
    _key: 'g1',
    imagens: [
      { _type: 'image', _key: 'a', asset: referenciaDoAsset, alt: 'Primeira' },
      { _type: 'image', _key: 'b', asset: { _type: 'reference', _ref: 'apagado' }, alt: 'Sumiu' },
    ],
  },
  { _type: 'citacaoDestaque', _key: 'c1', texto: 'Frase', fonte: 'Alguém' },
];

const asset = {
  _id: 'image-xicara-800x600-jpg',
  _type: 'sanity.imageAsset',
  url: 'https://cdn.sanity.io/images/p/d/xicara-800x600.jpg',
  metadata: {
    dimensions: { width: 800, height: 600, aspectRatio: 4 / 3 },
    lqip: 'data:image/jpeg',
  },
};

const assetExpandido = {
  _id: asset._id,
  url: asset.url,
  largura: 800,
  altura: 600,
  lqip: 'data:image/jpeg',
};

function dataset(destino: Record<string, unknown> | undefined) {
  return [
    asset,
    { _id: 'categoria-filmes', _type: 'categoria', slug: { current: 'filmes' } },
    { _id: 'formato-frases', _type: 'formato', slug: { current: 'frases' } },
    ...(destino ? [{ _id: 'destino', _type: 'post', ...destino }] : []),
    { _id: 'origem', _type: 'post', corpo },
  ];
}

async function corpoDaOrigem(destino?: Record<string, unknown>) {
  const consulta = parse(`*[_id == "origem"][0]{ "corpo": ${CORPO_NO_GROQ} }.corpo`);
  const resultado = await evaluate(consulta, { dataset: dataset(destino) });
  return (await resultado.get()) as Record<string, unknown>[];
}

async function destinoDoLink(destino?: Record<string, unknown>) {
  const [paragrafo] = await corpoDaOrigem(destino);
  const markDefs = paragrafo?.markDefs as Record<string, unknown>[];
  return markDefs.find(({ _type }) => _type === 'linkInterno')?.post;
}

describe('CORPO_NO_GROQ', () => {
  const review = {
    tipo: 'review',
    slug: { current: 'dias-perfeitos' },
    categoria: { _ref: 'categoria-filmes' },
  };

  it('resolve o link interno com os slugs do post de destino', async () => {
    expect(await destinoDoLink(review)).toEqual({
      tipo: 'review',
      slug: 'dias-perfeitos',
      categoria: { slug: 'filmes' },
      formato: null,
    });
  });

  it('acompanha o slug novo depois que o destino muda de slug', async () => {
    const renomeado = { ...review, slug: { current: 'dias-perfeitos-wim-wenders' } };
    expect(await destinoDoLink(renomeado)).toMatchObject({ slug: 'dias-perfeitos-wim-wenders' });
  });

  it('resolve o formato quando o destino é um pensamento', async () => {
    const pensamento = {
      tipo: 'pensamento',
      slug: { current: 'sobre-gatos' },
      formato: { _ref: 'formato-frases' },
    };
    expect(await destinoDoLink(pensamento)).toEqual({
      tipo: 'pensamento',
      slug: 'sobre-gatos',
      categoria: null,
      formato: { slug: 'frases' },
    });
  });

  it('devolve post null quando o destino foi apagado ou não está publicado', async () => {
    expect(await destinoDoLink(undefined)).toBeNull();
  });

  it('não mexe no link externo, nos spans nem na citação', async () => {
    const [paragrafo, , , citacao] = await corpoDaOrigem(review);
    expect(paragrafo?.children).toEqual(corpo[0]?.children);
    expect((paragrafo?.markDefs as unknown[])[0]).toEqual(corpo[0]?.markDefs?.[0]);
    expect(citacao).toEqual(corpo[3]);
  });

  it('expande o asset da imagem e mantém alt, legenda, hotspot e largura', async () => {
    const [, imagem] = await corpoDaOrigem(review);
    expect(imagem).toEqual({ ...corpo[1], asset: assetExpandido });
  });

  it('expande cada imagem da galeria, com asset null se ele foi apagado', async () => {
    const [, , galeria] = await corpoDaOrigem(review);
    expect(galeria?.imagens).toEqual([
      { _type: 'image', _key: 'a', asset: assetExpandido, alt: 'Primeira' },
      { _type: 'image', _key: 'b', asset: null, alt: 'Sumiu' },
    ]);
  });
});
