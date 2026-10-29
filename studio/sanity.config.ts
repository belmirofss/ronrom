import { ptBRLocale } from '@sanity/locale-pt-br';
import { visionTool } from '@sanity/vision';
import { defineConfig, isDev } from 'sanity';
import { structureTool } from 'sanity/structure';

import { publicarPost } from './acoes/publicarPost';
import { dataset, projectId } from './env';
import { IconeRonrom } from './marca/IconeRonrom';
import { temaRonrom } from './marca/tema';
import { schemaTypes } from './schemaTypes';

export default defineConfig({
  name: 'default',
  title: 'Ronrom',
  icon: IconeRonrom,
  theme: temaRonrom,

  projectId,
  dataset,

  plugins: [
    structureTool(),
    ptBRLocale(),
    // O Vision (playground de GROQ) só serve para quem programa: fica fora do Studio publicado.
    ...(isDev ? [visionTool()] : []),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (anteriores, { schemaType }) =>
      schemaType === 'post'
        ? anteriores.map((acao) => (acao.action === 'publish' ? publicarPost(acao) : acao))
        : anteriores,
  },
});
