// @ts-check
// Redirects fixos do site (#41): página que mudou de endereço e atalhos. O astro.config.mjs passa
// esta lista para o `redirects` do Astro, e o adapter da Vercel transforma cada item numa rota com
// o status certo (nada de página com meta refresh). Os redirects de slug de post saem do Sanity no
// build (#53) e se juntam a estes; o build também confere as regras abaixo e falha se alguma for
// quebrada (src/lib/redirects.ts). Como e quando usar: docs/cabecalhos.md#redirects.
//
// Regras:
// - Caminho sem barra no final e sem domínio, nos dois lados (docs/seo-urls.md).
// - 301 para mudança definitiva (o padrão quando o valor é só o destino); 302 só para algo
//   temporário, com o motivo num comentário.
// - Nunca aponte para outro redirect: aponte direto para o destino final. Se o destino virar
//   redirect depois (um post que mudou de slug), o build encurta a cadeia e avisa no log.
//
// Exemplo:
//   '/contato': '/sobre',
//   '/reviews/cafes/antigo': { status: 301, destination: '/reviews/cafes/novo' },

/** @type {Record<string, import('./src/lib/redirects.ts').RedirectFixo>} */
export const redirects = {};
