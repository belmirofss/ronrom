import {
  CONSULTA_DA_TAXONOMIA,
  CONSULTA_DAS_ROTAS_DOS_POSTS,
  CONSULTA_DOS_REDIRECTS,
} from './consultas';
import { consultarFixtures } from './fixtures';
import { criarConsultar, type FonteDoConteudo } from './fonte';
import type {
  CONSULTA_DA_TAXONOMIA_RESULT,
  CONSULTA_DAS_ROTAS_DOS_POSTS_RESULT,
  CONSULTA_DOS_REDIRECTS_RESULT,
} from './tipos.gerados';

/**
 * O que o `montarRedirects` (src/lib/redirects.ts) precisa do Sanity: os posts com caminhos
 * antigos e, para saber o que já é página, a rota de todos os posts no ar e a taxonomia. Chamado
 * pelo astro.config.mjs, que roda antes do astro:env, por isso recebe a fonte em vez de usar o
 * cliente.ts (#53).
 */
export async function buscarDadosDosRedirects(fonte: FonteDoConteudo) {
  // Import estático das fixtures: o import dinâmico do criarConsultar roda depois de o Vite
  // fechar o carregador do astro.config e falha. Aqui é só código de build, nunca vai ao bundle.
  const consultar = fonte.tipo === 'fixtures' ? consultarFixtures : criarConsultar(fonte);
  const [posts, rotasDosPosts, taxonomia] = await Promise.all([
    consultar<CONSULTA_DOS_REDIRECTS_RESULT>(CONSULTA_DOS_REDIRECTS),
    consultar<CONSULTA_DAS_ROTAS_DOS_POSTS_RESULT>(CONSULTA_DAS_ROTAS_DOS_POSTS),
    consultar<CONSULTA_DA_TAXONOMIA_RESULT>(CONSULTA_DA_TAXONOMIA),
  ]);
  return { posts, rotasDosPosts, taxonomia };
}
