import type { ClientConfig } from '@sanity/client';
import type { PreviewUrlValidateUrlResult } from '@sanity/preview-url-secret';
import {
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED,
  SANITY_API_READ_TOKEN,
  STUDIO_URL,
} from 'astro:env/server';

import { fonteDoConteudo } from './config';
import { criarCliente, criarConsultar } from './fonte';
import { filtroDoStega } from './stega';

// Cliente do Sanity do site e o único ponto que executa uma consulta GROQ. As páginas não chamam
// daqui: usam as funções de conteudo.ts. Importa astro:env/server (via config.ts), então só roda
// no servidor (no build e nas rotas sob demanda) e nunca entra no bundle do navegador. Como o
// cliente é configurado: fonte.ts.

export type { Parametros } from './fonte';

/**
 * Executa uma consulta no Sanity ou, no modo fixtures, no dataset local (fixtures/), com o mesmo
 * GROQ. `Resultado` é o tipo que o typegen gerou para a consulta (`<NOME>_RESULT`), passado por
 * quem chama: as consultas montadas com função em consultas.ts têm tipo `string` no TypeScript e
 * não acham sozinhas o tipo no mapa `SanityQueries`.
 */
export const consultar = criarConsultar(fonteDoConteudo, leituraDaPrevia());

// Na prévia de rascunhos (#43, PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true, só no projeto
// ronrom-previa da Vercel), o cliente lê os rascunhos: token viewer, `perspective: 'drafts'` (o
// rascunho por cima do publicado, com o `_id` sem `drafts.`, então as consultas não mudam) e o
// stega, que marca os textos para a edição visual. O astro.config.mjs recusa a prévia sem token e
// no endereço do site. Fora da prévia, a leitura padrão do fonte.ts: só o publicado, sem token.
function leituraDaPrevia(): ClientConfig | undefined {
  if (!PUBLIC_SANITY_VISUAL_EDITING_ENABLED) return undefined;
  return {
    perspective: 'drafts',
    ...(SANITY_API_READ_TOKEN ? { token: SANITY_API_READ_TOKEN } : {}),
    stega: { enabled: true, studioUrl: STUDIO_URL, filter: filtroDoStega },
  };
}

/**
 * Confere o segredo que o Presentation do Studio põe na URL de `/api/previa/ativar` (#43). O
 * segredo é um documento privado do dataset, que só o token viewer lê.
 */
export async function validarUrlDaPrevia(url: string): Promise<PreviewUrlValidateUrlResult> {
  const leitura = leituraDaPrevia();
  if (!leitura || fonteDoConteudo.tipo !== 'sanity') return { isValid: false };
  const { validatePreviewUrl } = await import('@sanity/preview-url-secret');
  return validatePreviewUrl(criarCliente(fonteDoConteudo, { ...leitura, stega: false }), url);
}
