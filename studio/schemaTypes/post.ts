import {
  defineArrayMember,
  defineField,
  defineType,
  getPublishedId,
  type ValidationContext,
} from 'sanity';

import { InputDeNota } from '../componentes/InputDeNota';
import { API_VERSION } from '../env';
import { problemaNaNota } from '../lib/nota';
import { dataNoFuturo, subtituloDoPost, TIPOS_DE_POST } from '../lib/post';
import { campoAlt, campoLegenda, campoSlug, campoTags, TAMANHO_IDEAL_DA_DESCRICAO } from './campos';
import { campoCorpo } from './corpo';
import { campoFicha } from './ficha';

// Acima disso o Google corta o título no resultado da busca.
const TAMANHO_IDEAL_DO_TITULO = 70;
const TAMANHO_IDEAL_DO_TITULO_SEO = 60;

const ENDERECO_ANTIGO =
  'O endereço antigo fica guardado em "Slugs anteriores" (aba SEO) e continua levando para o novo.';

// Avisa, sem impedir a publicação, quando um campo que faz parte do endereço do post ficou
// diferente da versão publicada. Post nunca publicado não tem o que comparar.
function avisoSeMudouDepoisDePublicar<Valor>(
  campoNoGroq: string,
  lerValor: (valor: Valor | undefined) => string | undefined,
  mensagem: string,
) {
  return async (valor: Valor | undefined, contexto: ValidationContext) => {
    const atual = lerValor(valor);
    const id = contexto.document?._id;
    if (!atual || !id) return true;

    const publicado = await contexto
      .getClient({ apiVersion: API_VERSION })
      .fetch<string | null>(`*[_id == $id][0].${campoNoGroq}`, { id: getPublishedId(id) });
    return publicado && publicado !== atual ? mensagem : true;
  };
}

const ehReview = (tipo: unknown) => tipo === 'review';
const ehPensamento = (tipo: unknown) => tipo === 'pensamento';

// Review e pensamento são um tipo só, com campos condicionais: slug, listagens, "Mais lidos" e
// busca usam um namespace e uma consulta. A navegação do Studio separa os dois (#24). O
// identificador estável do post é o `_id`, não o slug (docs/seo-urls.md).
export const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  groups: [
    { name: 'conteudo', title: 'Conteúdo', default: true },
    { name: 'review', title: 'Review', hidden: ({ document }) => !ehReview(document?.tipo) },
    { name: 'seo', title: 'SEO' },
  ],
  fieldsets: [
    {
      name: 'avancado',
      title: 'Avançado',
      group: 'seo',
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: 'tipo',
      title: 'Tipo',
      type: 'string',
      group: 'conteudo',
      description:
        'Review avalia um filme, livro, lugar ou comida. Pensamento é um texto livre. O tipo faz parte do endereço do post e não muda depois de escolhido: se errar num post novo, apague o rascunho e comece outro.',
      options: { list: [...TIPOS_DE_POST], layout: 'radio', direction: 'horizontal' },
      readOnly: ({ value }) => Boolean(value),
      validation: (rule) =>
        rule.required().error('Escolha se o post é uma review ou um pensamento.'),
    }),
    defineField({
      name: 'categoria',
      title: 'Categoria',
      type: 'reference',
      group: ['conteudo', 'review'],
      description: 'Onde a review aparece no menu do site. Faz parte do endereço do post.',
      to: [{ type: 'categoria' }],
      options: { disableNew: true },
      hidden: ({ document }) => !ehReview(document?.tipo),
      validation: (rule) => [
        rule.custom((valor, contexto) =>
          ehReview(contexto.document?.tipo) && !valor ? 'Escolha a categoria da review.' : true,
        ),
        rule
          .custom(
            avisoSeMudouDepoisDePublicar<{ _ref?: string }>(
              'categoria._ref',
              (valor) => valor?._ref,
              `Este post já foi publicado em outra categoria, e trocar a categoria muda o endereço dele. ${ENDERECO_ANTIGO}`,
            ),
          )
          .warning(),
      ],
    }),
    defineField({
      name: 'formato',
      title: 'Formato',
      type: 'reference',
      group: 'conteudo',
      description: 'Onde o pensamento aparece no menu do site. Faz parte do endereço do post.',
      to: [{ type: 'formato' }],
      options: { disableNew: true },
      hidden: ({ document }) => !ehPensamento(document?.tipo),
      validation: (rule) => [
        rule.custom((valor, contexto) =>
          ehPensamento(contexto.document?.tipo) && !valor
            ? 'Escolha o formato do pensamento.'
            : true,
        ),
        rule
          .custom(
            avisoSeMudouDepoisDePublicar<{ _ref?: string }>(
              'formato._ref',
              (valor) => valor?._ref,
              `Este post já foi publicado em outro formato, e trocar o formato muda o endereço dele. ${ENDERECO_ANTIGO}`,
            ),
          )
          .warning(),
      ],
    }),
    // Fica nas duas abas, como a categoria, para a autora não esquecer a nota.
    defineField({
      name: 'nota',
      title: 'Nota',
      type: 'number',
      group: ['conteudo', 'review'],
      description:
        'De meio a 5 corações. Clique num coração para dar a nota inteira, ou na metade esquerda dele para dar meio a menos.',
      components: { input: InputDeNota },
      // Só aparece em pensamento se uma nota sobrou ali (vinda da API, por exemplo), para a
      // autora conseguir limpar o erro.
      hidden: ({ document, value }) => !ehReview(document?.tipo) && value === undefined,
      validation: (rule) =>
        rule.custom(
          (valor: number | undefined, contexto) =>
            problemaNaNota(contexto.document?.tipo, valor) ?? true,
        ),
    }),
    { ...campoFicha, group: 'review' },
    defineField({
      name: 'titulo',
      title: 'Título',
      type: 'string',
      group: 'conteudo',
      description: 'Aparece no topo do post, nas listas e no Google.',
      validation: (rule) => [
        rule.required().error('Escreva o título.'),
        rule
          .max(TAMANHO_IDEAL_DO_TITULO)
          .warning(
            `Acima de ${TAMANHO_IDEAL_DO_TITULO} caracteres, o Google corta o fim do título. Se quiser manter assim, preencha um título mais curto na aba SEO.`,
          ),
      ],
    }),
    defineField({
      name: 'subtitulo',
      title: 'Subtítulo',
      type: 'string',
      group: 'conteudo',
      description: 'Opcional. Uma frase que completa o título, logo abaixo dele.',
    }),
    {
      ...campoSlug(
        'titulo',
        'O final do endereço do post (/reviews/filmes/dias-perfeitos). Clique em "Gerar" depois de escrever o título. Não pode repetir o de outro post.',
        (rule) =>
          rule
            .custom(
              avisoSeMudouDepoisDePublicar<{ current?: string }>(
                'slug.current',
                (valor) => valor?.current,
                `Este post já foi publicado com outro slug, e mudar o slug muda o endereço dele. ${ENDERECO_ANTIGO}`,
              ),
            )
            .warning(),
      ),
      group: 'conteudo',
    },
    defineField({
      name: 'dataDePublicacao',
      title: 'Data de publicação',
      type: 'datetime',
      group: 'conteudo',
      description:
        'Aparece no post e define a ordem nas listas. Começa com o momento em que o post foi criado: ajuste para o dia em que publicar. Não dá para escolher uma data no futuro; enquanto o texto não estiver pronto, deixe como rascunho.',
      options: { dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
      initialValue: () => new Date().toISOString(),
      validation: (rule) => [
        rule.required().error('Escolha a data de publicação.'),
        rule.custom((valor: string | undefined) =>
          valor && dataNoFuturo(valor)
            ? 'A data não pode estar no futuro: o site não agenda posts. Deixe como rascunho e publique no dia.'
            : true,
        ),
      ],
    }),
    defineField({
      name: 'capa',
      title: 'Capa',
      type: 'image',
      group: 'conteudo',
      description:
        'Aparece no topo do post, nos cards e quando o link é compartilhado. Depois de enviar, clique no lápis e marque a parte mais importante da imagem: os recortes do site mantêm essa parte à vista.',
      options: { hotspot: true },
      fields: [campoAlt, campoLegenda],
      // Só o texto alternativo, sem a imagem, já conta como preenchido para o `required`.
      validation: (rule) =>
        rule
          .required()
          .custom((valor) => (valor?.asset ? true : 'Escolha a imagem de capa.'))
          .error('Escolha a imagem de capa.'),
    }),
    { ...campoCorpo, group: 'conteudo' },
    { ...campoTags, group: 'conteudo' },
    defineField({
      name: 'destaque',
      title: 'Destaque na home',
      type: 'boolean',
      group: 'conteudo',
      description:
        'Ligue para mostrar este post em destaque na página inicial. Sem nenhum ligado, o destaque é o post mais recente.',
      initialValue: false,
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      group: 'seo',
      description:
        'Como o post aparece no Google e quando o link é compartilhado. Tudo aqui é opcional: o que ficar vazio usa o título, o subtítulo e a capa do post.',
      fields: [
        defineField({
          name: 'titulo',
          title: 'Título para o Google',
          type: 'string',
          description: 'Use quando o título do post for longo demais para o Google.',
          validation: (rule) =>
            rule
              .max(TAMANHO_IDEAL_DO_TITULO_SEO)
              .warning(
                `Acima de ${TAMANHO_IDEAL_DO_TITULO_SEO} caracteres, o Google corta o fim do título.`,
              ),
        }),
        defineField({
          name: 'descricao',
          title: 'Descrição',
          type: 'text',
          rows: 3,
          description:
            'Uma ou duas frases que aparecem embaixo do título no Google e ao compartilhar. Se ficar vazia, usamos o subtítulo ou o começo do texto.',
          validation: (rule) =>
            rule
              .max(TAMANHO_IDEAL_DA_DESCRICAO)
              .warning(
                `Acima de ${TAMANHO_IDEAL_DA_DESCRICAO} caracteres, o Google corta o fim da descrição.`,
              ),
        }),
        defineField({
          name: 'imagem',
          title: 'Imagem de compartilhamento',
          type: 'image',
          description:
            'Aparece quando o link é compartilhado no WhatsApp, Instagram e outras redes. Se ficar vazia, usamos a capa.',
          options: { hotspot: true },
          fields: [campoAlt],
        }),
        defineField({
          name: 'noindex',
          title: 'Esconder do Google',
          type: 'boolean',
          description:
            'Ligue só se este post não deve aparecer na busca do Google. No site, ele continua normal.',
          initialValue: false,
        }),
      ],
    }),
    // Preenchido pela ação de publicar (acoes/publicarPost.ts) com o caminho completo antigo,
    // para os redirects da #53 cobrirem também a troca de categoria ou formato.
    defineField({
      name: 'slugsAnteriores',
      title: 'Slugs anteriores',
      type: 'array',
      group: 'seo',
      fieldset: 'avancado',
      description:
        'Endereços que este post já teve. São guardados sozinhos quando você publica uma mudança no slug, na categoria ou no formato, e cada um leva para o endereço atual. Não precisa mexer aqui.',
      of: [defineArrayMember({ type: 'string' })],
      readOnly: true,
    }),
  ],
  orderings: [
    {
      name: 'dataDePublicacao',
      title: 'Data de publicação',
      by: [{ field: 'dataDePublicacao', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      titulo: 'titulo',
      tipo: 'tipo',
      categoria: 'categoria.nome',
      formato: 'formato.nome',
      nota: 'nota',
      capa: 'capa',
    },
    prepare: ({ titulo, tipo, categoria, formato, nota, capa }) => ({
      title: titulo || 'Sem título',
      subtitle: subtituloDoPost({ tipo, categoria, formato, nota }),
      media: capa,
    }),
  },
});
