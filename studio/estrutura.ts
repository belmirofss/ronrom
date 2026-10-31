import type { Template } from 'sanity';
import type { StructureBuilder, StructureResolver } from 'sanity/structure';

import { API_VERSION } from './env';
import {
  CONSULTA_DA_TAXONOMIA,
  FILTRO_DOS_RASCUNHOS,
  FILTRO_POR_CATEGORIA,
  FILTRO_POR_FORMATO,
  FILTRO_POR_TIPO,
  MODELOS,
  valorInicialDoPost,
} from './lib/estrutura';
import type { TipoDePost } from './lib/post';

// Navegação do Studio do jeito que a autora pensa: Reviews e Pensamentos (com subpastas por
// categoria e formato), Rascunhos e, depois do divisor, as configurações e a taxonomia.

const MAIS_RECENTE_PRIMEIRO = [{ field: 'dataDePublicacao', direction: 'desc' as const }];

// "Nova review" e "Novo pensamento" no menu "Criar" e nas listas; nas subpastas, as versões com a
// categoria ou o formato já escolhidos. Os modelos com parâmetro ficam fora do menu "Criar".
export const modelosDePost: Template[] = [
  {
    id: MODELOS.review,
    title: 'Nova review',
    schemaType: 'post',
    value: valorInicialDoPost('review'),
  },
  {
    id: MODELOS.pensamento,
    title: 'Novo pensamento',
    schemaType: 'post',
    value: valorInicialDoPost('pensamento'),
  },
  {
    id: MODELOS.reviewDaCategoria,
    title: 'Nova review',
    schemaType: 'post',
    parameters: [{ name: 'id', type: 'string' }],
    value: ({ id }: { id: string }) => valorInicialDoPost('review', id),
  },
  {
    id: MODELOS.pensamentoDoFormato,
    title: 'Novo pensamento',
    schemaType: 'post',
    parameters: [{ name: 'id', type: 'string' }],
    value: ({ id }: { id: string }) => valorInicialDoPost('pensamento', id),
  },
];

const SECOES = {
  review: {
    titulo: 'Reviews',
    todos: 'Todas as reviews',
    taxonomia: 'categoria',
    filtro: FILTRO_POR_CATEGORIA,
    modelo: MODELOS.review,
    modeloDaSubpasta: MODELOS.reviewDaCategoria,
  },
  pensamento: {
    titulo: 'Pensamentos',
    todos: 'Todos os pensamentos',
    taxonomia: 'formato',
    filtro: FILTRO_POR_FORMATO,
    modelo: MODELOS.pensamento,
    modeloDaSubpasta: MODELOS.pensamentoDoFormato,
  },
} as const;

function listaDePosts(S: StructureBuilder, titulo: string) {
  return S.documentList()
    .title(titulo)
    .schemaType('post')
    .apiVersion(API_VERSION)
    .defaultOrdering(MAIS_RECENTE_PRIMEIRO);
}

// Reviews ou Pensamentos: "Todas" e uma subpasta por categoria (ou formato) publicada, na ordem do
// menu do site. A lista de subpastas é lida ao abrir a seção; uma categoria nova aparece depois
// de recarregar o Studio.
function secao(S: StructureBuilder, tipo: TipoDePost, buscarTaxonomia: BuscarTaxonomia) {
  const { titulo, todos, taxonomia, filtro, modelo, modeloDaSubpasta } = SECOES[tipo];

  return S.listItem()
    .id(`${tipo}s`)
    .title(titulo)
    .child(async () => {
      const subpastas = await buscarTaxonomia(taxonomia);
      return S.list()
        .title(titulo)
        .items([
          S.listItem()
            .id('todos')
            .title(todos)
            .child(
              listaDePosts(S, todos)
                .filter(FILTRO_POR_TIPO)
                .params({ tipo })
                .initialValueTemplates([S.initialValueTemplateItem(modelo)]),
            ),
          S.divider(),
          ...subpastas.map(({ _id, nome }) =>
            S.listItem()
              .id(_id)
              .title(nome)
              .child(
                listaDePosts(S, nome)
                  .filter(filtro)
                  .params({ id: _id })
                  .initialValueTemplates([
                    S.initialValueTemplateItem(modeloDaSubpasta, { id: _id }),
                  ]),
              ),
          ),
        ]);
    });
}

type BuscarTaxonomia = (tipo: 'categoria' | 'formato') => Promise<{ _id: string; nome: string }[]>;

export const estrutura: StructureResolver = (S, { getClient }) => {
  const buscarTaxonomia: BuscarTaxonomia = (tipo) =>
    getClient({ apiVersion: API_VERSION }).fetch(
      CONSULTA_DA_TAXONOMIA,
      { tipo },
      { perspective: 'published' },
    );

  return S.list()
    .title('Conteúdo')
    .items([
      secao(S, 'review', buscarTaxonomia),
      secao(S, 'pensamento', buscarTaxonomia),
      S.listItem()
        .id('rascunhos')
        .title('Rascunhos')
        .child(
          S.documentList()
            .title('Rascunhos')
            .schemaType('post')
            .apiVersion(API_VERSION)
            .filter(FILTRO_DOS_RASCUNHOS)
            .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
            .initialValueTemplates([
              S.initialValueTemplateItem(MODELOS.review),
              S.initialValueTemplateItem(MODELOS.pensamento),
            ]),
        ),
      S.divider(),
      S.listItem().singleton('configuracoes'),
      S.listItem().singleton('sobre'),
      S.divider(),
      S.documentTypeListItem('categoria').title('Categorias'),
      S.documentTypeListItem('formato').title('Formatos'),
    ]);
};
