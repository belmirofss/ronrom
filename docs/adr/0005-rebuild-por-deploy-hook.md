# 0005 · Conteúdo novo entra por rebuild (deploy hook)

- **Status:** aceita (implementação na #17 e na #27)
- **Data:** 29/10/2026
- **Issues:** #17, #27

## Contexto

O site é estático ([ADR 0001](0001-site-estatico-com-rotas-sob-demanda.md)): as páginas são geradas no build com o conteúdo do Sanity daquele momento. A autora não programa e precisa ver um post publicado no ar sem pedir nada a ninguém. O conteúdo muda poucas vezes por dia, e não haverá agendamento de posts (#1).

Alternativas consideradas:

- **Renderização sob demanda** (`output: 'server'` ou ISR): conteúdo atualizado na hora, mas toda página vira invocação de função (cota de 1 milhão por mês no Hobby), com cold start e cache a invalidar. Uma queda das funções derrubaria o site inteiro.
- **Buscar o conteúdo no navegador:** dispensa o build, mas as páginas chegariam vazias para buscadores e redes sociais, o que vai contra o SEO e o JSON-LD do projeto.
- **Rebuild agendado** (um cron a cada hora, por exemplo): simples, mas atrasa a publicação e gasta deploys mesmo sem mudança.
- **Rebuild disparado pela publicação:** o Sanity avisa a Vercel quando algo publicado muda, e a Vercel builda o site de novo.

## Decisão

Cada publicação, edição ou exclusão de conteúdo publicado no dataset `production` dispara um rebuild completo de produção: um webhook GROQ do Sanity (#27) chama um Deploy Hook da Vercel apontado para a `main` (#17). Um workflow diário do GitHub Actions chama o mesmo hook, como rede de segurança se algum webhook falhar. Rascunhos e o dataset `development` não disparam deploy; o preview de rascunhos é outro mecanismo (#43).

## Consequências

- As páginas continuam estáticas na CDN: rápidas, baratas e de pé mesmo se as funções caírem.
- Entre publicar e ver no ar passa o tempo de um build. A #17 mede e registra esse tempo em [`deploy.md`](../deploy.md).
- Cada disparo é um deploy e conta na cota do Hobby (100 por dia e, no hook, até 60 disparos por hora). Disparos seguidos para o mesmo commit cancelam os anteriores daquele hook, então uma rajada de edições vira um build só.
- A URL do hook é um segredo: quem a tiver dispara deploys de produção. Ela fica só no Sanity e nos secrets do GitHub, e a rotação está descrita em [`deploy.md`](../deploy.md#rotacionar-a-url-do-hook).
- O hook rebuilda o commit que já está no ar, e a Vercel não diz ao Ignored Build Step que o deploy veio do hook. Comparando commits, o script cancelaria o build. Por isso, desde a #17, a produção nunca pula o build: só os previews comparam commits ([`deploy.md`](../deploy.md#por-que-a-produção-não-pula-o-build)). O custo é um build de produção a cada merge só de docs.
- O build fica mais longo à medida que o número de posts cresce. Se ele passar de alguns minutos, ou se a autora precisar ver mudanças na hora, vale reavaliar com ISR nas páginas de post.
