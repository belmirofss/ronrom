// Desde a v5, a raiz do @sanity/icons não exporta os ícones: cada um vem do próprio caminho.
import { BlockquoteIcon } from '@sanity/icons/Blockquote';
import { BoldIcon } from '@sanity/icons/Bold';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';
import { ImageIcon } from '@sanity/icons/Image';
import { ItalicIcon } from '@sanity/icons/Italic';
import { LinkIcon } from '@sanity/icons/Link';
import { OlistIcon } from '@sanity/icons/Olist';
import { UlistIcon } from '@sanity/icons/Ulist';
import { defineArrayMember, defineField, getPublishedId } from 'sanity';

import { PreviewCitacao } from '../componentes/PreviewCitacao';
import { ESQUEMAS_DO_LINK_EXTERNO } from '../lib/corpo';
import { campoAlt, campoLegenda } from './campos';

const LARGURAS = [
  { value: 'normal', title: 'Normal' },
  { value: 'larga', title: 'Larga' },
];

// Texto corrido. Só o que o layout "Caderno" do site sabe mostrar (WEB-09): sem h1, porque o
// título do post já é o h1, e sem sublinhado nem código, que o editor traz ligados por padrão.
const bloco = defineArrayMember({
  type: 'block',
  styles: [
    { value: 'normal', title: 'Parágrafo' },
    { value: 'h2', title: 'Subtítulo' },
    { value: 'h3', title: 'Subtítulo menor' },
    { value: 'blockquote', title: 'Citação' },
  ],
  lists: [
    { value: 'bullet', title: 'Lista com marcadores', icon: UlistIcon },
    { value: 'number', title: 'Lista numerada', icon: OlistIcon },
  ],
  marks: {
    decorators: [
      { value: 'strong', title: 'Negrito', icon: BoldIcon },
      { value: 'em', title: 'Itálico', icon: ItalicIcon },
    ],
    annotations: [
      defineArrayMember({
        name: 'link',
        title: 'Link externo',
        type: 'object',
        icon: LinkIcon,
        fields: [
          defineField({
            name: 'href',
            title: 'Endereço',
            type: 'url',
            description: 'O link completo, como https://www.imdb.com, ou mailto:nome@email.com.',
            validation: (rule) =>
              rule
                .required()
                .uri({ scheme: ESQUEMAS_DO_LINK_EXTERNO })
                .error('Cole o link completo, começando com https://, ou um e-mail com mailto:.'),
          }),
        ],
      }),
      // Guarda a referência, não o endereço: o link continua certo se o post de destino mudar de
      // slug, categoria ou formato. O caminho é montado no build, pelo CORPO_NO_GROQ.
      defineArrayMember({
        name: 'linkInterno',
        title: 'Link para outro post',
        type: 'object',
        icon: DocumentTextIcon,
        fields: [
          defineField({
            name: 'post',
            title: 'Post',
            type: 'reference',
            description: 'O post do Ronrom para onde o link leva.',
            to: [{ type: 'post' }],
            options: {
              disableNew: true,
              filter: ({ document }) => ({
                filter: '_id != $id',
                params: { id: getPublishedId(document._id) },
              }),
            },
            validation: (rule) => rule.required().error('Escolha o post do link.'),
          }),
        ],
      }),
    ],
  },
});

const imagem = defineArrayMember({
  name: 'imagem',
  title: 'Imagem',
  type: 'image',
  icon: ImageIcon,
  options: { hotspot: true },
  fields: [
    campoAlt,
    campoLegenda,
    defineField({
      name: 'largura',
      title: 'Largura',
      type: 'string',
      description:
        'Normal acompanha o texto. Larga passa um pouco das margens, boa para paisagens.',
      options: { list: LARGURAS, layout: 'radio', direction: 'horizontal' },
      initialValue: 'normal',
      validation: (rule) => rule.required().error('Escolha a largura da imagem.'),
    }),
  ],
  // Sem a imagem, o `alt` não é cobrado (campoAlt): a regra aqui fecha esse caminho.
  validation: (rule) =>
    rule.custom((valor: { asset?: unknown } | undefined) =>
      valor?.asset ? true : 'Escolha a imagem ou apague o bloco.',
    ),
  preview: {
    select: { media: 'asset', alt: 'alt', legenda: 'legenda', largura: 'largura' },
    prepare: ({ media, alt, legenda, largura }) => ({
      title: legenda || alt || 'Imagem sem descrição',
      subtitle: `Imagem ${largura === 'larga' ? 'larga' : 'normal'}`,
      media,
    }),
  },
});

const citacaoDestaque = defineArrayMember({
  name: 'citacaoDestaque',
  title: 'Citação em destaque',
  type: 'object',
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: 'texto',
      title: 'Texto',
      type: 'text',
      rows: 3,
      description:
        'Uma frase curta, que aparece em letras grandes no meio do post. Para citar um trecho longo, use o estilo "Citação" no texto.',
      validation: (rule) => rule.required().error('Escreva a citação.'),
    }),
    defineField({
      name: 'fonte',
      title: 'Autor ou fonte',
      type: 'string',
      description: 'Opcional. Quem disse ou onde está, como "Hirayama, em Dias Perfeitos".',
    }),
  ],
  components: { preview: PreviewCitacao },
  preview: { select: { title: 'texto', subtitle: 'fonte' } },
});

// Texto do post. A barra de inserção mostra só a imagem e a citação em destaque.
export const campoCorpo = defineField({
  name: 'corpo',
  title: 'Texto',
  type: 'array',
  of: [bloco, imagem, citacaoDestaque],
});
