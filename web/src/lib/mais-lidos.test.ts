import { describe, expect, it } from 'vitest';

import { juntarMaisLidos, type ItemDoIndice } from '@/lib/mais-lidos';

const item = (id: string): ItemDoIndice => ({
  id,
  url: `#${id}`,
  titulo: `Post ${id}`,
  subtitulo: null,
  capa: null,
  alt: '',
  tipo: 'review',
  categoria: 'Filmes',
  nota: 4,
  data: '2026-10-01T12:00:00Z',
  leitura: '3 min de leitura',
});

// Do mais recente para o mais antigo, como o /posts-index.json.
const INDICE = ['e', 'd', 'c', 'b', 'a'].map(item);
const ids = (itens: ItemDoIndice[]) => itens.map(({ id }) => id);

describe('juntarMaisLidos', () => {
  it('segue a ordem do ranking', () => {
    const ranking = [{ id: 'b' }, { id: 'a' }, { id: 'd' }];
    expect(ids(juntarMaisLidos(ranking, INDICE, 3))).toEqual(['b', 'a', 'd']);
  });

  it('para no limite', () => {
    const ranking = [{ id: 'b' }, { id: 'a' }, { id: 'd' }];
    expect(ids(juntarMaisLidos(ranking, INDICE, 2))).toEqual(['b', 'a']);
  });

  it('descarta o que não está no índice (post despublicado)', () => {
    const ranking = [{ id: 'sumiu' }, { id: 'b' }];
    expect(ids(juntarMaisLidos(ranking, INDICE, 1))).toEqual(['b']);
  });

  it('com menos posts lidos que o limite, completa com os mais recentes, sem repetir', () => {
    const ranking = [{ id: 'b' }, { id: 'e' }];
    expect(ids(juntarMaisLidos(ranking, INDICE, 4))).toEqual(['b', 'e', 'd', 'c']);
  });

  it('sem ranking, mostra os mais recentes', () => {
    expect(ids(juntarMaisLidos([], INDICE, 3))).toEqual(['e', 'd', 'c']);
  });

  it('não repete um id que vem duas vezes', () => {
    expect(ids(juntarMaisLidos([{ id: 'a' }, { id: 'a' }], INDICE, 2))).toEqual(['a', 'e']);
  });

  it('com menos posts que o limite, mostra todos', () => {
    expect(juntarMaisLidos([{ id: 'a' }], INDICE, 10)).toHaveLength(INDICE.length);
  });
});
