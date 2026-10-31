import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_FIXTURES,
  SANITY_PROJECT_ID,
} from 'astro:env/server';

import { definirFonte } from './fonte';

// De onde vem o conteúdo do build: o Sanity ou as fixtures (README desta pasta). O cliente.ts lê
// daqui. A regra fica no fonte.ts, que o astro.config.mjs também usa, com as variáveis do loadEnv.
export type { FonteDoConteudo } from './fonte';

export const fonteDoConteudo = definirFonte({
  SANITY_FIXTURES,
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
});
