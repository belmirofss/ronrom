// Taxonomia inicial: categorias das reviews e formatos dos pensamentos, com os `_id`, slugs e
// modelos de ficha de docs/seo-urls.md. O script scripts/criar-taxonomia.ts grava estes
// documentos; os schemas usam a lista de modelos de ficha.

import type { Documento } from './seed';

// Qual "ficha" (bloco de dados técnicos) a review de cada categoria usa. Os campos de cada
// modelo ficam em lib/ficha.ts.
export const MODELOS_DE_FICHA = [
  { value: 'filme', title: 'Filme' },
  { value: 'serie', title: 'Série' },
  { value: 'livro', title: 'Livro' },
  { value: 'lugar', title: 'Lugar' },
] as const;

export type ModeloDeFicha = (typeof MODELOS_DE_FICHA)[number]['value'];

export interface Categoria {
  _id: `categoria-${string}`;
  nome: string;
  slug: string;
  descricao: string;
  ordem: number;
  modeloFicha: ModeloDeFicha;
}

export interface Formato {
  _id: `formato-${string}`;
  nome: string;
  slug: string;
  descricao: string;
  ordem: number;
}

// "Outros lugares" se chamava Lugares até a #142 e manteve o slug `lugares`. As categorias que
// deixaram de existir estão em CATEGORIAS_REMOVIDAS.
export const CATEGORIAS: readonly Categoria[] = [
  {
    _id: 'categoria-filmes',
    nome: 'Filmes',
    slug: 'filmes',
    descricao:
      'Reviews de filmes: impressões, o que ficou depois dos créditos e se vale a pena assistir, com nota em corações.',
    ordem: 1,
    modeloFicha: 'filme',
  },
  {
    _id: 'categoria-series',
    nome: 'Séries',
    slug: 'series',
    descricao:
      'Reviews de séries, de uma temporada ou da história inteira, com nota em corações e a ficha de cada uma.',
    ordem: 2,
    modeloFicha: 'serie',
  },
  {
    _id: 'categoria-documentarios',
    nome: 'Documentários',
    slug: 'documentarios',
    descricao:
      'Reviews de documentários: o assunto, como ele é contado e se vale a pena assistir, com nota em corações.',
    ordem: 3,
    modeloFicha: 'filme',
  },
  {
    _id: 'categoria-livros',
    nome: 'Livros',
    slug: 'livros',
    descricao:
      'Reviews de livros: impressões de leitura, trechos que marcaram e nota em corações para cada um.',
    ordem: 4,
    modeloFicha: 'livro',
  },
  {
    _id: 'categoria-restaurantes-e-cafes',
    nome: 'Restaurantes e cafés',
    slug: 'restaurantes-e-cafes',
    descricao:
      'Reviews de restaurantes e cafés: comida, ambiente, atendimento e se vale a visita, com nota em corações.',
    ordem: 5,
    modeloFicha: 'lugar',
  },
  {
    _id: 'categoria-lugares',
    nome: 'Outros lugares',
    slug: 'lugares',
    descricao:
      'Reviews de lugares para conhecer: passeios, parques, museus e cantos da cidade, com nota em corações.',
    ordem: 6,
    modeloFicha: 'lugar',
  },
];

// Categorias apagadas na #142, sem posts publicados. Usado pelo scripts/revisar-categorias.ts; o
// redirect da listagem antiga fica em web/redirects.mjs.
export const CATEGORIAS_REMOVIDAS = [{ _id: 'categoria-comidas', slug: 'comidas' }] as const;

// "Textos e opiniões" juntou Artigos, Textos e Opiniões (#143) e manteve o slug `textos`, para não
// mudar o endereço dos textos. Os formatos que deixaram de existir estão em FORMATOS_UNIFICADOS.
export const FORMATOS: readonly Formato[] = [
  {
    _id: 'formato-textos',
    nome: 'Textos e opiniões',
    slug: 'textos',
    descricao:
      'Textos e opiniões: crônicas, reflexões do dia a dia e o que eu penso sobre o que anda em pauta, sem regra de tamanho.',
    ordem: 1,
  },
  {
    _id: 'formato-frases',
    nome: 'Frases soltas',
    slug: 'frases',
    descricao: 'Frases soltas: pensamentos curtos, anotados do jeito que vieram.',
    ordem: 2,
  },
];

// Formatos apagados na unificação da #143 e o formato que ficou com os posts deles. Usado pelo
// scripts/unificar-formatos.ts; os redirects das listagens antigas ficam em web/redirects.mjs.
export const FORMATOS_UNIFICADOS = {
  destino: { _id: 'formato-textos', slug: 'textos' },
  removidos: [
    { _id: 'formato-artigos', slug: 'artigos' },
    { _id: 'formato-opinioes', slug: 'opinioes' },
  ],
} as const;

// Os oito documentos como são gravados no Sanity, com o slug no formato do campo. Usado pelo
// scripts/criar-taxonomia.ts e pelo seed de desenvolvimento (scripts/seed.ts).
export function documentosDaTaxonomia(): Documento[] {
  return [
    ...CATEGORIAS.map(({ slug, ...categoria }) => ({
      _type: 'categoria',
      ...categoria,
      slug: { _type: 'slug', current: slug },
    })),
    ...FORMATOS.map(({ slug, ...formato }) => ({
      _type: 'formato',
      ...formato,
      slug: { _type: 'slug', current: slug },
    })),
  ];
}
