# Ambientes e hospedagem

O site (`web/`) é publicado na Vercel, plano **Hobby** (grátis), no projeto `ronrom` do time pessoal do dono do repositório. O Studio (`studio/`) não passa pela Vercel: é hospedado pelo Sanity (veja [`studio/README.md`](../studio/README.md)). Como uma mudança vai ao ar, redeploy e rollback estão em [`deploy.md`](deploy.md).

## Projeto na Vercel

| Configuração          | Valor                                                     |
| --------------------- | --------------------------------------------------------- |
| Repositório           | `belmirofss/ronrom` (conta pessoal, privado)              |
| Root Directory        | `web`                                                     |
| Framework             | Astro                                                     |
| Install Command       | `pnpm install --frozen-lockfile`                          |
| Build Command         | `pnpm build`                                              |
| Ignored Build Step    | `bash ../scripts/vercel-ignorar-build.sh`                 |
| Function Region       | `gru1` (São Paulo), junto do Redis em `sa-east-1`         |
| Node.js               | `22.x`, pelo `engines` do `web/package.json`              |
| Production Branch     | `main` → https://ronrom-blog.vercel.app                   |
| Preview               | todo push em outra branch e todo PR, com comentário no PR |
| Deployment Protection | Vercel Authentication (padrão) nos previews               |

O subdomínio `ronrom.vercel.app` já pertence a outro projeto da Vercel, então a produção usa `ronrom-blog.vercel.app`, configurado em Settings → Domains. O `ronrom-chi.vercel.app`, que a Vercel atribuiu na criação do projeto, foi removido sem redirect. Ele fica como endereço de produção até o domínio próprio da #63.

Install, build, Ignored Build Step e região das funções ficam versionados em [`web/vercel.json`](../web/vercel.json), que tem prioridade sobre o painel. Mudar esses comandos é um PR comum.

### Ignored Build Step

[`scripts/vercel-ignorar-build.sh`](../scripts/vercel-ignorar-build.sh) compara o commit com o último deploy da branch (`VERCEL_GIT_PREVIOUS_SHA`) e cancela o build quando só mudaram `docs/`, `studio/`, `.github/` ou arquivos `.md`. Na dúvida (primeiro deploy da branch ou commit anterior fora do clone raso), builda. O deploy cancelado aparece como `CANCELED` na Vercel e **ainda conta na cota diária**, mas não gasta minutos de build.

## Saída estática e rotas sob demanda

O site usa o [`@astrojs/vercel`](https://docs.astro.build/en/guides/integrations-guide/vercel/) com a saída estática, que é o padrão do Astro (não há `output` no `astro.config.mjs`). Toda página é gerada no build e servida pela CDN; só as rotas com `export const prerender = false` rodam sob demanda, numa Vercel Function. A decisão está no [ADR 0001](adr/0001-site-estatico-com-rotas-sob-demanda.md).

O build gera `web/.vercel/output`, que a Vercel publica como está:

- `static/`: as páginas e os assets (as mesmas páginas ficam em `web/dist/client`, que o CI guarda como artifact).
- `functions/_render.func`: **uma única função** com todas as rotas sob demanda. Uma rota nova não cria outra função, só entra nas `routes` do `config.json`, apontando para `_render`.

Hoje a única rota sob demanda é [`/api/health`](../web/src/pages/api/health.ts), a rota de fumaça: responde `{ "ok": true, "commit": "<sha>" }` com `Cache-Control: no-store`. O `commit` vem da variável de sistema `VERCEL_GIT_COMMIT_SHA`, fixada no build; fora da Vercel, é `null`.

### Como adicionar uma rota sob demanda

1. Crie a página ou o endpoint em `web/src/pages/` (endpoints de API em `web/src/pages/api/`) e exporte `export const prerender = false`. Sem essa linha, a rota é gerada no build como arquivo estático.
2. Leia variáveis só de `astro:env/server`. Uma variável `secret` é lida em tempo de execução na função; uma `public` fica fixa no valor do build.
3. Defina o `Cache-Control` da resposta. Para algo que muda a cada requisição (contador, preview), use `no-store`; para algo que pode ficar em cache na CDN, use `s-maxage`.
4. Teste com `pnpm dev`, que serve as rotas sob demanda. O `pnpm preview` não existe: o adapter da Vercel não suporta o comando.
5. Rode `pnpm build` e confira em `web/.vercel/output/config.json` que a rota aponta para `_render`. No preview do PR, confira a resposta e o cabeçalho.

Cada requisição a uma rota sob demanda é uma invocação de função e conta na cota do Hobby (1 milhão por mês). Prefira uma página estática sempre que o conteúdo puder ser gerado no build.

**Página 404:** enquanto não existir `web/src/pages/404.astro`, qualquer URL inexistente cai na função, que renderiza o 404 padrão do Astro e gasta uma invocação. A página da #47 deve ser estática (sem `prerender = false`): com ela, o adapter passa a servir o `404.html` direto da CDN.

### Região e versão de Node

- **Região:** `"regions": ["gru1"]` no `web/vercel.json`. O Hobby permite uma única região, à escolha ([docs](https://vercel.com/docs/functions/configuring-functions/region)), então ficou São Paulo, junto do Redis em `sa-east-1`, como decidido na #1. As páginas estáticas são servidas pela CDN em todas as regiões, independentemente dessa configuração.
- **Node:** o adapter grava o runtime da função (`nodejs22.x`) a partir da versão de Node que roda o build. Na Vercel, quem escolhe essa versão é o `engines.node` do `web/package.json`, que tem prioridade sobre o painel. Ele fica em `22.x`, a mesma linha do `.nvmrc`, porque um intervalo como `>=22` faria a Vercel usar o Node 24. A Vercel só deixa escolher a versão major e aplica sozinha as minor e patch. Ao trocar de versão, mude o `.nvmrc`, os dois `engines` e os `@types/node` juntos. Um build local com outro Node (o 24, por exemplo) grava outro runtime, mas esse build não é publicado.

### Opções do adapter

| Opção            | Valor                | Por quê                                                                                        |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `imageService`   | `false`              | As imagens vêm do CDN do Sanity, que já redimensiona; o otimizador da Vercel gastaria a cota   |
| `webAnalytics`   | `{ enabled: false }` | O analytics é o Umami Cloud, sem cookies (#58)                                                 |
| `isr`            | não usado            | Nada é renderizado sob demanda com cache; o conteúdo novo entra por rebuild (deploy hook, #17) |
| `maxDuration`    | padrão               | O health responde na hora; reavaliar se uma rota nova precisar de mais tempo                   |
| `skewProtection` | não usado            | Só nos planos Pro e Enterprise                                                                 |
| `middlewareMode` | não usado            | Não há middleware                                                                              |

### Conferir em produção

```bash
curl -si https://ronrom-blog.vercel.app/api/health
```

Deve responder `200`, `cache-control: no-store` e o hash do commit que está no ar. Uma página estática, como a home, responde com `x-vercel-cache: HIT` (ou `PRERENDER` logo depois do deploy):

```bash
curl -sI https://ronrom-blog.vercel.app/
```

### Conferir no preview

O link do preview está no comentário da Vercel no PR. Por causa da Vercel Authentication, um `curl` sem login recebe `302` para o SSO da Vercel (já com `x-robots-tag: noindex`). Abra `<url-do-preview>/api/health` no navegador logado na conta da Vercel: deve mostrar `{ "ok": true, "commit": "<sha>" }` com o hash do último commit do PR. Para conferir por script (os testes E2E da #49), use o cabeçalho `x-vercel-protection-bypass` com o segredo da Protection Bypass for Automation.

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

O schema fica em [`web/astro.config.mjs`](../web/astro.config.mjs) (`env.schema`, do [`astro:env`](https://docs.astro.build/en/guides/environment-variables/#type-safe-environment-variables)), que valida e tipa cada variável no build. O código do site lê sempre de `astro:env/client` ou `astro:env/server`, nunca de `process.env` ou `import.meta.env`. Toda variável nova entra no schema, em [`web/.env.example`](../web/.env.example) e na tabela abaixo.

- **Públicas** (`access: 'public'`): entram como valor fixo no build. Só `SITE_URL` é de contexto `client` e pode chegar ao navegador; as outras públicas ficam no servidor.
- **Segredos** (`access: 'secret'`, contexto `server`): lidos no servidor, durante o build das páginas estáticas ou na Vercel Function. O Astro recusa importar `astro:env/server` em código de cliente, então um segredo não chega ao bundle.
- **Variável vazia conta como ausente.** Uma obrigatória ausente ou um valor inválido derruba o build com `EnvInvalidVariables`, listando cada variável e o problema.

### Onde vive cada variável

| Variável                | Tipo    | Obrigatória     | Local (`web/.env*`) | Vercel Production                 | Vercel Preview e Development | GitHub Actions           | Dona         |
| ----------------------- | ------- | --------------- | ------------------- | --------------------------------- | ---------------------------- | ------------------------ | ------------ |
| `SITE_URL`              | pública | em produção     | opcional            | `https://ronrom-blog.vercel.app`  | não definida (\*)            | variável, não cadastrada | `area:infra` |
| `STUDIO_URL`            | pública | não (padrão)    | opcional            | não definida                      | não definida                 | não usada                | `area:cms`   |
| `SANITY_PROJECT_ID`     | pública | em produção     | opcional            | `fq2685cq`                        | `fq2685cq`                   | não usada (fixtures)     | `area:cms`   |
| `SANITY_DATASET`        | pública | em produção     | opcional            | `production`                      | `development`                | não usada (fixtures)     | `area:cms`   |
| `SANITY_API_VERSION`    | pública | não (padrão)    | opcional            | não definida                      | não definida                 | não usada                | `area:cms`   |
| `SANITY_FIXTURES`       | pública | não (`false`)   | opcional            | proibida (`true` derruba o build) | não definida                 | não usada                | `area:cms`   |
| `SANITY_API_READ_TOKEN` | segredo | não             | opcional            | Secret                            | Secret                       | Secret, já cadastrado    | `area:cms`   |
| `KV_REST_API_URL`       | segredo | não (até a #56) | opcional            | injetada pelo Marketplace (#56)   | injetada pelo Marketplace    | não usada                | `area:dados` |
| `KV_REST_API_TOKEN`     | segredo | não (até a #56) | opcional            | injetada pelo Marketplace (#56)   | injetada pelo Marketplace    | não usada                | `area:dados` |
| `VERCEL_GIT_COMMIT_SHA` | pública | não             | não definida        | sistema da Vercel                 | sistema da Vercel            | não usada                | `area:infra` |

(\*) Sem `SITE_URL`, o `astro.config.mjs` usa `https://` + `VERCEL_URL` nos previews (a URL do próprio deploy) e `https://ronrom-blog.vercel.app` no resto (local e CI). `VERCEL_ENV` e `VERCEL_URL` são variáveis de sistema da Vercel, expostas no build sem cadastro.

**Dona** é a área (label) que decide o nome, o formato e o valor da variável. Quem cadastra segredos na Vercel e no GitHub é sempre o dono do repositório, porque o valor não deve passar por outras mãos.

- **`STUDIO_URL`** é o link "Área da autora" do rodapé (#15). O padrão (`https://ronrom.sanity.studio`) é o Studio publicado; só precisa ser cadastrada se o Studio mudar de endereço.
- **`SANITY_API_READ_TOKEN`** é o token `viewer` do Sanity, só para o preview de rascunhos (#43). Sem ele, o site lê só o conteúdo publicado. Cadastrado na Vercel como **Secret** em Production e Preview (29/10/2026).
- **`KV_REST_API_URL` e `KV_REST_API_TOKEN`** são os nomes que o `Redis.fromEnv()` do `@upstash/redis` lê. A #56 confere, ao instalar o Upstash Redis pelo Marketplace, se a integração injeta exatamente esses nomes; se não, renomeia no schema, no `.env.example` e aqui.
- **`VERCEL_GIT_COMMIT_SHA`** é variável de sistema da Vercel, sem cadastro. Entra no schema só para o `/api/health` ler o commit pelo `astro:env`.
- **Os tokens do Studio** (`SANITY_AUTH_TOKEN`) e as variáveis `SANITY_STUDIO_*` não são do site: veja [`studio/README.md`](../studio/README.md).

### Sem o Sanity configurado: fixtures

Fora de produção, sem `SANITY_PROJECT_ID` e `SANITY_DATASET` (ou com `SANITY_FIXTURES=true`), o build usa as fixtures locais em vez de quebrar. Quem decide é [`web/src/lib/sanity/config.ts`](../web/src/lib/sanity/config.ts) (`fonteDoConteudo`), que o cliente e as fixtures da #33 vão ler. Em produção (`VERCEL_ENV=production`), as duas variáveis são obrigatórias e `SANITY_FIXTURES=true` derruba o build, para o site nunca sair com conteúdo de exemplo.

### GitHub Actions

O build do CI roda com as fixtures, sem rede e sem segredo, então não precisa de nenhuma variável do Sanity. Ele repassa só `vars.SITE_URL` (não cadastrada; vale o padrão). Os Secrets `SANITY_API_READ_TOKEN` e `SANITY_AUTH_TOKEN` já existem em Settings → Secrets and variables → Actions, para o backup (#28) e o deploy do Studio. Se um workflow passar a precisar de um segredo, ele também deve ser cadastrado em Settings → Secrets and variables → Dependabot (veja o [CONTRIBUTING](../CONTRIBUTING.md#dependências-dependabot)).

### Puxar as variáveis da Vercel para o local

Com a [Vercel CLI](https://vercel.com/docs/cli) logada na conta do dono do projeto, dentro de `web/`:

```bash
vercel link --project ronrom
```

```bash
vercel env pull .env.local
```

O `link` é feito uma vez e cria `web/.vercel/` (não versionado). O `env pull` traz as variáveis do ambiente **Development** para `web/.env.local`, que o Astro lê sozinho; para outro ambiente, use `--environment=preview` ou `--environment=production`. Segredos podem chegar vazios no pull; nesse caso o site segue sem o recurso opcional (o preview de rascunhos, por exemplo). Para sobrescrever algo só na sua máquina, use `web/.env`, que tem prioridade menor que o `.env.local`, ou edite o próprio `.env.local`.
