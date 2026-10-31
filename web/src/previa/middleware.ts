import { SANITY_API_READ_TOKEN } from 'astro:env/server';
import { defineMiddleware } from 'astro:middleware';

import { COOKIE_DA_PREVIA, sessaoValida } from './sessao';

// Middleware da prévia de rascunhos (#43), registrado só no build da prévia (astro.config.mjs).
// Toda página da prévia mostra rascunhos, então só abre com a sessão que o /api/previa/ativar
// grava depois de conferir o segredo do Presentation. Sem ela, 401: a prévia não tem conteúdo
// público, e quem chega pelo endereço direto não vê rascunho nenhum.

// Rotas que funcionam sem sessão: a entrada e a saída da prévia e a rota de fumaça.
const LIVRES = ['/api/previa/', '/api/health'];

const PREVIA_FECHADA = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Prévia do Ronrom</title>
  </head>
  <body>
    <h1>Prévia do Ronrom</h1>
    <p>Esta é a prévia dos rascunhos. Ela abre pela aba Apresentação do Studio.</p>
  </body>
</html>`;

export const onRequest = defineMiddleware(async ({ url, cookies }, next) => {
  const livre = LIVRES.some((caminho) => url.pathname.startsWith(caminho));
  const autorizado = sessaoValida(
    cookies.get(COOKIE_DA_PREVIA)?.value,
    SANITY_API_READ_TOKEN ?? '',
  );

  const resposta =
    livre || autorizado
      ? await next()
      : new Response(PREVIA_FECHADA, {
          status: 401,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });

  // Nada da prévia vai para buscador nem fica em cache compartilhado (CDN, proxy).
  resposta.headers.set('X-Robots-Tag', 'noindex, nofollow');
  resposta.headers.set('Cache-Control', 'private, no-store');
  return resposta;
});
