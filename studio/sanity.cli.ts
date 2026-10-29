import { defineCliConfig } from 'sanity/cli';

// Sem a validação de env.ts: comandos como `sanity login` precisam rodar antes do .env existir.
// Os que dependem do projeto (dev, build, deploy) acusam a falta por conta própria.
const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET;

export default defineCliConfig({
  api: {
    ...(projectId && { projectId }),
    ...(dataset && { dataset }),
  },
  deployment: {
    // O primeiro `sanity deploy` pergunta o hostname (ronrom → ronrom.sanity.studio) e mostra o
    // appId do Studio publicado; ele entra aqui como `appId` para os deploys seguintes e o CI.
    // Desligado para o Studio publicado rodar a mesma versão do pnpm-lock.yaml, que passou
    // pelo CI. Atualizar o Sanity é um PR comum de dependência.
    autoUpdates: false,
  },
});
