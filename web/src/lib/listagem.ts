import { urlDaPagina } from '@/lib/rotas';

// O que as listagens paginadas (/posts, /reviews, /pensamentos, categoria, formato e tag, #46)
// calculam além dos dados: as páginas a gerar, os títulos e o canonical/prev/next de cada página.
// O número de páginas vem do `totalDePaginas(total)` de @/lib/sanity/conteudo.

/**
 * As páginas que ficam em `{base}/pagina/[n]`: da 2 até a última. A página 1 é a própria base,
 * então uma listagem de uma página só não gera nenhuma, e `/pagina/1` nunca existe.
 */
export function paginasExtras(paginas: number): number[] {
  if (!Number.isInteger(paginas) || paginas < 1) {
    throw new Error(`Total de páginas inválido: ${paginas} (precisa ser inteiro a partir de 1).`);
  }
  return Array.from({ length: paginas - 1 }, (_, i) => i + 2);
}

/** Caminhos da página `atual` para o <Seo>: o canonical é a própria página (#52). */
export interface SeoDaPaginacao {
  canonical: string;
  prev?: string | undefined;
  next?: string | undefined;
}

export function seoDaPaginacao(base: string, atual: number, paginas: number): SeoDaPaginacao {
  if (!Number.isInteger(atual) || atual < 1 || atual > paginas) {
    throw new Error(`Página inválida: ${atual} (a listagem ${base} tem ${paginas}).`);
  }
  return {
    canonical: urlDaPagina(base, atual),
    prev: atual > 1 ? urlDaPagina(base, atual - 1) : undefined,
    next: atual < paginas ? urlDaPagina(base, atual + 1) : undefined,
  };
}

/** "Reviews de filmes" na página 1 e "Reviews de filmes — página 2" da 2 em diante. */
export function tituloComPagina(titulo: string, pagina: number): string {
  return pagina > 1 ? `${titulo} — página ${pagina}` : titulo;
}

/** "Reviews de filmes", "Reviews de restaurantes e cafés". */
export function tituloDaCategoria(nome: string): string {
  return `Reviews de ${nome.toLocaleLowerCase('pt-BR')}`;
}

/** "#café" */
export function tituloDaTag(nome: string): string {
  return `#${nome}`;
}

/** Os textos de uma listagem que a `Listagem.astro` recebe, além dos dados. */
export interface TextosDaListagem {
  titulo: string;
  descricao?: string | null | undefined;
  descricaoPadrao: string;
  mensagemVazia: string;
}

/** /posts, /reviews e /pensamentos, que não têm documento no CMS. */
export const TEXTOS_DAS_SECOES = {
  posts: {
    titulo: 'Todos os posts',
    descricaoPadrao:
      'Todos os posts do Ronrom, reviews e pensamentos, dos mais recentes aos mais antigos.',
    mensagemVazia: 'Ainda não tem nenhum post por aqui.',
  },
  review: {
    titulo: 'Reviews',
    descricaoPadrao:
      'As reviews do Ronrom: filmes, séries, livros, restaurantes e cafés, lugares e comidas.',
    mensagemVazia: 'Ainda não tem nenhuma review por aqui.',
  },
  pensamento: {
    titulo: 'Pensamentos',
    descricaoPadrao: 'Os pensamentos do Ronrom: textos, opiniões e frases soltas.',
    mensagemVazia: 'Ainda não tem nenhum pensamento por aqui.',
  },
} as const satisfies Record<string, TextosDaListagem>;

interface Taxonomia {
  nome: string;
  descricao?: string | null | undefined;
}

export function textosDaCategoria({ nome, descricao }: Taxonomia): TextosDaListagem {
  const titulo = tituloDaCategoria(nome);
  return {
    titulo,
    descricao,
    descricaoPadrao: `${titulo} no Ronrom, das mais recentes às mais antigas.`,
    mensagemVazia: `Ainda não tem nenhuma review de ${nome.toLocaleLowerCase('pt-BR')} por aqui.`,
  };
}

export function textosDoFormato({ nome, descricao }: Taxonomia): TextosDaListagem {
  return {
    titulo: nome,
    descricao,
    descricaoPadrao: `${nome} do Ronrom, dos mais recentes aos mais antigos.`,
    mensagemVazia: `Ainda não tem nenhum post em ${nome} por aqui.`,
  };
}

export function textosDaTag({ nome }: Pick<Taxonomia, 'nome'>): TextosDaListagem {
  const titulo = tituloDaTag(nome);
  return {
    titulo,
    descricaoPadrao: `Posts com a tag ${titulo} no Ronrom, dos mais recentes aos mais antigos.`,
    mensagemVazia: `Ainda não tem nenhum post com a tag ${titulo}.`,
  };
}
