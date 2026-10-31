import { anoNoFuso } from '@/lib/utils/data';

// As listas "Lidos e assistidos em {ano}" (#137), geradas das reviews de livros, filmes e séries,
// sem documento próprio no CMS. O ano é o da data de publicação no fuso de Brasília: uma review
// publicada em janeiro sobre um livro lido em dezembro cai no ano seguinte
// (docs/seo-urls.md#listas-do-ano).

// O mínimo para agrupar: serve o card da página e o post do sitemap.
interface ReviewDaLista {
  tipo: 'review' | 'pensamento';
  dataDePublicacao: string;
  modelo?: string | null | undefined;
}

export interface ListaDoAno<Review extends ReviewDaLista = ReviewDaLista> {
  ano: number;
  lidos: Review[];
  assistidos: Review[];
}

// Abaixo disso a página é fina demais para o Google: sai com noindex e fora do sitemap, mas
// continua no site.
export const MINIMO_PARA_INDEXAR = 5;

/** Se a review entra nos lidos, nos assistidos ou em nenhuma das listas. */
export function grupoDaReview(modelo: string | null | undefined): 'lidos' | 'assistidos' | null {
  if (modelo === 'livro') return 'lidos';
  if (modelo === 'filme' || modelo === 'serie') return 'assistidos';
  return null;
}

/**
 * Uma lista por ano com review de livro, filme ou série, do ano mais recente ao mais antigo. As
 * reviews mantêm a ordem em que chegam (a da consulta: da mais recente à mais antiga).
 */
export function listasPorAno<Review extends ReviewDaLista>(
  reviews: readonly Review[],
): ListaDoAno<Review>[] {
  const porAno = new Map<number, ListaDoAno<Review>>();
  for (const review of reviews) {
    const grupo = grupoDaReview(review.modelo);
    if (review.tipo !== 'review' || !grupo) continue;
    const ano = anoNoFuso(review.dataDePublicacao);
    const lista = porAno.get(ano) ?? { ano, lidos: [], assistidos: [] };
    lista[grupo].push(review);
    porAno.set(ano, lista);
  }
  return [...porAno.values()].sort((a, b) => b.ano - a.ano);
}

/** Os anos com lista, do mais recente ao mais antigo, para os links do rodapé. */
export const anosDasListas = (reviews: readonly ReviewDaLista[]) =>
  listasPorAno(reviews).map(({ ano }) => ano);

/** Quantas reviews a lista tem, somando lidos e assistidos. */
export const totalDaLista = (lista: Pick<ListaDoAno, 'lidos' | 'assistidos'>) =>
  lista.lidos.length + lista.assistidos.length;

/** Lista com menos de `MINIMO_PARA_INDEXAR` reviews fica fora do Google. */
export const listaSemIndexacao = (total: number) => total < MINIMO_PARA_INDEXAR;

/** "Lidos e assistidos em 2026" */
export const tituloDaLista = (ano: number) => `Lidos e assistidos em ${ano}`;

/** "1 livro", "3 livros", "1 filme ou série", "2 filmes e séries" */
export function rotuloDoGrupo(grupo: 'lidos' | 'assistidos', total: number): string {
  if (grupo === 'lidos') return total === 1 ? '1 livro' : `${total} livros`;
  return total === 1 ? '1 filme ou série' : `${total} filmes e séries`;
}

/** A description da página: o que a lista do ano reúne, com as contagens. */
export function descricaoDaLista(lista: Pick<ListaDoAno, 'ano' | 'lidos' | 'assistidos'>): string {
  const partes = [
    lista.lidos.length > 0 && rotuloDoGrupo('lidos', lista.lidos.length),
    lista.assistidos.length > 0 && rotuloDoGrupo('assistidos', lista.assistidos.length),
  ].filter(Boolean);
  return `Os livros, filmes e séries que viraram review no Ronrom em ${lista.ano}: ${partes.join(' e ')}, com a nota em corações de cada um.`;
}
