import { ptBRLocale } from '@sanity/locale-pt-br';
import { visionTool } from '@sanity/vision';
import { defineConfig, isDev } from 'sanity';
import { defineLocations, presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';

import { publicarPost } from './acoes/publicarPost';
import { dataset, projectId, URL_DA_PREVIA } from './env';
import { estrutura, modelosDePost } from './estrutura';
import { ACOES_FORA_DOS_SINGLETONS, SINGLETONS } from './lib/estrutura';
import {
  ATIVAR_A_PREVIA,
  CAMPOS_DO_LOCAL_DO_POST,
  DESATIVAR_A_PREVIA,
  DOCUMENTOS_DAS_ROTAS,
  LOCAIS_DOS_SINGLETONS,
  locaisDoPost,
} from './lib/previa';
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
    // Prévia de rascunhos (#43): o site no layout "Caderno", com o rascunho atual, ao lado do
    // editor; clicar num texto da prévia abre o campo dele. A prévia é outro projeto da Vercel
    // (docs/adr/0006), e a rota de ativação confere o segredo que o Presentation gera.
    presentationTool({
      title: 'Apresentação',
      previewUrl: {
        origin: URL_DA_PREVIA,
        preview: '/',
        previewMode: { enable: ATIVAR_A_PREVIA, disable: DESATIVAR_A_PREVIA },
      },
      resolve: {
        mainDocuments: DOCUMENTOS_DAS_ROTAS,
        locations: {
          post: defineLocations({ select: CAMPOS_DO_LOCAL_DO_POST, resolve: locaisDoPost }),
          configuracoes: LOCAIS_DOS_SINGLETONS.configuracoes,
          sobre: LOCAIS_DOS_SINGLETONS.sobre,
        },
      },
    }),
    ptBRLocale(),
    // O Vision (playground de GROQ) só serve para quem programa: fica fora do Studio publicado.
    ...(isDev ? [visionTool()] : []),
  ],

  schema: {
    types: schemaTypes,
    // O modelo padrão do post (sem tipo) sai do menu "Criar": no lugar dele, "Nova review" e
    // "Novo pensamento". A tag também sai: o site não mostra mais tags (#145).
    templates: (anteriores) => [
      ...anteriores.filter((modelo) => modelo.id !== 'post' && modelo.id !== 'tag'),
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
