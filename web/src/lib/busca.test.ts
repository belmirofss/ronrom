import { describe, expect, it } from 'vitest';
import { indiceDoPost } from '@/lib/busca';

const capa = {
  _type: 'image' as const,
  alt: 'Hirayama no banheiro público',
  asset: {
    _id: 'image-f00-2400x1600-jpg',
    url: 'https://cdn.sanity.io/images/abc123/production/f00-2400x1600.jpg',
    largura: 2400,
    altura: 1600,
    lqip: null,
  },
};

const review = {
  tipo: 'review' as const,
  titulo: 'Dias Perfeitos',
  subtitulo: 'Um filme sobre rotina ',
  dataDePublicacao: '2025-03-10T12:00:00Z',
  categoria: { nome: 'Filmes', slug: 'filmes', modeloFicha: 'filme' as const },
  formato: null,
  nota: 4.5,
  capa,
};

const pensamento = {
  ...review,
  tipo: 'pensamento' as const,
  titulo: 'Sobre café',
  subtitulo: null,
  categoria: null,
  formato: { nome: 'Textos', slug: 'textos' },
  nota: null,
  capa: { ...capa, asset: null },
};

describe('indiceDoPost', () => {
  it('monta filtros e metadados de uma review', () => {
    const indice = indiceDoPost(review, '/reviews/filmes/dias-perfeitos');
    expect(indice.filtros).toEqual([
      ['tipo', 'Review'],
      ['categoria', 'Filmes'],
      ['nota', '4,5 corações'],
    ]);
    const metadados = Object.fromEntries(indice.metadados);
    expect(metadados).toMatchObject({
      title: 'Dias Perfeitos',
      url: '/reviews/filmes/dias-perfeitos',
      image_alt: 'Hirayama no banheiro público',
      date: '2025-03-10T12:00:00Z',
      subtitulo: 'Um filme sobre rotina',
      nota: '4,5 corações',
    });
    expect(indice.data).toBe('2025-03-10T12:00:00Z');
  });

  it('pede a miniatura de 320px em 4:3 ao CDN', () => {
    const imagem = Object.fromEntries(indiceDoPost(review, '/x').metadados)['image'];
    const url = new URL(imagem ?? '');
    expect(url.hostname).toBe('cdn.sanity.io');
    expect(url.searchParams.get('w')).toBe('320');
    expect(url.searchParams.get('h')).toBe('240');
  });

  it('usa o formato em pensamento, sem nota e sem campos vazios', () => {
    const indice = indiceDoPost(pensamento, '/pensamentos/textos/sobre-cafe');
    expect(indice.filtros).toEqual([
      ['tipo', 'Pensamento'],
      ['formato', 'Textos'],
    ]);
    expect(indice.metadados.map(([chave]) => chave)).toEqual(['title', 'url', 'date']);
  });

  it('usa o placeholder fora do CDN (fixtures)', () => {
    const fixture = { ...capa, asset: { ...capa.asset, url: 'data:image/svg+xml,<svg/>' } };
    const metadados = Object.fromEntries(
      indiceDoPost({ ...review, capa: fixture }, '/x').metadados,
    );
    expect(metadados['image']).toBe('data:image/svg+xml,<svg/>');
  });

  it('não põe imagem nem alt sem asset', () => {
    const chaves = indiceDoPost({ ...review, capa: { ...capa, asset: null } }, '/x').metadados.map(
      ([c]) => c,
    );
    expect(chaves).not.toContain('image');
    expect(chaves).not.toContain('image_alt');
  });

  it('derruba o build com review sem nota válida', () => {
    expect(() => indiceDoPost({ ...review, nota: null }, '/x')).toThrow(/Nota inválida/);
  });
});
