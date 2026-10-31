import { createClient } from '@sanity/client';
import type { Plugin } from 'vite';

import { CONSULTA_DOS_IDS_PUBLICADOS } from './consultas';
import { consultarFixtures } from './fixtures';
import type { CONSULTA_DOS_IDS_PUBLICADOS_RESULT } from './tipos.gerados';

// Os `_id` dos posts publicados, que a /api/views (#56) aceita, embutidos na função no build: o
// módulo virtual `virtual:ronrom/ids-publicados` vira um Set fixo no bundle, e a rota não consulta
// o Sanity a cada visualização. Um post novo só conta depois do rebuild que o publica (o deploy
// hook, docs/deploy.md).
//
// O plugin roda dentro do astro.config, antes do astro:env: por isso lê as variáveis cruas (o mesmo
// `env` do config) e repete a escolha entre o Sanity e as fixtures do config.ts. As fixtures entram
// por import estático: o carregador de módulos do config já fechou quando o `load` roda no build.

const ID_DO_MODULO = 'virtual:ronrom/ids-publicados';
const ID_RESOLVIDO = `\0${ID_DO_MODULO}`;

// O padrão do schema do astro:env (SANITY_API_VERSION).
const API_VERSION_PADRAO = '2025-02-19';

async function buscarIdsPublicados(
  env: Record<string, string>,
): Promise<CONSULTA_DOS_IDS_PUBLICADOS_RESULT> {
  const projectId = env['SANITY_PROJECT_ID'];
  const dataset = env['SANITY_DATASET'];
  if (env['SANITY_FIXTURES'] === 'true' || !projectId || !dataset) {
    return consultarFixtures<CONSULTA_DOS_IDS_PUBLICADOS_RESULT>(CONSULTA_DOS_IDS_PUBLICADOS);
  }
  const cliente = createClient({
    projectId,
    dataset,
    apiVersion: env['SANITY_API_VERSION'] || API_VERSION_PADRAO,
    useCdn: false,
    perspective: 'published',
  });
  return cliente.fetch<CONSULTA_DOS_IDS_PUBLICADOS_RESULT>(CONSULTA_DOS_IDS_PUBLICADOS);
}

/** Plugin do Vite que serve o `virtual:ronrom/ids-publicados` (tipos em src/env.d.ts). */
export function idsPublicados(env: Record<string, string>): Plugin {
  return {
    name: 'ronrom:ids-publicados',
    resolveId: (id) => (id === ID_DO_MODULO ? ID_RESOLVIDO : undefined),
    async load(id) {
      if (id !== ID_RESOLVIDO) return undefined;
      const ids = await buscarIdsPublicados(env);
      return `export const IDS_PUBLICADOS = new Set(${JSON.stringify(ids)});`;
    },
  };
}
