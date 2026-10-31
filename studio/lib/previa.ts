// Prévia de rascunhos no Presentation (#43, docs/adr/0006): de um documento para os endereços da
// prévia em que ele aparece (`resolve.locations`), e de um endereço para o documento principal
// dele (`resolve.mainDocuments`). Usadas pela configuração (sanity.config.ts).

import { caminhoDoPost } from './post';

// O build da prévia, no projeto ronrom-previa da Vercel. As rotas do draft mode só existem nele.
export const URL_DA_PREVIA_PADRAO = 'https://ronrom-previa.vercel.app';
export const ATIVAR_A_PREVIA = '/api/previa/ativar';
export const DESATIVAR_A_PREVIA = '/api/previa/desativar';

const HOME = { title: 'Home', href: '/' };

// Campos do post que o `locaisDoPost` lê, com os slugs já resolvidos.
export const CAMPOS_DO_LOCAL_DO_POST = {
  titulo: 'titulo',
  tipo: 'tipo',
  slug: 'slug.current',
  categoria: 'categoria.slug.current',
  formato: 'formato.slug.current',
};

interface PostNoLocal {
  titulo?: string | undefined;
  tipo?: string | undefined;
  slug?: string | undefined;
  categoria?: string | undefined;
  formato?: string | undefined;
}

/** Onde o post aparece na prévia: a página dele e a home. Sem endereço, um aviso. */
export function locaisDoPost(post: PostNoLocal | null) {
  const caminho = post ? caminhoDoPost(post) : undefined;
  if (!post || !caminho) {
    return {
      message: 'Escolha o tipo, a categoria ou o formato e o slug para ver a prévia deste post.',
      tone: 'caution' as const,
    };
  }
  return { locations: [{ title: post.titulo || 'Sem título', href: caminho }, HOME] };
}

/** Os singletons: as Configurações aparecem na home; o Sobre, na página dele e na barra lateral. */
export const LOCAIS_DOS_SINGLETONS = {
  configuracoes: { locations: [HOME] },
  sobre: { locations: [{ title: 'Sobre', href: '/sobre' }, HOME] },
};

/** O documento que abre no editor quando a prévia navega para cada endereço. */
export const DOCUMENTOS_DAS_ROTAS = [
  {
    route: '/reviews/:secao/:slug',
    filter:
      '_type == "post" && tipo == "review" && slug.current == $slug && categoria->slug.current == $secao',
  },
  {
    route: '/pensamentos/:secao/:slug',
    filter:
      '_type == "post" && tipo == "pensamento" && slug.current == $slug && formato->slug.current == $secao',
  },
  { route: '/sobre', filter: '_id == "sobre"' },
  { route: '/', filter: '_id == "configuracoes"' },
];
