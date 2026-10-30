import { ptBRLocale } from '@sanity/locale-pt-br';
import { visionTool } from '@sanity/vision';
import { defineConfig, isDev } from 'sanity';
import { structureTool } from 'sanity/structure';

import { publicarPost } from './acoes/publicarPost';
import { dataset, projectId } from './env';
import { estrutura, modelosDePost } from './estrutura';
import { ACOES_FORA_DOS_SINGLETONS, SINGLETONS } from './lib/estrutura';
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
    // Sem o `keepPanesOnCreate`, o post criado numa subpasta (Reviews › Livros) abre sozinho na
    // tela e a autora perde as pastas da esquerda.
    structureTool({ structure: estrutura, keepPanesOnCreate: true }),
    ptBRLocale(),
    // O Vision (playground de GROQ) só serve para quem programa: fica fora do Studio publicado.
    ...(isDev ? [visionTool()] : []),
  ],

  schema: {
    types: schemaTypes,
    // O modelo padrão do post (sem tipo) sai do menu "Criar": no lugar dele, "Nova review" e
    // "Novo pensamento".
    templates: (anteriores) => [
      ...anteriores.filter((modelo) => modelo.id !== 'post'),
      ...modelosDePost,
    ],
  },

  document: {
    // Com `_id` fixo, fora do menu "Criar" e sem "Duplicar" (o Sanity cuida disso).
    singletons: [...SINGLETONS],
    actions: (anteriores, { schemaType, singleton }) => {
      if (singleton) {
        return anteriores.filter(
          (acao) => !acao.action || !ACOES_FORA_DOS_SINGLETONS.includes(acao.action),
        );
      }
      return schemaType === 'post'
        ? anteriores.map((acao) => (acao.action === 'publish' ? publicarPost(acao) : acao))
        : anteriores;
    },
  },
});
