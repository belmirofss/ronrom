# 0004 · Dependabot para atualizar dependências

- **Status:** aceita
- **Data:** 29/10/2026
- **Issue:** #6

## Contexto

O projeto depende de Astro, Sanity, das ferramentas de lint e de actions do GitHub, que lançam versões com frequência. Sem atualização automática, as dependências envelhecem até um major virar um projeto à parte, e correções de segurança passam despercebidas. Uma pessoa só mantém o código, então o volume de PRs precisa ser pequeno.

Restrições: o repositório é privado numa conta GitHub Free, sem branch protection nem rulesets, então não há como exigir check verde antes de um merge automático. No Hobby da Vercel, commits de bot em repositório privado podem ter o preview bloqueado pela regra do autor do commit.

Alternativas consideradas:

- **Renovate:** mais configurável (agendas finas, auto-merge por tipo, dashboard), mas exige instalar um app do GitHub com acesso ao repositório, e o auto-merge, seu maior ganho, não é seguro sem branch protection.
- **Dependabot:** nativo do GitHub, sem app para instalar, com grupos, cooldown e security updates integrados aos alertas da aba Security.

## Decisão

Usar o Dependabot ([`.github/dependabot.yml`](../../.github/dependabot.yml)) para os ecossistemas `npm` (que cobre o pnpm) e `github-actions`, uma vez por mês no fuso de São Paulo, com no máximo 5 PRs abertos por ecossistema. Minor e patch vêm em grupos (`astro`, `sanity`, `lint`, `minor-e-patch`, `actions`); cada major vem num PR separado. Os PRs saem com título `chore(deps): ...` e o label `tipo:chore`. O merge é sempre manual, com o CI verde. As security updates ficam ligadas e chegam fora do calendário.

## Consequências

- Poucos PRs por mês, já no padrão de título validado pelo CI, e cada major isolado, com espaço para ler o changelog.
- Nenhum app de terceiro com acesso ao código.
- O cooldown de 3 dias evita PRs que quebrariam no install pelo `minimumReleaseAge` do pnpm. Security updates ignoram o cooldown.
- Sem auto-merge, cada PR exige uma revisão e um clique. É o preço de não ter branch protection.
- O preview da Vercel pode sair bloqueado num PR do bot. O CI é a validação principal; o que fazer quando é preciso ver o site está no [CONTRIBUTING](../../CONTRIBUTING.md#dependências-dependabot).
- Workflows disparados pelo Dependabot não recebem os secrets de Actions: um secret que o CI precise também deve ser cadastrado nos secrets do Dependabot.
- Reavaliar se o volume de PRs ficar alto demais, ou se o repositório passar a ter branch protection (plano pago ou repositório público), o que tornaria o auto-merge seguro.
