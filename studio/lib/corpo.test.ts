import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';

import { CORPO_NO_GROQ } from './corpo';

// Um parágrafo com um link externo e um interno, e uma imagem no meio do texto.
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
  { _type: 'imagem', _key: 'i1', alt: 'Uma xícara', largura: 'normal' },
];

function dataset(destino: Record<string, unknown> | undefined) {
  return [
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

  it('não mexe no link externo, nos spans nem nos outros blocos', async () => {
    const [paragrafo, imagem] = await corpoDaOrigem(review);
    expect(paragrafo?.children).toEqual(corpo[0]?.children);
    expect((paragrafo?.markDefs as unknown[])[0]).toEqual(corpo[0]?.markDefs?.[0]);
    expect(imagem).toEqual(corpo[1]);
  });
});
