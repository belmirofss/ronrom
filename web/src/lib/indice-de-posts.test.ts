import { describe, expect, it, vi } from 'vitest';
import { itemDoIndice } from '@/lib/indice-de-posts';
import { buscarIndiceDePosts } from '@/lib/sanity/conteudo';
import type { CONSULTA_DO_INDICE_DE_POSTS_RESULT } from '@/lib/sanity/tipos.gerados';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom.blog' }));

type Post = CONSULTA_DO_INDICE_DE_POSTS_RESULT[number];

const review: Post = {
  _id: 'post-cafe-do-bairro',
  tipo: 'review',
  slug: 'cafe-do-bairro',
  titulo: 'Café do bairro',
  subtitulo: 'Pão de queijo & café coado',
  dataDePublicacao: '2026-03-14T15:00:00Z',
  nota: 4.5,
  categoria: { nome: 'Restaurantes e cafés', slug: 'restaurantes-e-cafes' },
  formato: null,
  capa: {
    _type: 'image',
    alt: 'Xícara e pão de queijo',
    asset: {
      _id: 'image-f00-2400x1600-jpg',
      url: 'https://cdn.sanity.io/images/abc123/production/f00-2400x1600.jpg',
      largura: 2400,
      altura: 1600,
      lqip: 'data:image/jpeg;base64,AAAA',
    },
  },
  textoDoCorpo: [{ _type: 'block', children: [{ text: 'palavra '.repeat(450) }] }],
};

const pensamento: Post = {
  ...review,
  _id: 'post-domingo',
  tipo: 'pensamento',
  slug: 'domingo',
  titulo: 'Domingo',
  subtitulo: null,
  nota: null,
  categoria: null,
  formato: { nome: 'Crônica', slug: 'cronica' },
};

describe('itemDoIndice', () => {
  it('resolve URL, seção, nota, miniatura e tempo de leitura de uma review', () => {
    const item = itemDoIndice(review);
    expect(item).toMatchObject({
      id: 'post-cafe-do-bairro',
      url: '/reviews/restaurantes-e-cafes/cafe-do-bairro',
      titulo: 'Café do bairro',
      subtitulo: 'Pão de queijo & café coado',
      alt: 'Xícara e pão de queijo',
      tipo: 'review',
      categoria: 'Restaurantes e cafés',
      nota: 4.5,
      data: '2026-03-14T15:00:00Z',
      leitura: '3 min de leitura',
      capa: { width: 480, height: 360 },
    });
    expect(item.capa?.src).toMatch(/^https:\/\/cdn\.sanity\.io\/.*w=480&h=360/);
  });

  it('não leva o texto do corpo nem o lqip para o JSON', () => {
    const json = JSON.stringify(itemDoIndice(review));
    expect(json).not.toContain('palavra');
    expect(json).not.toContain('base64');
  });

  it('usa o formato como seção e não tem nota num pensamento', () => {
    expect(itemDoIndice(pensamento)).toMatchObject({
      url: '/pensamentos/cronica/domingo',
      categoria: 'Crônica',
      nota: null,
      subtitulo: null,
    });
  });

  it('sem o asset da capa, vai sem miniatura', () => {
    expect(itemDoIndice({ ...review, capa: { ...review.capa, asset: null } }).capa).toBeNull();
  });

  it('derruba o build com uma review sem nota', () => {
    expect(() => itemDoIndice({ ...review, nota: null })).toThrow('Nota inválida');
  });

  it('monta um item por post das fixtures, sem repetir id', async () => {
    const itens = (await buscarIndiceDePosts()).map(itemDoIndice);
    expect(itens.length).toBeGreaterThan(0);
    expect(new Set(itens.map(({ id }) => id)).size).toBe(itens.length);
  });
});
