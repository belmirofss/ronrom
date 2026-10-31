// Desde a v5, a raiz do @sanity/icons não exporta os ícones: cada um vem do próprio caminho.
import { BlockquoteIcon } from '@sanity/icons/Blockquote';
import { BoldIcon } from '@sanity/icons/Bold';
import { DocumentTextIcon } from '@sanity/icons/DocumentText';
import { ImageIcon } from '@sanity/icons/Image';
import { ImagesIcon } from '@sanity/icons/Images';
import { ItalicIcon } from '@sanity/icons/Italic';
import { LinkIcon } from '@sanity/icons/Link';
import { OlistIcon } from '@sanity/icons/Olist';
import { PlayIcon } from '@sanity/icons/Play';
import { UlistIcon } from '@sanity/icons/Ulist';
import { defineArrayMember, defineField, getPublishedId } from 'sanity';

import { PreviewCitacao } from '../componentes/PreviewCitacao';
import { type ImagemDaPrevia, PreviewGaleria } from '../componentes/PreviewGaleria';
import { PreviewVideo } from '../componentes/PreviewVideo';
import { VideoInput } from '../componentes/VideoInput';
import { ESQUEMAS_DO_LINK_EXTERNO } from '../lib/corpo';
import {
  MAXIMO_DE_IMAGENS,
  MINIMO_DE_IMAGENS,
  problemaNaQuantidadeDeImagens,
} from '../lib/galeria';
import { MENSAGEM_DO_LINK_DO_VIDEO, videoDesatualizado, videoDoLink } from '../lib/video';
import { campoAlt, campoLegenda } from './campos';

const LARGURAS = [
  { value: 'normal', title: 'Normal' },
  { value: 'larga', title: 'Larga' },
];

// Link externo. Também usado no texto da página Sobre (schemaTypes/sobre.ts).
export const anotacaoLink = defineArrayMember({
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
});

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
      anotacaoLink,
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

// A prévia lê as imagens uma a uma, porque o `select` só segue a referência do asset (para pegar o
// `url`) com o índice no caminho. Também conta as imagens pelo `_key` de cada posição: selecionar
// `imagens` junto com `imagens.0.asset.url` faz o Sanity entregar um objeto no lugar do array. A
// posição seguinte ao máximo só serve para saber se ele foi passado.
const SELECAO_DAS_IMAGENS = Object.fromEntries(
  Array.from({ length: MAXIMO_DE_IMAGENS + 1 }, (_, indice) => [
    [`chave${indice}`, `imagens.${indice}._key`],
    ...(indice < MAXIMO_DE_IMAGENS
      ? [
          [`url${indice}`, `imagens.${indice}.asset.url`],
          [`alt${indice}`, `imagens.${indice}.alt`],
        ]
      : []),
  ]).flat(),
);

const galeria = defineArrayMember({
  name: 'galeria',
  title: 'Galeria',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'imagens',
      title: 'Imagens',
      type: 'array',
      description: `De ${MINIMO_DE_IMAGENS} a ${MAXIMO_DE_IMAGENS} fotos, que aparecem juntas no site. Arraste para mudar a ordem; clique numa foto para escrever o texto alternativo e a legenda.`,
      options: { layout: 'grid' },
      of: [
        defineArrayMember({
          type: 'image',
          title: 'Imagem',
          options: { hotspot: true },
          fields: [campoAlt, campoLegenda],
          // Sem a imagem, o `alt` não é cobrado (campoAlt): a regra aqui fecha esse caminho.
          validation: (rule) =>
            rule.custom((valor: { asset?: unknown } | undefined) =>
              valor?.asset ? true : 'Escolha a imagem ou tire-a da galeria.',
            ),
        }),
      ],
      validation: (rule) =>
        rule.custom(
          (imagens: unknown[] | undefined) =>
            problemaNaQuantidadeDeImagens(imagens?.length ?? 0) ?? true,
        ),
    }),
  ],
  components: { preview: PreviewGaleria },
  preview: {
    select: SELECAO_DAS_IMAGENS,
    prepare: (selecao: Record<string, unknown>) => {
      let quantidade = 0;
      while (quantidade <= MAXIMO_DE_IMAGENS && selecao[`chave${quantidade}`]) quantidade++;

      const imagens: ImagemDaPrevia[] = Array.from(
        { length: Math.min(quantidade, MAXIMO_DE_IMAGENS) },
        (_, indice) => ({
          url: selecao[`url${indice}`] as string | undefined,
          alt: selecao[`alt${indice}`] as string | undefined,
        }),
      );
      const total =
        quantidade > MAXIMO_DE_IMAGENS
          ? `mais de ${MAXIMO_DE_IMAGENS} imagens`
          : `${quantidade} ${quantidade === 1 ? 'imagem' : 'imagens'}`;
      return { title: `Galeria · ${total}`, imagens };
    },
  },
});

// Vídeo do YouTube ou post do Instagram no meio do texto. O `provedor` e o `idVideo` ficam
// escondidos e são gravados pelo VideoInput a partir do link, para consultas e prévias. O player do
// site tira os dois do próprio link, com o mesmo `videoDoLink` (lib/video.ts).
const video = defineArrayMember({
  name: 'video',
  title: 'Vídeo',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Link do vídeo',
      type: 'url',
      description:
        'Copie o link no YouTube (vídeo ou Shorts) ou no Instagram (post ou reel), como https://youtu.be/… ou https://www.instagram.com/reel/….',
      validation: (rule) =>
        rule.custom((url: string | undefined) =>
          videoDoLink(url) ? true : MENSAGEM_DO_LINK_DO_VIDEO,
        ),
    }),
    defineField({
      name: 'legenda',
      title: 'Legenda',
      type: 'string',
      description: 'Opcional. Aparece embaixo do vídeo.',
    }),
    defineField({
      name: 'provedor',
      title: 'Provedor',
      type: 'string',
      hidden: true,
      options: {
        list: [
          { value: 'youtube', title: 'YouTube' },
          { value: 'instagram', title: 'Instagram' },
        ],
      },
    }),
    defineField({ name: 'idVideo', title: 'ID do vídeo', type: 'string', hidden: true }),
  ],
  // Com o link válido, provedor e ID têm de acompanhar: só não acompanham se o documento foi
  // mudado fora do Studio, sem passar pelo VideoInput.
  validation: (rule) =>
    rule.custom((valor: { url?: string; provedor?: string; idVideo?: string } | undefined) =>
      valor && videoDoLink(valor.url) && videoDesatualizado(valor)
        ? 'Os dados do vídeo não acompanham o link. Apague o link e cole de novo.'
        : true,
    ),
  components: { input: VideoInput, preview: PreviewVideo },
  preview: {
    select: { url: 'url', legenda: 'legenda' },
    prepare: ({ url, legenda }: { url?: string; legenda?: string }) => ({
      title: legenda || 'Vídeo',
      url,
      legenda,
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

// Texto do post. A barra de inserção mostra só a imagem, a galeria, o vídeo e a citação em destaque.
export const campoCorpo = defineField({
  name: 'corpo',
  title: 'Texto',
  type: 'array',
  of: [bloco, imagem, galeria, video, citacaoDestaque],
});
