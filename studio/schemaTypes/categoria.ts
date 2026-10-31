import { defineField, defineType } from 'sanity';

import { MODELOS_DE_FICHA } from '../lib/taxonomia';
import { campoDescricao, campoNome, campoOrdem, campoSlug, ordenacaoPorOrdem } from './campos';

// Categoria das reviews (Filmes, Séries...). As seis fixas vêm do script
// scripts/criar-taxonomia.ts, com `_id` fixo.
export const categoria = defineType({
  name: 'categoria',
  title: 'Categoria',
  type: 'document',
  fields: [
    campoNome('Como aparece no menu e no topo da página da categoria. Pode mudar à vontade.'),
    campoSlug(
      'nome',
      'Parte do endereço das reviews desta categoria (/reviews/filmes/...). Não mude depois de publicar: todos os links das reviews dela mudam junto.',
    ),
    campoDescricao('categoria'),
    campoOrdem('categoria'),
    defineField({
      name: 'modeloFicha',
      title: 'Modelo de ficha',
      type: 'string',
      description:
        'Quais dados técnicos as reviews desta categoria mostram (direção e ano para filme, endereço para lugar...).',
      options: { list: [...MODELOS_DE_FICHA], layout: 'radio' },
      validation: (rule) => rule.required().error('Escolha o modelo de ficha.'),
    }),
  ],
  orderings: [ordenacaoPorOrdem],
  preview: {
    select: { title: 'nome', slug: 'slug.current' },
    prepare: ({ title, slug }) => ({ title, subtitle: slug ? `/reviews/${slug}` : 'Sem slug' }),
  },
});
