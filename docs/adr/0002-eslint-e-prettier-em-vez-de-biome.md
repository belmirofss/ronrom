# 0002 · ESLint e Prettier em vez de Biome

- **Status:** aceita
- **Data:** 29/10/2026
- **Issue:** #3

## Contexto

O site é feito quase todo de componentes `.astro`, com frontmatter em TypeScript e template em HTML. O projeto precisa de lint (incluindo regras de acessibilidade, que importam para um blog público) e de formatação automática, rodando no editor, no pré-commit e no CI.

Duas opções maduras:

- **Biome:** uma ferramenta só para lint e formatação, muito rápida e com pouca configuração. O suporte a `.astro` ainda é parcial (conferido na #3): o frontmatter é analisado, mas o template fica sem lint completo e sem regras de acessibilidade.
- **ESLint + Prettier:** duas ferramentas, mais lentas e com mais dependências, mas com plugins oficiais ou da comunidade do Astro (`eslint-plugin-astro`, `prettier-plugin-astro`) que cobrem o arquivo inteiro, inclusive as regras de acessibilidade do `jsx-a11y` adaptadas para `.astro`.

## Decisão

Usar o ESLint (flat config, com `typescript-eslint`, `eslint-plugin-astro` e as regras de acessibilidade do `jsx-a11y`) para lint e o Prettier (com `prettier-plugin-astro`) para formatação. O `astro check` cuida dos tipos.

## Consequências

- Os templates `.astro` passam por lint e formatação de verdade, e erros de acessibilidade comuns (imagem sem `alt`, link sem texto, `tabindex` positivo) quebram o CI.
- São mais dependências de desenvolvimento para manter (uns oito pacotes de lint e formatação na raiz). O Dependabot junta as atualizações minor e patch delas no grupo `lint`, num PR só.
- Lint e formatação são dois passos (`eslint --fix` e `prettier --write` no `lint-staged`) e mais lentos que o Biome. No tamanho deste projeto, a diferença é de segundos.
- As regras de estilo ficam todas no Prettier; o ESLint não tem regras de formatação, para os dois não brigarem.
- Reavaliar quando o Biome tiver suporte completo a `.astro`, com lint do template e regras de acessibilidade. A troca afetaria só a configuração, os scripts e o `lint-staged`.
