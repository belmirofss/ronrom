import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_FIXTURES,
  SANITY_PROJECT_ID,
} from 'astro:env/server';

// De onde vem o conteúdo do build: o Sanity ou as fixtures (README desta pasta). O cliente.ts lê
// daqui.
// Em produção, o astro:env já exige SANITY_PROJECT_ID e SANITY_DATASET e proíbe as fixtures.
export type FonteDoConteudo =
  | { tipo: 'sanity'; projectId: string; dataset: string; apiVersion: string }
  | { tipo: 'fixtures'; motivo: string };

function definirFonte(): FonteDoConteudo {
  if (SANITY_FIXTURES) {
    return { tipo: 'fixtures', motivo: 'SANITY_FIXTURES=true' };
  }
  if (!SANITY_PROJECT_ID || !SANITY_DATASET) {
    return { tipo: 'fixtures', motivo: 'SANITY_PROJECT_ID ou SANITY_DATASET não definida' };
  }
  return {
    tipo: 'sanity',
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
  };
}

export const fonteDoConteudo = definirFonte();
