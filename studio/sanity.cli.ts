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
    // O hostname (ronrom.sanity.studio) vai no `--url` do script `deploy` do package.json:
    // o primeiro deploy registra o endereço e os seguintes o reaproveitam, sem pergunta.
    // autoUpdates desligado para o Studio publicado rodar a mesma versão do pnpm-lock.yaml, que passou
    // pelo CI. Atualizar o Sanity é um PR comum de dependência.
    autoUpdates: false,
  },
});
