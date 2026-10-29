# 0001 · Site estático com rotas sob demanda na Vercel

- **Status:** aceita
- **Data:** 29/10/2026
- **Issue:** #9

## Contexto

O Ronrom é um blog: o conteúdo muda só quando a autora publica no Sanity, e cada publicação dispara um rebuild (#17). Duas partes precisam de servidor: o contador de visualizações (#56), que grava no Redis a cada leitura, e o preview de rascunhos (#43), que lê conteúdo não publicado com um token. O site roda no plano Hobby da Vercel, com cota de 1 milhão de invocações de função por mês.

O Astro oferece três caminhos: só estático (sem adapter, sem nenhuma rota de servidor), estático com rotas sob demanda (adapter + `prerender = false` por rota) ou `output: 'server'` (tudo sob demanda, com `prerender = true` nas exceções).

## Decisão

Manter a saída estática, que é o padrão do Astro, e instalar o `@astrojs/vercel`. Só as rotas que precisam de servidor exportam `export const prerender = false` e rodam numa Vercel Function. As funções ficam na região `gru1` (São Paulo), junto do Redis em `sa-east-1`, e usam o Node 22, a mesma linha do `.nvmrc`.

## Consequências

- Todas as páginas saem prontas da CDN: rápidas, sem cold start e sem gastar invocações. O site continua de pé mesmo se as funções caírem.
- O adapter junta todas as rotas sob demanda numa única função (`_render`). Uma rota nova não aumenta o número de funções, mas cada requisição a ela conta na cota.
- Esquecer o `prerender = false` numa rota que precisa de servidor faz o Astro gerá-la no build, com os dados daquele momento. O passo a passo em [`docs/ambientes.md`](../ambientes.md#como-adicionar-uma-rota-sob-demanda) cobre isso.
- O `astro preview` deixa de funcionar (o adapter não suporta). As rotas sob demanda são testadas no `pnpm dev` e o resto no preview do PR.
- Sem uma página 404 estática, toda URL inexistente cai na função. A página da #47 precisa ser estática.
- Se o site um dia precisar de muitas páginas sob demanda, a troca para `output: 'server'` é só de configuração; as rotas já marcadas continuam iguais.
