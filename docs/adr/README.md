# Decisões de arquitetura (ADRs)

Cada ADR registra uma decisão que muda como o projeto é construído, hospedado ou mantido: o contexto que levou a ela, o que foi decidido e as consequências, boas e ruins. Servem para quem chegar depois entender o porquê sem precisar reabrir a discussão.

| ADR                                                     | Decisão                                           | Status |
| ------------------------------------------------------- | ------------------------------------------------- | ------ |
| [0001](0001-site-estatico-com-rotas-sob-demanda.md)     | Site estático com rotas sob demanda na Vercel     | aceita |
| [0002](0002-eslint-e-prettier-em-vez-de-biome.md)       | ESLint e Prettier em vez de Biome                 | aceita |
| [0003](0003-pnpm-e-monorepo-web-studio.md)              | pnpm e monorepo com `web/` e `studio/`            | aceita |
| [0004](0004-dependabot-para-atualizar-dependencias.md)  | Dependabot para atualizar dependências            | aceita |
| [0005](0005-rebuild-por-deploy-hook.md)                 | Conteúdo novo entra por rebuild (deploy hook)     | aceita |
| [0006](0006-previa-de-rascunhos-em-projeto-separado.md) | Prévia de rascunhos num segundo projeto da Vercel | aceita |

## Quando escrever um ADR

- Ao escolher entre ferramentas, serviços ou abordagens com alternativas reais (por exemplo, trocar o contador de visualizações de serviço).
- Quando a decisão é cara de desfazer ou afeta várias áreas.
- Quando alguém provavelmente vai perguntar "por que não fizemos X?".

Configuração do dia a dia (uma regra de lint, um script novo) não precisa de ADR; basta o PR.

## Como escrever

1. Copie o modelo abaixo para `docs/adr/NNNN-titulo-curto.md`, com o próximo número livre.
2. Escreva curto: contexto, decisão e consequências cabem numa tela.
3. Inclua o ADR no mesmo PR que implementa a decisão e adicione a linha na tabela acima.
4. ADR aceito não é reescrito. Se a decisão mudar, escreva um ADR novo e marque o antigo como `substituída pela NNNN`.

```markdown
# NNNN · Título da decisão

- **Status:** proposta | aceita | substituída pela NNNN
- **Data:** DD/MM/AAAA
- **Issue:** #N

## Contexto

O problema, as restrições (plano, custo, prazo) e as alternativas consideradas.

## Decisão

O que foi escolhido, em uma ou duas frases diretas.

## Consequências

- O que fica mais fácil ou mais barato.
- O que fica mais difícil, os riscos e o que fazer se eles aparecerem.
- Quando vale reavaliar.
```
