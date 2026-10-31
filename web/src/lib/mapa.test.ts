import { describe, expect, it, vi } from 'vitest';
import {
  coordenadas,
  lugaresPorCidade,
  nomeDaCidade,
  pontosDoMapa,
  resumoDosLugares,
  SEM_CIDADE,
} from '@/lib/mapa';
import { buscarLugares } from '@/lib/sanity/conteudo';
import type { CONSULTA_DOS_LUGARES_RESULT } from '@/lib/sanity/tipos.gerados';

vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: true,
  SANITY_PROJECT_ID: undefined,
  SANITY_DATASET: undefined,
  SANITY_API_VERSION: '2025-02-19',
  STUDIO_URL: 'https://ronrom.sanity.studio',
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: false,
}));
vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

type Lugar = CONSULTA_DOS_LUGARES_RESULT[number];

const lugar = (slug: string, extra: Partial<Lugar> = {}): Lugar => ({
  _id: slug,
  tipo: 'review',
  titulo: slug,
  slug,
  nota: 4,
  categoria: { nome: 'Lugares', slug: 'lugares' },
  endereco: { bairro: null, cidade: 'São Paulo', uf: 'SP' },
  localizacao: null,
  ...extra,
});

describe('buscarLugares', () => {
  it('traz só as reviews com ficha de lugar, em ordem alfabética', async () => {
    const lugares = await buscarLugares();
    expect(lugares.map(({ slug }) => slug)).toEqual(['cafe-do-bairro', 'mirante-do-morro-azul']);
    expect(lugares[0]?.localizacao).toEqual({ lat: -23.5869, lng: -46.6388 });
    expect(lugares[1]?.localizacao).toBeNull();
  });
});

describe('coordenadas', () => {
  it('aceita latitude e longitude dentro do globo', () => {
    expect(coordenadas({ localizacao: { lat: -23.5, lng: -46.6 } })).toEqual({
      lat: -23.5,
      lng: -46.6,
    });
  });

  it('recusa ponto pela metade, fora do globo ou ausente', () => {
    expect(coordenadas({ localizacao: null })).toBeUndefined();
    expect(coordenadas({ localizacao: { lat: -23.5, lng: null } })).toBeUndefined();
    expect(coordenadas({ localizacao: { lat: 91, lng: 0 } })).toBeUndefined();
    expect(coordenadas({ localizacao: { lat: 0, lng: -181 } })).toBeUndefined();
    expect(coordenadas({ localizacao: { lat: Number.NaN, lng: 0 } })).toBeUndefined();
  });
});

describe('nomeDaCidade', () => {
  it('junta cidade e estado como na ficha', () => {
    expect(nomeDaCidade({ bairro: null, cidade: ' Campos do Jordão ', uf: 'SP' })).toBe(
      'Campos do Jordão/SP',
    );
  });

  it('sem cidade nem estado, vai para "Outros lugares"', () => {
    expect(nomeDaCidade(null)).toBe(SEM_CIDADE);
    expect(nomeDaCidade({ bairro: 'Centro', cidade: '  ', uf: null })).toBe(SEM_CIDADE);
  });
});

describe('lugaresPorCidade', () => {
  it('agrupa por cidade em ordem alfabética, sem diferenciar acento, com "Outros" no fim', () => {
    const cidades = lugaresPorCidade([
      lugar('a', { endereco: null }),
      lugar('b', { endereco: { bairro: null, cidade: 'Ubatuba', uf: 'SP' } }),
      lugar('c', { endereco: { bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP' } }),
      lugar('d', { endereco: { bairro: null, cidade: 'Águas de Lindóia', uf: 'SP' } }),
      lugar('e'),
    ]);
    expect(cidades.map(({ nome, lugares }) => [nome, lugares.map(({ id }) => id)])).toEqual([
      ['Águas de Lindóia/SP', ['d']],
      ['São Paulo/SP', ['c', 'e']],
      ['Ubatuba/SP', ['b']],
      [SEM_CIDADE, ['a']],
    ]);
  });

  it('monta o item da lista com a URL da review e se o lugar está no mapa', () => {
    const [cidade] = lugaresPorCidade([
      lugar('cafe', {
        categoria: { nome: 'Restaurantes e cafés', slug: 'restaurantes-e-cafes' },
        endereco: { bairro: 'Vila Mariana', cidade: 'São Paulo', uf: 'SP' },
        localizacao: { lat: -23.58, lng: -46.63 },
      }),
    ]);
    expect(cidade?.lugares).toEqual([
      {
        id: 'cafe',
        titulo: 'cafe',
        url: '/reviews/restaurantes-e-cafes/cafe',
        categoria: 'Restaurantes e cafés',
        bairro: 'Vila Mariana',
        nota: 4,
        noMapa: true,
      },
    ]);
  });
});

describe('pontosDoMapa', () => {
  it('deixa de fora os lugares sem coordenadas', () => {
    expect(
      pontosDoMapa([lugar('sem'), lugar('com', { localizacao: { lat: -22.9, lng: -43.2 } })]),
    ).toEqual([
      { titulo: 'com', url: '/reviews/lugares/com', categoria: 'Lugares', lat: -22.9, lng: -43.2 },
    ]);
  });
});

describe('resumoDosLugares', () => {
  it('conta lugares e cidades, com singular e plural', () => {
    expect(resumoDosLugares(lugaresPorCidade([lugar('a')]))).toBe('1 lugar em 1 cidade');
    expect(
      resumoDosLugares(
        lugaresPorCidade([
          lugar('a'),
          lugar('b'),
          lugar('c', { endereco: { bairro: null, cidade: 'Ubatuba', uf: 'SP' } }),
        ]),
      ),
    ).toBe('3 lugares em 2 cidades');
  });

  it('sem nenhuma cidade conhecida, só conta os lugares', () => {
    expect(resumoDosLugares(lugaresPorCidade([lugar('a', { endereco: null })]))).toBe('1 lugar');
  });
});
