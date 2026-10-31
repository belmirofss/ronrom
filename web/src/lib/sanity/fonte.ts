import { createClient, type QueryParams } from '@sanity/client';

// De onde vem o conteúdo e como consultá-lo, sem ler o astro:env: o config.ts e o cliente.ts
// passam as variáveis do astro:env, e o astro.config.mjs, que roda antes dele, passa as do
// loadEnv para buscar os redirects (#53).

/** Padrão da SANITY_API_VERSION, aqui e no schema do astro:env. */
export const VERSAO_PADRAO_DA_API = '2025-02-19';

export type FonteDoConteudo =
  | { tipo: 'sanity'; projectId: string; dataset: string; apiVersion: string }
  | { tipo: 'fixtures'; motivo: string };

export interface VariaveisDoSanity {
  SANITY_FIXTURES: boolean;
  SANITY_PROJECT_ID: string | undefined;
  SANITY_DATASET: string | undefined;
  SANITY_API_VERSION: string;
}

// Em produção, o astro:env já exige SANITY_PROJECT_ID e SANITY_DATASET e proíbe as fixtures.
export function definirFonte({
  SANITY_FIXTURES,
  SANITY_PROJECT_ID,
  SANITY_DATASET,
  SANITY_API_VERSION,
}: VariaveisDoSanity): FonteDoConteudo {
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

/** Os parâmetros (`$inicio`, `$slug`...) de uma consulta de consultas.ts. */
export type Parametros = Record<string, string | number>;

/** Executa uma consulta de consultas.ts. `Resultado` é o `<NOME>_RESULT` do typegen. */
export type Consultar = <Resultado>(consulta: string, params?: Parametros) => Promise<Resultado>;

/**
 * O `consultar` de uma fonte: no Sanity ou, no modo fixtures, no dataset local (fixtures/), com o
 * mesmo GROQ.
 */
export function criarConsultar(fonte: FonteDoConteudo): Consultar {
  if (fonte.tipo === 'fixtures') {
    return async (consulta, params = {}) => {
      // Import dinâmico: o groq-js e o dataset de exemplo só são carregados no modo fixtures.
      const { consultarFixtures } = await import('./fixtures');
      return consultarFixtures(consulta, params);
    };
  }

  // - `apiVersion` fixa (SANITY_API_VERSION): uma mudança da API não muda o site sem um PR.
  // - `useCdn: false`: o build roda logo depois da publicação (deploy hook, docs/deploy.md) e tem
  //   de ler o conteúdo novo; a API CDN pode devolver a versão anterior por alguns instantes. São
  //   poucas consultas por build, longe da cota da API.
  // - `perspective: 'published'`: nunca rascunho nem versão de release, mesmo com token.
  // - Sem token: o dataset é público para o conteúdo publicado. O token viewer
  //   (SANITY_API_READ_TOKEN) é só da pré-visualização de rascunhos (#43), que cria o próprio
  //   cliente no servidor.
  const cliente = createClient({
    projectId: fonte.projectId,
    dataset: fonte.dataset,
    apiVersion: fonte.apiVersion,
    useCdn: false,
    perspective: 'published',
  });
  // O tipo QueryParams do cliente proíbe nomes das opções do fetch, como `tag`, para pegar quem
  // misturava opções e parâmetros na API antiga. Aqui não há essa mistura: os parâmetros vão
  // sempre como `$nome`, e o `$tag` da CONSULTA_DOS_POSTS_DA_TAG chega certo ao Sanity.
  return (consulta, params = {}) => cliente.fetch(consulta, params as QueryParams);
}
