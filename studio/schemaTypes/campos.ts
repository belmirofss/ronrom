import { defineArrayMember, defineField, type SlugRule, type SlugValue } from 'sanity';

import { problemaNoSlug, slugify, TAMANHO_MAXIMO_DO_SLUG } from '../lib/slug';

// Campos repetidos entre os schemas. O post reaproveita o slug, as tags, o texto alternativo e a
// legenda.

// Slug gerado a partir de outro campo (o nome ou o título). A unicidade fica com a checagem
// padrão do Sanity, que compara só com documentos do mesmo tipo: uma tag pode ter o mesmo
// slug de uma categoria, porque as URLs não se cruzam (/tags/cafe e /reviews/cafe).
// `aviso` acrescenta uma regra de nível warning, como a do post publicado.
export function campoSlug(
  source: string,
  description: string,
  aviso?: (rule: SlugRule) => SlugRule,
) {
  return defineField({
    name: 'slug',
    title: 'Slug',
    type: 'slug',
    description,
    options: {
      source,
      maxLength: TAMANHO_MAXIMO_DO_SLUG,
      slugify: (texto: string) => slugify(texto),
    },
    validation: (rule) => [
      rule.required().custom((valor: SlugValue | undefined) => {
        if (!valor?.current) {
          return 'Preencha o slug. Clique em "Gerar" para criar automaticamente.';
        }
        return problemaNoSlug(valor.current) ?? true;
      }),
      ...(aviso ? [aviso(rule)] : []),
    ],
  });
}

// Nome exibido no site. Obrigatório em categoria, formato e tag.
export function campoNome(description: string) {
  return defineField({
    name: 'nome',
    title: 'Nome',
    type: 'string',
    description,
    validation: (rule) => rule.required().error('Preencha o nome.'),
  });
}

// Acima disso o Google corta a description no resultado da busca.
export const TAMANHO_IDEAL_DA_DESCRICAO = 160;

type Taxonomia = 'categoria' | 'formato';

// "Categoria" é feminino e "formato", masculino.
const NESTE: Record<Taxonomia, string> = { categoria: 'nesta categoria', formato: 'neste formato' };
const DESTE: Record<Taxonomia, string> = { categoria: 'desta categoria', formato: 'deste formato' };

// Description da página de listagem (/reviews/filmes, /pensamentos/frases).
export function campoDescricao(tipo: Taxonomia) {
  return defineField({
    name: 'descricao',
    title: 'Descrição',
    type: 'text',
    rows: 3,
    description: `Uma ou duas frases sobre o que entra ${NESTE[tipo]}. Aparecem no topo da página da listagem e no resultado do Google.`,
    validation: (rule) => [
      rule.required().warning('Sem descrição, o Google escolhe sozinho um trecho da página.'),
      rule
        .max(TAMANHO_IDEAL_DA_DESCRICAO)
        .warning(
          `Acima de ${TAMANHO_IDEAL_DA_DESCRICAO} caracteres, o Google corta o fim da descrição.`,
        ),
    ],
  });
}

// Posição no menu e nas listas: 1 aparece primeiro.
export function campoOrdem(tipo: Taxonomia) {
  return defineField({
    name: 'ordem',
    title: 'Ordem',
    type: 'number',
    description: `Posição ${DESTE[tipo]} no menu do site: 1 aparece primeiro.`,
    validation: (rule) =>
      rule.required().integer().min(1).error('Use um número inteiro a partir de 1.'),
  });
}

export const ordenacaoPorOrdem = {
  name: 'ordem',
  title: 'Ordem no menu',
  by: [{ field: 'ordem', direction: 'asc' as const }],
};

// Tags do post. O botão "Criar novo" da referência abre o formulário da tag ali mesmo,
// sem sair do post.
export const campoTags = defineField({
  name: 'tags',
  title: 'Tags',
  type: 'array',
  description: 'Escolha tags que já existem ou crie uma nova pelo botão "Criar novo".',
  of: [defineArrayMember({ type: 'reference', to: [{ type: 'tag' }] })],
  validation: (rule) => rule.unique().error('Esta tag já está no post.'),
});

// Texto alternativo de uma imagem, obrigatório só quando há imagem escolhida: assim serve para a
// capa (que já exige a imagem) e para a imagem de compartilhamento (opcional).
export const campoAlt = defineField({
  name: 'alt',
  title: 'Texto alternativo',
  type: 'string',
  description:
    'Descreva a imagem para quem não consegue vê-la, como quem usa leitor de tela. Por exemplo: "Xícara de café sobre uma mesa de madeira".',
  validation: (rule) =>
    rule.custom((alt: string | undefined, contexto) => {
      const imagem = contexto.parent as { asset?: unknown } | undefined;
      if (imagem?.asset && !alt?.trim()) return 'Descreva a imagem no texto alternativo.';
      return true;
    }),
});

// Description de uma página no Google e ao compartilhar (aba SEO do post, Sobre e configurações).
// `obrigatoria` avisa, sem impedir a publicação, quando fica vazia.
export function campoDescricaoSeo(description: string, obrigatoria = false) {
  return defineField({
    name: 'descricao',
    title: 'Descrição',
    type: 'text',
    rows: 3,
    description,
    validation: (rule) => [
      ...(obrigatoria
        ? [rule.required().warning('Sem descrição, o Google escolhe sozinho um trecho da página.')]
        : []),
      rule
        .max(TAMANHO_IDEAL_DA_DESCRICAO)
        .warning(
          `Acima de ${TAMANHO_IDEAL_DA_DESCRICAO} caracteres, o Google corta o fim da descrição.`,
        ),
    ],
  });
}

// Imagem do link compartilhado no WhatsApp, Instagram e outras redes.
export function campoImagemDeCompartilhamento(description: string) {
  return defineField({
    name: 'imagem',
    title: 'Imagem de compartilhamento',
    type: 'image',
    description,
    options: { hotspot: true },
    fields: [campoAlt],
  });
}

// Legenda opcional de uma imagem, na capa e no texto do post.
export const campoLegenda = defineField({
  name: 'legenda',
  title: 'Legenda ou crédito',
  type: 'string',
  description: 'Opcional. Por exemplo: "Foto: divulgação".',
});
