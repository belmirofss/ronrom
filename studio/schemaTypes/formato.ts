import { defineType } from 'sanity';

import { campoDescricao, campoNome, campoOrdem, campoSlug, ordenacaoPorOrdem } from './campos';

// Formato dos pensamentos (Artigos, Frases soltas...). Os quatro iniciais vêm do script
// scripts/criar-taxonomia.ts, com `_id` fixo.
export const formato = defineType({
  name: 'formato',
  title: 'Formato',
  type: 'document',
  fields: [
    campoNome('Como aparece no menu e no topo da página do formato. Pode mudar à vontade.'),
    campoSlug(
      'nome',
      'Parte do endereço dos pensamentos deste formato (/pensamentos/frases/...). Não mude depois de publicar: todos os links dos pensamentos dele mudam junto.',
    ),
    campoDescricao('formato'),
    campoOrdem('formato'),
  ],
  orderings: [ordenacaoPorOrdem],
  preview: {
    select: { title: 'nome', slug: 'slug.current' },
    prepare: ({ title, slug }) => ({ title, subtitle: slug ? `/pensamentos/${slug}` : 'Sem slug' }),
  },
});
