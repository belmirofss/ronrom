import { defineType } from 'sanity';

import { campoNome, campoSlug } from './campos';

// Tag livre dos posts. A autora cria direto do campo de tags do post (campoTags).
export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fields: [
    campoNome('Como a tag aparece no post, por exemplo "Café" ou "Cinema nacional".'),
    campoSlug(
      'nome',
      'Endereço da página da tag (/tags/cafe). Clique em "Gerar" depois de escrever o nome.',
    ),
  ],
  orderings: [{ name: 'nome', title: 'Nome', by: [{ field: 'nome', direction: 'asc' }] }],
  preview: {
    select: { title: 'nome', slug: 'slug.current' },
    prepare: ({ title, slug }) => ({ title, subtitle: slug ? `/tags/${slug}` : 'Sem slug' }),
  },
});
