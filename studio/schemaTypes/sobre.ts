import { defineArrayMember, defineField, defineType } from 'sanity';

import { campoAlt, campoDescricaoSeo, campoImagemDeCompartilhamento } from './campos';
import { anotacaoLink } from './corpo';

// A bio aparece inteira na barra lateral, sem "leia mais": acima disso ela empurra a navegação.
const TAMANHO_MAXIMO_DA_BIO = 200;

// Singleton (`_id` "sobre"): a autora, na barra lateral da home e na página /sobre. Fora do menu
// "Criar" e sem "Excluir" (sanity.config.ts).
export const sobre = defineType({
  name: 'sobre',
  title: 'Sobre mim',
  type: 'document',
  groups: [
    { name: 'conteudo', title: 'Conteúdo', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'nome',
      title: 'Nome',
      type: 'string',
      group: 'conteudo',
      description: 'Como você assina o blog. Aparece em "Oi, eu sou a…" e como autora dos posts.',
      validation: (rule) => rule.required().error('Preencha o nome.'),
    }),
    // O contato da controladora na /privacidade (#59): a LGPD pede um canal para os pedidos do titular.
    defineField({
      name: 'email',
      title: 'E-mail de contato',
      type: 'email',
      group: 'conteudo',
      description:
        'Aparece na página de privacidade, para quem quiser tirar dúvidas ou pedir algo sobre os próprios dados.',
      validation: (rule) => rule.required().error('Preencha o e-mail de contato.'),
    }),
    defineField({
      name: 'foto',
      title: 'Foto',
      type: 'image',
      group: 'conteudo',
      description:
        'Aparece na página Sobre. Depois de enviar, clique no lápis e marque o seu rosto: os recortes do site mantêm essa parte à vista.',
      options: { hotspot: true },
      fields: [campoAlt],
      // Só o texto alternativo, sem a imagem, já conta como preenchido para o `required`.
      validation: (rule) =>
        rule
          .required()
          .custom((valor) => (valor?.asset ? true : 'Escolha a foto.'))
          .error('Escolha a foto.'),
    }),
    defineField({
      name: 'bio',
      title: 'Bio curta',
      type: 'text',
      rows: 3,
      group: 'conteudo',
      description: `Duas ou três frases sobre você, para o bloco "sobre mim" da barra lateral. Até ${TAMANHO_MAXIMO_DA_BIO} caracteres.`,
      validation: (rule) => [
        rule.required().error('Escreva a bio curta.'),
        rule
          .max(TAMANHO_MAXIMO_DA_BIO)
          .error(`A bio curta precisa ter até ${TAMANHO_MAXIMO_DA_BIO} caracteres.`),
      ],
    }),
    // Texto simples, um pedaço do corpo do post (schemaTypes/corpo.ts): parágrafos, subtítulos, lista,
    // negrito, itálico e link externo, para o /sobre reaproveitar o CorpoDoPost (#47).
    defineField({
      name: 'texto',
      title: 'Texto da página Sobre',
      type: 'array',
      group: 'conteudo',
      description: 'O texto completo da página /sobre.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Parágrafo', value: 'normal' },
            { title: 'Subtítulo', value: 'h2' },
          ],
          lists: [{ title: 'Lista', value: 'bullet' }],
          marks: {
            decorators: [
              { title: 'Negrito', value: 'strong' },
              { title: 'Itálico', value: 'em' },
            ],
            annotations: [anotacaoLink],
          },
        }),
      ],
      validation: (rule) => rule.required().error('Escreva o texto da página Sobre.'),
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      group: 'seo',
      description:
        'Como a página /sobre aparece no Google e quando o link é compartilhado. O que ficar vazio usa a bio curta e a foto.',
      fields: [
        campoDescricaoSeo(
          'Uma ou duas frases que aparecem embaixo do título no Google e ao compartilhar.',
        ),
        campoImagemDeCompartilhamento(
          'Aparece quando o link da página Sobre é compartilhado. Se ficar vazia, usamos a foto.',
        ),
      ],
    }),
  ],
  preview: {
    select: { title: 'nome', media: 'foto' },
    prepare: ({ title, media }) => ({ title: title || 'Sobre mim', media }),
  },
});
