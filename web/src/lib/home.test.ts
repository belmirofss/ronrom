import { describe, expect, it } from 'vitest';
import { POSTS_NA_HOME, ultimosSemODestaque } from '@/lib/home';

const posts = (quantos: number) =>
  Array.from({ length: quantos }, (_, i) => ({ _id: `p${i + 1}` }));
const ids = (lista: { _id: string }[]) => lista.map(({ _id }) => _id);

describe('ultimosSemODestaque', () => {
  it('tira o destaque e completa com o post seguinte', () => {
    expect(ids(ultimosSemODestaque(posts(8), { _id: 'p1' }))).toEqual([
      'p2',
      'p3',
      'p4',
      'p5',
      'p6',
      'p7',
    ]);
  });

  it('mantém a ordem recebida com o destaque no meio da lista', () => {
    expect(ids(ultimosSemODestaque(posts(4), { _id: 'p3' }, 3))).toEqual(['p1', 'p2', 'p4']);
  });

  it('mostra os primeiros quando o destaque é antigo e não está na lista', () => {
    expect(ids(ultimosSemODestaque(posts(3), { _id: 'antigo' }, 2))).toEqual(['p1', 'p2']);
  });

  it(`mostra ${POSTS_NA_HOME} posts por padrão`, () => {
    expect(ultimosSemODestaque(posts(12), null)).toHaveLength(POSTS_NA_HOME);
  });

  it('devolve menos posts quando não há o bastante', () => {
    expect(ids(ultimosSemODestaque(posts(2), { _id: 'p1' }))).toEqual(['p2']);
    expect(ultimosSemODestaque(posts(1), { _id: 'p1' })).toEqual([]);
    expect(ultimosSemODestaque([], null)).toEqual([]);
  });
});
