import { describe, expect, it } from 'vitest';
import {
  anosDasListas,
  descricaoDaLista,
  grupoDaReview,
  listaSemIndexacao,
  listasPorAno,
  MINIMO_PARA_INDEXAR,
  rotuloDoGrupo,
  totalDaLista,
} from '@/lib/listas';

const review = (id: string, modelo: string | null, dataDePublicacao: string) => ({
  id,
  tipo: 'review' as const,
  modelo,
  dataDePublicacao,
});

describe('grupoDaReview', () => {
  it('separa livros (lidos) de filmes e séries (assistidos)', () => {
    expect(grupoDaReview('livro')).toBe('lidos');
    expect(grupoDaReview('filme')).toBe('assistidos');
    expect(grupoDaReview('serie')).toBe('assistidos');
  });

  it('deixa lugares, comidas e review sem categoria fora das listas', () => {
    expect(grupoDaReview('lugar')).toBeNull();
    expect(grupoDaReview('comida')).toBeNull();
    expect(grupoDaReview(null)).toBeNull();
  });
});

describe('listasPorAno', () => {
  it('agrupa por ano, do mais recente ao mais antigo, mantendo a ordem das reviews', () => {
    const listas = listasPorAno([
      review('serie-nova', 'serie', '2026-05-01T12:00:00Z'),
      review('livro-novo', 'livro', '2026-04-01T12:00:00Z'),
      review('filme-novo', 'filme', '2026-03-01T12:00:00Z'),
      review('cafe', 'lugar', '2026-02-01T12:00:00Z'),
      review('livro-antigo', 'livro', '2024-06-01T12:00:00Z'),
    ]);

    expect(
      listas.map(({ ano, lidos, assistidos }) => ({
        ano,
        lidos: lidos.map(({ id }) => id),
        assistidos: assistidos.map(({ id }) => id),
      })),
    ).toEqual([
      { ano: 2026, lidos: ['livro-novo'], assistidos: ['serie-nova', 'filme-novo'] },
      { ano: 2024, lidos: ['livro-antigo'], assistidos: [] },
    ]);
  });

  it('usa o ano de Brasília: a review da noite de 31/12 fica no ano que termina', () => {
    const [lista] = listasPorAno([review('reveillon', 'filme', '2027-01-01T01:00:00Z')]);
    expect(lista?.ano).toBe(2026);
  });

  it('ignora pensamentos e devolve nada sem review de livro, filme ou série', () => {
    expect(
      listasPorAno([
        { tipo: 'pensamento' as const, modelo: null, dataDePublicacao: '2026-01-01T12:00:00Z' },
        review('cafe', 'lugar', '2026-01-01T12:00:00Z'),
      ]),
    ).toEqual([]);
  });
});

describe('anosDasListas', () => {
  it('devolve cada ano com lista uma vez, do mais recente ao mais antigo', () => {
    expect(
      anosDasListas([
        review('a', 'livro', '2024-06-01T12:00:00Z'),
        review('b', 'filme', '2026-03-01T12:00:00Z'),
        review('c', 'serie', '2026-01-01T12:00:00Z'),
        review('d', 'lugar', '2025-01-01T12:00:00Z'),
      ]),
    ).toEqual([2026, 2024]);
  });
});

describe('indexação', () => {
  it(`indexa a partir de ${MINIMO_PARA_INDEXAR} reviews somando lidos e assistidos`, () => {
    const lista = { lidos: [1, 2], assistidos: [3, 4] } as never;
    expect(totalDaLista(lista)).toBe(4);
    expect(listaSemIndexacao(MINIMO_PARA_INDEXAR - 1)).toBe(true);
    expect(listaSemIndexacao(MINIMO_PARA_INDEXAR)).toBe(false);
  });
});

describe('textos', () => {
  it('conta livros e filmes e séries no singular e no plural', () => {
    expect(rotuloDoGrupo('lidos', 1)).toBe('1 livro');
    expect(rotuloDoGrupo('lidos', 3)).toBe('3 livros');
    expect(rotuloDoGrupo('assistidos', 1)).toBe('1 filme ou série');
    expect(rotuloDoGrupo('assistidos', 2)).toBe('2 filmes e séries');
  });

  it('descreve só os grupos que têm review', () => {
    const lista = (lidos: number, assistidos: number) =>
      ({ ano: 2026, lidos: Array(lidos), assistidos: Array(assistidos) }) as never;

    expect(descricaoDaLista(lista(2, 1))).toContain('em 2026: 2 livros e 1 filme ou série,');
    expect(descricaoDaLista(lista(0, 3))).toContain('em 2026: 3 filmes e séries,');
  });
});
