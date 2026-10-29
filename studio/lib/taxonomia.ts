// Taxonomia inicial: categorias das reviews e formatos dos pensamentos, com os `_id`, slugs e
// modelos de ficha de docs/seo-urls.md. O script scripts/criar-taxonomia.ts grava estes
// documentos; os schemas usam a lista de modelos de ficha.

// Qual "ficha" (bloco de dados técnicos) a review de cada categoria usa. Os campos de cada
// modelo ficam em lib/ficha.ts.
export const MODELOS_DE_FICHA = [
  { value: 'filme', title: 'Filme' },
  { value: 'serie', title: 'Série' },
  { value: 'livro', title: 'Livro' },
  { value: 'lugar', title: 'Lugar' },
  { value: 'comida', title: 'Comida' },
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
    _id: 'categoria-livros',
    nome: 'Livros',
    slug: 'livros',
    descricao:
      'Reviews de livros: impressões de leitura, trechos que marcaram e nota em corações para cada um.',
    ordem: 3,
    modeloFicha: 'livro',
  },
  {
    _id: 'categoria-restaurantes-e-cafes',
    nome: 'Restaurantes e cafés',
    slug: 'restaurantes-e-cafes',
    descricao:
      'Reviews de restaurantes e cafés: comida, ambiente, atendimento e se vale a visita, com nota em corações.',
    ordem: 4,
    modeloFicha: 'lugar',
  },
  {
    _id: 'categoria-lugares',
    nome: 'Lugares',
    slug: 'lugares',
    descricao:
      'Reviews de lugares para conhecer: passeios, parques, museus e cantos da cidade, com nota em corações.',
    ordem: 5,
    modeloFicha: 'lugar',
  },
  {
    _id: 'categoria-comidas',
    nome: 'Comidas',
    slug: 'comidas',
    descricao:
      'Reviews de comidas e bebidas: doces, salgados, receitas e produtos que valem (ou não) a prova, com nota em corações.',
    ordem: 6,
    modeloFicha: 'comida',
  },
];

export const FORMATOS: readonly Formato[] = [
  {
    _id: 'formato-artigos',
    nome: 'Artigos',
    slug: 'artigos',
    descricao: 'Artigos: textos mais longos e pensados, que desenvolvem um tema com calma.',
    ordem: 1,
  },
  {
    _id: 'formato-textos',
    nome: 'Textos',
    slug: 'textos',
    descricao: 'Textos livres: crônicas, desabafos e reflexões do dia a dia, sem regra de tamanho.',
    ordem: 2,
  },
  {
    _id: 'formato-frases',
    nome: 'Frases soltas',
    slug: 'frases',
    descricao: 'Frases soltas: pensamentos curtos, anotados do jeito que vieram.',
    ordem: 3,
  },
  {
    _id: 'formato-opinioes',
    nome: 'Opiniões',
    slug: 'opinioes',
    descricao: 'Opiniões sobre o que anda em pauta: livros, filmes, internet e a vida em geral.',
    ordem: 4,
  },
];
