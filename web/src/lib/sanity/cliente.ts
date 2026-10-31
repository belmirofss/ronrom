import { type ClientConfig, createClient, type QueryParams } from '@sanity/client';
import type { PreviewUrlValidateUrlResult } from '@sanity/preview-url-secret';
import {
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED,
  SANITY_API_READ_TOKEN,
  STUDIO_URL,
} from 'astro:env/server';

import { fonteDoConteudo } from './config';
import { filtroDoStega } from './stega';

// Cliente do Sanity do site e o único ponto que executa uma consulta GROQ. As páginas não chamam
// daqui: usam as funções de conteudo.ts. Importa astro:env/server (via config.ts), então só roda
// no servidor (no build e nas rotas sob demanda) e nunca entra no bundle do navegador.

// - `apiVersion` fixa (SANITY_API_VERSION): uma mudança da API não muda o site sem um PR.
// - `useCdn: false`: o build roda logo depois da publicação (deploy hook, docs/deploy.md) e tem de
//   ler o conteúdo novo; a API CDN pode devolver a versão anterior por alguns instantes. São
//   poucas consultas por build, longe da cota da API.
// - `perspective: 'published'`: nunca rascunho nem versão de release, mesmo com token.
// - Sem token: o dataset é público para o conteúdo publicado.
//
// Na prévia de rascunhos (#43, PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true, só no projeto
// ronrom-previa da Vercel), o mesmo cliente lê os rascunhos: token viewer, `perspective: 'drafts'`
// (o rascunho por cima do publicado, com o `_id` sem `drafts.`, então as consultas não mudam) e o
// stega, que marca os textos para a edição visual. O astro.config.mjs recusa a prévia sem token
// e no endereço do site.
const PREVIA = PUBLIC_SANITY_VISUAL_EDITING_ENABLED;

const LEITURA: ClientConfig = PREVIA
  ? {
      perspective: 'drafts',
      ...(SANITY_API_READ_TOKEN ? { token: SANITY_API_READ_TOKEN } : {}),
      stega: { enabled: true, studioUrl: STUDIO_URL, filter: filtroDoStega },
    }
  : { perspective: 'published' };

const cliente =
  fonteDoConteudo.tipo === 'sanity'
    ? createClient({
        projectId: fonteDoConteudo.projectId,
        dataset: fonteDoConteudo.dataset,
        apiVersion: fonteDoConteudo.apiVersion,
        useCdn: false,
        ...LEITURA,
      })
    : null;

/** Os parâmetros (`$inicio`, `$slug`...) de uma consulta de consultas.ts. */
export type Parametros = Record<string, string | number>;

/**
 * Executa uma consulta no Sanity ou, no modo fixtures, no dataset local (fixtures/), com o mesmo
 * GROQ. `Resultado` é o tipo que o typegen gerou para a consulta (`<NOME>_RESULT`), passado por
 * quem chama: as consultas montadas com função em consultas.ts têm tipo `string` no TypeScript e
 * não acham sozinhas o tipo no mapa `SanityQueries`.
 */
export async function consultar<Resultado>(
  consulta: string,
  params: Parametros = {},
): Promise<Resultado> {
  if (!cliente) {
    // Import dinâmico: o groq-js e o dataset de exemplo só são carregados no modo fixtures.
    const { consultarFixtures } = await import('./fixtures');
    return consultarFixtures<Resultado>(consulta, params);
  }
  // O tipo QueryParams do cliente proíbe nomes das opções do fetch, como `tag`, para pegar quem
  // misturava opções e parâmetros na API antiga. Aqui não há essa mistura: os parâmetros vão
  // sempre como `$nome`, e o `$tag` da CONSULTA_DOS_POSTS_DA_TAG chega certo ao Sanity.
  return cliente.fetch<Resultado>(consulta, params as QueryParams);
}

/**
 * Confere o segredo que o Presentation do Studio põe na URL de `/api/previa/ativar` (#43). O
 * segredo é um documento privado do dataset, que só o token viewer lê.
 */
export async function validarUrlDaPrevia(url: string): Promise<PreviewUrlValidateUrlResult> {
  if (!cliente || !PREVIA) return { isValid: false };
  const { validatePreviewUrl } = await import('@sanity/preview-url-secret');
  return validatePreviewUrl(cliente.withConfig({ stega: false }), url);
}
