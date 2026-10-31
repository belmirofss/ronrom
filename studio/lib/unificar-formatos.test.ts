import { describe, expect, it } from 'vitest';
import { referencia } from './seed';
import { idPublicado, planoDaUnificacao } from './unificar-formatos';

const SLUGS = new Map([
  ['formato-textos', 'textos'],
  ['formato-frases', 'frases'],
]);

const pensamento = (_id: string, formato: string, campos: object = {}) => ({
  _id,
  tipo: 'pensamento',
  slug: 'sobre-gatos',
  formato,
  ...campos,
});

describe('idPublicado', () => {
  it.each([
    ['post-1', 'post-1'],
    ['drafts.post-1', 'post-1'],
    ['versions.r123.post-1', 'post-1'],
  ])('%s é do post %s', (id, esperado) => {
    expect(idPublicado(id)).toBe(esperado);
  });
});

describe('planoDaUnificacao', () => {
  it('passa o post publicado para "Textos e opiniões" e guarda o caminho antigo', () => {
    expect(
      planoDaUnificacao(
        [
          pensamento('a', 'formato-artigos'),
          pensamento('b', 'formato-opinioes', { slug: 'b', slugsAnteriores: ['/x/y'] }),
        ],
        SLUGS,
      ),
    ).toEqual([
      {
        _id: 'a',
        set: {
          formato: referencia('formato-textos'),
          slugsAnteriores: ['/pensamentos/artigos/sobre-gatos'],
        },
      },
      {
        _id: 'b',
        set: {
          formato: referencia('formato-textos'),
          slugsAnteriores: ['/x/y', '/pensamentos/opinioes/b'],
        },
      },
    ]);
  });

  it('dá ao rascunho o caminho publicado, mesmo com outro slug ou formato', () => {
    expect(
      planoDaUnificacao(
        [
          pensamento('a', 'formato-artigos'),
          pensamento('drafts.a', 'formato-frases', { slug: 'gatos' }),
          pensamento('versions.r1.a', 'formato-artigos', { slug: 'gatos' }),
        ],
        SLUGS,
      ).slice(1),
    ).toEqual([
      { _id: 'drafts.a', set: { slugsAnteriores: ['/pensamentos/artigos/sobre-gatos'] } },
      {
        _id: 'versions.r1.a',
        set: {
          formato: referencia('formato-textos'),
          slugsAnteriores: ['/pensamentos/artigos/sobre-gatos'],
        },
      },
    ]);
  });

  it('só troca o formato do post que nunca foi publicado', () => {
    expect(planoDaUnificacao([pensamento('drafts.a', 'formato-opinioes')], SLUGS)).toEqual([
      { _id: 'drafts.a', set: { formato: referencia('formato-textos') } },
    ]);
  });

  it('não mexe nos posts dos formatos que continuam', () => {
    expect(
      planoDaUnificacao(
        [
          pensamento('a', 'formato-textos'),
          pensamento('drafts.a', 'formato-frases'),
          { _id: 'r', tipo: 'review', slug: 'r' },
        ],
        SLUGS,
      ),
    ).toEqual([]);
  });

  it('não repete um caminho que já está na lista', () => {
    expect(
      planoDaUnificacao(
        [
          pensamento('a', 'formato-artigos', {
            slugsAnteriores: ['/pensamentos/artigos/sobre-gatos'],
          }),
        ],
        SLUGS,
      ),
    ).toEqual([{ _id: 'a', set: { formato: referencia('formato-textos') } }]);
  });
});
