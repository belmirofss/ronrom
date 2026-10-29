import { describe, expect, it } from 'vitest';
import {
  caminhoDoPost,
  dataNoFuturo,
  notaEmCoracoes,
  slugsAnterioresAoPublicar,
  subtituloDoPost,
} from './post';

describe('caminhoDoPost', () => {
  it('monta o caminho da review com a categoria', () => {
    expect(caminhoDoPost({ tipo: 'review', slug: 'dias-perfeitos', categoria: 'filmes' })).toBe(
      '/reviews/filmes/dias-perfeitos',
    );
  });

  it('monta o caminho do pensamento com o formato', () => {
    expect(caminhoDoPost({ tipo: 'pensamento', slug: 'sobre-gatos', formato: 'frases' })).toBe(
      '/pensamentos/frases/sobre-gatos',
    );
  });

  it.each([
    { tipo: 'review', slug: 'x' },
    { tipo: 'review', slug: 'x', formato: 'frases' },
    { tipo: 'pensamento', slug: 'x', categoria: 'filmes' },
    { tipo: 'review', categoria: 'filmes' },
    { slug: 'x', categoria: 'filmes' },
  ])('devolve undefined quando falta parte: %o', (post) => {
    expect(caminhoDoPost(post)).toBeUndefined();
  });
});

describe('slugsAnterioresAoPublicar', () => {
  const antigo = '/reviews/filmes/dias-perfeitos';
  const novo = '/reviews/filmes/dias-perfeitos-2023';

  it('guarda o caminho publicado quando o slug muda', () => {
    expect(slugsAnterioresAoPublicar([], antigo, novo)).toEqual([antigo]);
  });

  it('guarda o caminho completo quando só a categoria muda', () => {
    expect(slugsAnterioresAoPublicar([], '/reviews/filmes/x', '/reviews/series/x')).toEqual([
      '/reviews/filmes/x',
    ]);
  });

  it('acrescenta no fim, mantendo os anteriores', () => {
    expect(slugsAnterioresAoPublicar(['/reviews/filmes/primeiro'], antigo, novo)).toEqual([
      '/reviews/filmes/primeiro',
      antigo,
    ]);
  });

  it('não muda nada quando o caminho continua o mesmo', () => {
    expect(slugsAnterioresAoPublicar(['/reviews/filmes/primeiro'], antigo, antigo)).toBeUndefined();
  });

  it('não muda nada na primeira publicação', () => {
    expect(slugsAnterioresAoPublicar([], undefined, novo)).toBeUndefined();
  });

  it('não repete um caminho que já está na lista', () => {
    expect(slugsAnterioresAoPublicar([antigo], antigo, novo)).toBeUndefined();
  });

  it('tira da lista o caminho que voltou a ser o atual', () => {
    expect(slugsAnterioresAoPublicar([antigo], novo, antigo)).toEqual([novo]);
  });

  it('não mexe na lista quando o caminho novo está incompleto', () => {
    expect(slugsAnterioresAoPublicar([], antigo, undefined)).toBeUndefined();
  });
});

describe('dataNoFuturo', () => {
  const agora = new Date('2026-10-29T12:00:00-03:00');

  it('aceita agora e o passado', () => {
    expect(dataNoFuturo('2026-10-29T12:00:00-03:00', agora)).toBe(false);
    expect(dataNoFuturo('2026-10-28T09:00:00-03:00', agora)).toBe(false);
  });

  it('recusa um minuto depois de agora', () => {
    expect(dataNoFuturo('2026-10-29T12:01:00-03:00', agora)).toBe(true);
  });
});

describe('notaEmCoracoes', () => {
  it.each([
    [0.5, '½'],
    [1, '♥'],
    [3.5, '♥♥♥½'],
    [4, '♥♥♥♥'],
    [5, '♥♥♥♥♥'],
  ])('%d vira "%s"', (nota, coracoes) => {
    expect(notaEmCoracoes(nota)).toBe(coracoes);
  });

  it.each([undefined, 0, 4.3, 5.5, -1, Number.NaN])(
    'deixa em branco a nota inválida %s',
    (nota) => {
      expect(notaEmCoracoes(nota)).toBe('');
    },
  );
});

describe('subtituloDoPost', () => {
  it('mostra tipo, categoria e nota da review', () => {
    expect(subtituloDoPost({ tipo: 'review', categoria: 'Filmes', nota: 4 })).toBe(
      'Review · Filmes · ♥♥♥♥',
    );
  });

  it('mostra tipo e formato do pensamento, sem nota', () => {
    expect(subtituloDoPost({ tipo: 'pensamento', formato: 'Frases soltas', nota: 4 })).toBe(
      'Pensamento · Frases soltas',
    );
  });

  it('pula o que ainda não foi preenchido', () => {
    expect(subtituloDoPost({ tipo: 'review' })).toBe('Review');
  });

  it('avisa quando o post não tem tipo', () => {
    expect(subtituloDoPost({})).toBe('Sem tipo');
  });
});
