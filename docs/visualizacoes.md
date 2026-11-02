# Contador de visualizações

O "Mais lidos" (#57) ordena os posts pelo total de visualizações de todo o tempo (decidido na #1). Quem conta é a rota sob demanda [`/api/views`](../web/src/pages/api/views.ts) (#56), que grava num Upstash Redis instalado pelo Marketplace da Vercel. Não há chave por dia nem por mês: um único ranking.

## Como uma visualização é contada

1. A página do post traz o [`RegistroDeVisualizacao`](../web/src/components/post/RegistroDeVisualizacao.astro), com o `_id` do post.
2. Depois de **5 segundos com a aba visível** (trocar de aba pausa a contagem), o script manda `{"id":"<_id>"}` para `POST /api/views` com `navigator.sendBeacon` e marca o post no `sessionStorage`. Na mesma aba, o post não é mandado de novo. Sem JS, nada é contado.
3. A rota ([`registrar.ts`](../web/src/lib/views/registrar.ts)) descarta, sem tocar no Redis:
   - qualquer deploy que não seja o de produção (`VERCEL_ENV` diferente de `production`): previews e `pnpm dev`;
   - requisições sem `User-Agent` ou com um `User-Agent` de bot, segundo o [`isbot`](https://github.com/omrilotan/isbot) (inclui `curl`);
   - um `id` fora da lista de posts publicados, que é gerada no build e embutida na função ([`ids-publicados.ts`](../web/src/lib/sanity/ids-publicados.ts)). Um post novo só conta depois do rebuild que o publica.
4. Para não contar a mesma pessoa duas vezes: `SET seen:{sha256(ip|ua|id|sal)} 1 NX EX 1800`. O sal é o token do Upstash mais o dia em São Paulo, então o IP nunca fica em claro e o hash não pode ser revertido testando todos os IPs. A chave expira em 30 minutos. Na virada do dia o sal muda, e quem estiver relendo um post à meia-noite pode contar de novo.
5. Se o `SET` criou a chave (visualização nova): `ZINCRBY views:all 1 <_id>`.

A resposta é **sempre `204`**, sem corpo e com `Cache-Control: no-store`, conte ou não. Um erro do Redis (fora do ar, cota estourada) vai para o log da função com o prefixo `[views]` e a visualização se perde; a página não percebe. Uma requisição cross-site com `Content-Type` de formulário (como `text/plain`, que é o que o `sendBeacon` manda) recebe `403` do próprio Astro (`security.checkOrigin`), antes de chegar à rota.

A rota fala com a API REST do Upstash direto, com `fetch`, sem o `@upstash/redis`: são só dois comandos.

## Mais lidos

O período do ranking é **todo o tempo** (decidido na #1): a aba mostra os posts com mais visualizações desde que o contador existe, sem janela de 7 ou 30 dias.

O site só é reconstruído quando há publicação, então um ranking calculado no build ficaria velho. Por isso ele é buscado no navegador, e a aba padrão da home continua sendo "Últimos posts", que sai no HTML (boa para SEO):

1. **No build**, o [`/posts-index.json`](../web/src/pages/posts-index.json.ts) sai com um item por post publicado, do mais recente para o mais antigo: `id` (o `_id`), `url`, `titulo`, `subtitulo`, `capa` (uma miniatura 4:3 de 480 px), `alt`, `tipo`, `categoria` (a categoria ou o formato), `nota`, `data` e `leitura` ([`indice-de-posts.ts`](../web/src/lib/indice-de-posts.ts)).
2. **Na rota sob demanda** [`GET /api/mais-lidos?limite=10`](../web/src/pages/api/mais-lidos.ts), um comando: `ZREVRANGE views:all 0 19 WITHSCORES`. A rota lê 10 a mais que o `limite`, descarta os ids que não estão publicados neste deploy e responde `[{ "id": "…", "views": 12 }, …]` com `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` ([`ranking.ts`](../web/src/lib/views/ranking.ts)). Sem o Redis configurado (previews, `pnpm dev`), responde `[]`.
3. **No navegador**, o [`MaisLidos.astro`](../web/src/components/home/MaisLidos.astro) só busca quando a aba abre pela primeira vez: pede os dois JSONs, junta pelo `id`, descarta ids que não estão no índice e, com menos de 10, completa com os mais recentes que ainda não entraram ([`mais-lidos.ts`](../web/src/lib/mais-lidos.ts)). Com erro, mostra o estado de erro; voltar para a aba tenta de novo.

A rota só aceita `?limite=N`, com N de 1 a 20, e nenhum outro parâmetro: o CDN guarda uma cópia por query string, e um `?x=` diferente a cada pedido faria cada um chegar ao Redis. Fora disso, responde `400` com `no-store`, sem tocar no Redis. Um erro do Redis vira `503` com `no-store` (o CDN não guarda) e uma linha `[mais-lidos]` no log, e a aba mostra o estado de erro.

## Custo

| Recurso                             | Por visualização                 | Cota grátis                             | Margem                             |
| ----------------------------------- | -------------------------------- | --------------------------------------- | ---------------------------------- |
| Comandos do Upstash                 | 2 se nova, 1 se repetida         | 500 mil/mês, 256 MB, 1 banco            | cerca de 250 mil visualizações/mês |
| Invocações de função (Vercel Hobby) | 1 por beacon, inclusive de bots  | 1 milhão/mês, junto com as outras rotas | sobra bem mais que a do Upstash    |
| Memória do Redis                    | uma chave `seen:` por 30 minutos | 256 MB                                  | o ranking tem uma entrada por post |

O "Mais lidos" quase não pesa: a resposta da `/api/mais-lidos` fica uma hora no CDN da Vercel, então o Redis recebe **no máximo uma leitura por hora** (cerca de 24 por dia, cerca de 720 comandos por mês), não importa quantas vezes a aba é aberta. Na hora seguinte, o primeiro pedido ainda recebe a cópia antiga (`STALE`) enquanto o CDN busca a nova em segundo plano. Cada região do CDN tem o próprio cache, mas com as funções em `gru1` e o público no Brasil, na prática é uma.

Cota do Upstash conferida em [upstash.com/pricing/redis](https://upstash.com/pricing/redis); confira no painel se o plano grátis pelo Marketplace é o mesmo e se há arquivamento por inatividade. Se a cota estourar, o Upstash recusa os comandos, a rota registra o erro no log e o site segue normal; só o ranking para de subir até o mês virar.

## Provisionar o Upstash (dono do repositório)

1. No painel da Vercel, projeto `ronrom` → **Storage** → **Create Database** → **Upstash for Redis** (Marketplace).
2. Plano **Free**, região **São Paulo (`sa-east-1`)**, perto das functions em `gru1` (`web/vercel.json`). Se a região não estiver disponível, use `us-east-1` e mude `regions` para `iad1`, para a função ficar perto do banco.
3. Ligue o banco ao projeto `ronrom` só no ambiente **Production**: os previews não contam, então não precisam do banco.
4. Confira em **Settings → Environment Variables** que a integração criou `KV_REST_API_URL` e `KV_REST_API_TOKEN`, os nomes do schema em [`web/astro.config.mjs`](../web/astro.config.mjs). Se vierem com outro nome, renomeie no schema, no [`web/.env.example`](../web/.env.example) e no [`ambientes.md`](ambientes.md#onde-vive-cada-variável).
5. Faça um redeploy da produção, para a função ler as variáveis.

Sem as duas variáveis, a rota segue respondendo `204` e não grava nada.

## Conferir em produção

No console do Upstash (aba **Data Browser** ou **CLI**), com o `_id` de um post:

1. Abra o post numa aba anônima e espere 5 segundos. No DevTools (aba Network), aparece o `POST /api/views` com `204`. `ZSCORE views:all <_id>` sobe 1.
2. Recarregue o post: não há outro beacon (o `sessionStorage` já marcou). Numa aba anônima nova, dentro de 30 minutos, o beacon sai mas o `ZSCORE` não muda.
3. Um bot e um `id` inválido não gravam nada (o `ZSCORE` não muda):

   ```bash
   curl -i -X POST https://ronrom.blog/api/views -H 'Content-Type: application/json' -A 'Googlebot/2.1' -d '{"id":"<_id>"}'
   ```

   ```bash
   curl -i -X POST https://ronrom.blog/api/views -H 'Content-Type: application/json' -A 'Mozilla/5.0' -d '{"id":"nao-existe"}'
   ```

Para ver o ranking inteiro: `ZRANGE views:all 0 -1 REV WITHSCORES`.

### Mais lidos

1. Na home, abra a aba "Mais lidos". No DevTools aparecem o `GET /posts-index.json` e o `GET /api/mais-lidos?limite=10`, e a ordem da lista bate com o `ZRANGE views:all 0 9 REV WITHSCORES`. Um post despublicado não aparece, mesmo que ainda esteja no ranking.
2. O cache, pelo `x-vercel-cache`: o primeiro pedido depois do deploy é `MISS`, os seguintes, por uma hora, `HIT`, e depois `STALE` uma vez (a cópia antiga, enquanto a nova é buscada).

   ```bash
   curl -sI https://ronrom.blog/api/mais-lidos?limite=10 | grep -iE 'x-vercel-cache|cache-control|age'
   ```

3. Para conferir o critério de "no máximo cerca de 24 leituras por dia": no console do Upstash, em **Usage**, os comandos de leitura do dia ficam na casa das dezenas, por mais que a home seja aberta.
4. Um parâmetro estranho não chega ao Redis: `curl -i 'https://ronrom.blog/api/mais-lidos?limite=10&x=1'` responde `400`.
