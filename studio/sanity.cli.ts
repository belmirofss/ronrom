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
  // `pnpm typegen` (na raiz): extrai o schema para o schema.json (fora do Git) e gera os tipos das
  // consultas do site. Com `enforceRequiredFields`, campo com `required()` não vem opcional no tipo,
  // o que vale para as consultas do site: só leem documento publicado, que passou pela validação.
  // Veja web/src/lib/sanity/README.md.
  schemaExtraction: {
    path: 'schema.json',
    enforceRequiredFields: true,
  },
  typegen: {
    path: '../web/src/lib/sanity/consultas.ts',
    schema: 'schema.json',
    // .d.ts: o arquivo registra os tipos no @sanity/client, que o site ainda não instala (#33). Num
    // .d.ts, a falta do pacote não vira erro de tipo.
    generates: '../web/src/lib/sanity/tipos.gerados.d.ts',
  },
});
