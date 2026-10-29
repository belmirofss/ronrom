// Regras do post que não dependem do Sanity: tipos, caminho no site, slugs anteriores, data e
// subtítulo da lista. Usadas pelo schema (schemaTypes/post.ts) e pela ação de publicar
// (acoes/publicarPost.ts).

export const TIPOS_DE_POST = [
  { value: 'review', title: 'Review' },
  { value: 'pensamento', title: 'Pensamento' },
] as const;

export type TipoDePost = (typeof TIPOS_DE_POST)[number]['value'];

// Slugs já resolvidos (o da categoria ou do formato, não a referência).
export interface PostComCaminho {
  tipo?: string | undefined;
  slug?: string | undefined;
  categoria?: string | undefined;
  formato?: string | undefined;
}

// Mesmo caminho do `urlDoPost` do site (docs/seo-urls.md#urldopostpost), ou `undefined` quando
// falta alguma parte. Não lança erro: no Studio o post pode estar incompleto.
export function caminhoDoPost({ tipo, slug, categoria, formato }: PostComCaminho) {
  if (!slug) return undefined;
  if (tipo === 'review' && categoria) return `/reviews/${categoria}/${slug}`;
  if (tipo === 'pensamento' && formato) return `/pensamentos/${formato}/${slug}`;
  return undefined;
}

// Lista de "slugs anteriores" depois de publicar, ou `undefined` quando ela não muda. Guarda o
// caminho completo antigo, para o redirect da #53 cobrir também a troca de categoria ou formato.
export function slugsAnterioresAoPublicar(
  anteriores: readonly string[],
  caminhoPublicado: string | undefined,
  caminhoNovo: string | undefined,
): string[] | undefined {
  if (!caminhoNovo) return undefined;

  // Voltar a um endereço antigo tira ele da lista: o endereço atual não pode redirecionar.
  const lista = anteriores.filter((caminho) => caminho !== caminhoNovo);
  if (caminhoPublicado && caminhoPublicado !== caminhoNovo && !lista.includes(caminhoPublicado)) {
    lista.push(caminhoPublicado);
  }

  const mudou =
    lista.length !== anteriores.length || lista.some((caminho, i) => caminho !== anteriores[i]);
  return mudou ? lista : undefined;
}

// Não há agendamento (#1): a data de publicação não pode passar de agora.
export function dataNoFuturo(iso: string, agora = new Date()) {
  return new Date(iso).getTime() > agora.getTime();
}

// 4 → "♥♥♥♥", 3.5 → "♥♥♥½". Nota fora de 0,5 a 5 em meios fica em branco, sem quebrar a lista.
export function notaEmCoracoes(nota: number | undefined) {
  if (nota === undefined || !Number.isInteger(nota * 2) || nota < 0.5 || nota > 5) return '';
  return '♥'.repeat(Math.floor(nota)) + (Number.isInteger(nota) ? '' : '½');
}

interface PostNaLista {
  tipo?: string | undefined;
  categoria?: string | undefined;
  formato?: string | undefined;
  nota?: number | undefined;
}

// Subtítulo na lista de posts do Studio: "Review · Filmes · ♥♥♥♥" ou "Pensamento · Frases soltas".
export function subtituloDoPost({ tipo, categoria, formato, nota }: PostNaLista) {
  const partes =
    tipo === 'review'
      ? ['Review', categoria, notaEmCoracoes(nota)]
      : tipo === 'pensamento'
        ? ['Pensamento', formato]
        : ['Sem tipo'];
  return partes.filter(Boolean).join(' · ');
}
