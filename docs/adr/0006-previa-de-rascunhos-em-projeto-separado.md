# 0006 · Prévia de rascunhos num segundo projeto da Vercel

- **Status:** aceita
- **Data:** 31/10/2026
- **Issue:** #43

## Contexto

A autora precisa ver um rascunho, inclusive um post que nunca foi ao ar, no layout "Caderno" antes de publicar, e clicar num texto da prévia para cair no campo certo do editor. O Sanity oferece isso no plano Free com a ferramenta **Presentation** do Studio: ela abre o site num iframe, ao lado do editor, e o site lê os rascunhos com um token, marca os textos com o _stega_ (caracteres invisíveis que dizem de que documento e campo o texto veio) e roda o script da edição visual.

O site de produção é estático ([ADR 0001](0001-site-estatico-com-rotas-sob-demanda.md)) e recebe conteúdo novo por rebuild ([ADR 0005](0005-rebuild-por-deploy-hook.md)): um rascunho novo não existe no build. A prévia precisa de páginas renderizadas sob demanda, e o token viewer não pode chegar ao site público.

Alternativas consideradas:

- **Prévia dentro do projeto do site** (`output: 'server'` ou rotas sob demanda só para a prévia): um único deploy, mas o site público passaria a carregar o token, o código da prévia e uma rota que liga rascunhos. Um erro de configuração exporia rascunhos no endereço oficial.
- **`@sanity/astro`:** a integração oficial, mas pede o `@astrojs/react` e cria o próprio cliente (`sanity:client`), duplicando o [`cliente.ts`](../../web/src/lib/sanity/cliente.ts) e as fixtures. A parte que importa, o `enableVisualEditing`, é do `@sanity/visual-editing`, que dá para usar direto num script.
- **Painel com iframe no documento**, com um link "Ver prévia": mais simples, mas sem o clique no texto levando ao campo.
- **Segundo projeto da Vercel**, com o mesmo repositório e uma variável que liga o modo prévia no build.

## Decisão

A prévia é um **segundo projeto da Vercel, `ronrom-previa`**, apontado para o mesmo repositório (Root Directory `web`, branch `main`), com `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true`. Com a variável, o `astro.config.mjs` muda a saída para `output: 'server'` e registra as rotas de draft mode, o middleware e o script da edição visual; o cliente do Sanity passa a ler a perspectiva `drafts` com o token viewer e o stega. Sem a variável, como no projeto `ronrom`, nada disso entra no build. O Presentation do Studio aponta para `https://ronrom-previa.vercel.app`.

A entrada é protegida pelo segredo temporário do Presentation (`@sanity/preview-url-secret`): o `/api/previa/ativar` confere o segredo e grava um cookie de sessão assinado; o middleware recusa (401) toda página sem esse cookie.

## Consequências

- O site público continua estático e sem token, sem rota de draft mode e sem o script da edição visual. O build recusa ligar a prévia com o `SITE_URL` do site.
- A prévia mostra o código da `main` com o conteúdo atual do Sanity, sem rebuild: cada página é uma invocação de função (cota de 1 milhão por mês do Hobby, compartilhada entre os projetos da conta). Só a autora usa, então o consumo é pequeno.
- Cada merge na `main` builda dois projetos, e o Hobby faz um build de cada vez. O projeto da prévia não builda branches e pula merges que só mudam docs ([`scripts/vercel-ignorar-build.sh`](../../scripts/vercel-ignorar-build.sh)). Mudanças na prévia só são testadas depois do merge, ou no `pnpm dev` com a prévia ligada.
- As páginas com parâmetro precisam funcionar sem o `getStaticPaths`: endereço inexistente vira 404 e a paginação lê o número da URL ([`web/src/lib/previa.ts`](../../web/src/lib/previa.ts)).
- O cookie da sessão é de terceiro (a prévia roda num iframe do Studio). Ele usa `SameSite=None` e `Partitioned`, que o Chrome aceita com cookies de terceiros bloqueados. Se um navegador recusar, a prévia mostra "abra pela aba Apresentação"; a saída é abrir o Studio noutro navegador ou liberar cookies para `ronrom-previa.vercel.app`.
- Vale reavaliar se o site migrar para renderização sob demanda (ISR, por exemplo): aí a prévia pode voltar para o mesmo projeto.
