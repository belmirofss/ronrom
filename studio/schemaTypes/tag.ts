import { defineType } from 'sanity';

import { campoNome, campoSlug } from './campos';

// Tag livre dos posts. O site não mostra mais tags (#145): o tipo continua registrado para os
// documentos que já existem seguirem válidos, mas sai da estrutura e do menu "Criar"
// (sanity.config.ts), e o campo de tags do post fica escondido (campoTags).
export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fields: [
    campoNome('Como a tag aparece no post, por exemplo "Café" ou "Cinema nacional".'),
    campoSlug('nome', 'Clique em "Gerar" depois de escrever o nome.'),
  ],
  orderings: [{ name: 'nome', title: 'Nome', by: [{ field: 'nome', direction: 'asc' }] }],
  preview: {
    select: { title: 'nome', slug: 'slug.current' },
    prepare: ({ title, slug }) => ({ title, subtitle: slug ?? 'Sem slug' }),
  },
});
