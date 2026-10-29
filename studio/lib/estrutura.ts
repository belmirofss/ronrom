// Regras da navegação do Studio que não dependem do Sanity: ids dos singletons, filtros GROQ das
// listas e valores iniciais dos modelos "Nova review" e "Novo pensamento". Usadas pela estrutura
// (estrutura.ts) e pela configuração (sanity.config.ts).

import type { TipoDePost } from './post';

// Documentos únicos, com `_id` igual ao nome do tipo. O site lê os dois por esse `_id`.
export const SINGLETONS = ['configuracoes', 'sobre'] as const;

// Ações que somem nos singletons. O Sanity já tira o "Duplicar"; sem o "Excluir" e o "Despublicar",
// o site nunca fica sem as configurações ou sem a página Sobre.
export const ACOES_FORA_DOS_SINGLETONS = ['delete', 'duplicate', 'unpublish'];

// Filtros das listas de posts. Os parâmetros vão em `.params()`.
export const FILTRO_POR_TIPO = '_type == "post" && tipo == $tipo';
export const FILTRO_POR_CATEGORIA = '_type == "post" && tipo == "review" && categoria._ref == $id';
export const FILTRO_POR_FORMATO = '_type == "post" && tipo == "pensamento" && formato._ref == $id';
// Todo post com mudança ainda não publicada: o que nunca foi ao ar e o que foi editado depois.
export const FILTRO_DOS_RASCUNHOS = '_type == "post" && _id in path("drafts.**")';

// Categorias e formatos que viram subpastas, na ordem do menu do site.
export const CONSULTA_DA_TAXONOMIA = '*[_type == $tipo] | order(ordem asc){ _id, nome }';

export const MODELOS = {
  review: 'nova-review',
  pensamento: 'novo-pensamento',
  reviewDaCategoria: 'review-da-categoria',
  pensamentoDoFormato: 'pensamento-do-formato',
} as const;

function referencia(id: string) {
  return { _type: 'reference', _ref: id };
}

// Valor inicial do post criado de uma lista: o tipo e, numa subpasta, a categoria ou o formato.
export function valorInicialDoPost(tipo: TipoDePost, taxonomiaId?: string) {
  if (!taxonomiaId) return { tipo };
  return tipo === 'review'
    ? { tipo, categoria: referencia(taxonomiaId) }
    : { tipo, formato: referencia(taxonomiaId) };
}
