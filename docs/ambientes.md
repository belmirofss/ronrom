# Ambientes e hospedagem

O site (`web/`) é publicado na Vercel, plano **Hobby** (grátis), no projeto `ronrom` do time pessoal do dono do repositório. O Studio (`studio/`) não passa pela Vercel: é hospedado pelo Sanity (veja [`studio/README.md`](../studio/README.md)).

## Projeto na Vercel

| Configuração          | Valor                                                     |
| --------------------- | --------------------------------------------------------- |
| Repositório           | `belmirofss/ronrom` (conta pessoal, privado)              |
| Root Directory        | `web`                                                     |
| Framework             | Astro                                                     |
| Install Command       | `pnpm install --frozen-lockfile`                          |
| Build Command         | `pnpm build`                                              |
| Ignored Build Step    | `bash ../scripts/vercel-ignorar-build.sh`                 |
| Production Branch     | `main` → https://ronrom-blog.vercel.app                   |
| Preview               | todo push em outra branch e todo PR, com comentário no PR |
| Deployment Protection | Vercel Authentication (padrão) nos previews               |

O subdomínio `ronrom.vercel.app` já pertence a outro projeto da Vercel, então a produção usa `ronrom-blog.vercel.app`, configurado em Settings → Domains. O `ronrom-chi.vercel.app`, que a Vercel atribuiu na criação do projeto, foi removido sem redirect. Ele fica como endereço de produção até o domínio próprio da #63.

Install, build e Ignored Build Step ficam versionados em [`web/vercel.json`](../web/vercel.json), que tem prioridade sobre o painel. Mudar esses comandos é um PR comum.

### Ignored Build Step

[`scripts/vercel-ignorar-build.sh`](../scripts/vercel-ignorar-build.sh) compara o commit com o último deploy da branch (`VERCEL_GIT_PREVIOUS_SHA`) e cancela o build quando só mudaram `docs/`, `studio/`, `.github/` ou arquivos `.md`. Na dúvida (primeiro deploy da branch ou commit anterior fora do clone raso), builda. O deploy cancelado aparece como `CANCELED` na Vercel e **ainda conta na cota diária**, mas não gasta minutos de build.

## Limites do Hobby

Conferidos em **29/10/2026** em [vercel.com/docs/limits](https://vercel.com/docs/limits), [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby), [vercel.com/docs/deployment-retention](https://vercel.com/docs/deployment-retention) e [fair use](https://vercel.com/docs/limits/fair-use-guidelines). Reconfira antes de decisões que dependam deles.

| Limite                            | Hobby                                                                      |
| --------------------------------- | -------------------------------------------------------------------------- |
| Uso                               | Só pessoal e não comercial; uso comercial exige Pro                        |
| Repositório de organização GitHub | Não suportado (este repo é de conta pessoal, então ok)                     |
| Deploys por dia                   | 100 (também 100 por hora e 60 a cada 5 minutos); deploys cancelados contam |
| Builds simultâneos                | 1 (os outros esperam na fila)                                              |
| Duração máxima do build           | 45 minutos (2 vCPUs, 8 GB de memória, 32 GB de disco)                      |
| Retenção de deploys               | 30 dias para cancelados, com erro, preview e produção; os 3 últimos ficam  |
| Transferência (Fast Data)         | 100 GB/mês                                                                 |
| Requisições na CDN                | 1 milhão/mês                                                               |
| Invocações de função              | 1 milhão/mês; duração máxima 300 s; 2 GB de memória                        |
| Transformações de imagem          | 5 mil/mês                                                                  |
| Web Analytics                     | 50 mil eventos/mês                                                         |
| Logs de runtime                   | 1 hora                                                                     |
| Estourou a cota                   | O recurso fica parado até completar 30 dias (Web Analytics volta em 7)     |

Pontos que a issue #10 pediu para conferir:

- **Autor do commit em repo privado:** a regra de que o autor do commit precisa ser o dono do time Hobby não aparece nas páginas acima. Na prática, mantenha o `git config user.email` igual a um e-mail verificado na conta do GitHub ligada à Vercel. Conferido em 29/10/2026: os commits com `belmirofss@gmail.com` aparecem ligados à conta `belmirofss`.
- **Protection Bypass for Automation:** disponível em todos os planos, inclusive o Hobby. O segredo vai no cabeçalho `x-vercel-protection-bypass` (variável `VERCEL_AUTOMATION_BYPASS_SECRET`), para os testes E2E da #49.
- **Vercel Authentication:** disponível no Hobby para preview e produção. Proteção por senha é só no Pro.
- **`X-Robots-Tag: noindex` nos previews:** a Vercel adiciona sozinha em todo Preview Deployment ([guia](https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines)). A exceção é um domínio próprio apontado para uma branch que não é a de produção. Informação para a área de SEO (#52).

## Variáveis de ambiente

Cadastradas em Settings → Environment Variables do projeto `ronrom` na Vercel. Os nomes seguem a lista da #8. Hoje o site só lê `SITE_URL`; o schema tipado (`astro:env`) e a leitura das variáveis do Sanity entram com a #8.

| Variável                | Tipo na Vercel | Production                       | Preview e Development |
| ----------------------- | -------------- | -------------------------------- | --------------------- |
| `SITE_URL`              | Config         | `https://ronrom-blog.vercel.app` | não definida (\*)     |
| `SANITY_PROJECT_ID`     | Config         | `fq2685cq`                       | `fq2685cq`            |
| `SANITY_DATASET`        | Config         | `production`                     | `development`         |
| `SANITY_API_READ_TOKEN` | Secret         | pendente                         | pendente              |

(\*) Nos previews, a #8 deve derivar a URL de `VERCEL_URL`. Até lá vale o padrão do `astro.config.mjs`.

`SANITY_API_READ_TOKEN` é o token `viewer` do Sanity. Quem cadastra é o dono do projeto, como **Secret**, porque o valor não deve passar por outras mãos. Os tokens do CI ficam nos Secrets do GitHub Actions: `SANITY_API_READ_TOKEN` e `SANITY_AUTH_TOKEN` (veja [`studio/README.md`](../studio/README.md)).

## Pendências

- **`/api/health`:** depende do adapter da Vercel e da rota sob demanda da #9.
- **Schema das variáveis e `SITE_URL` dos previews:** #8.
