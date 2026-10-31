import { fonteDoConteudo } from './config';
import { criarConsultar } from './fonte';

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
export const consultar = criarConsultar(fonteDoConteudo);
