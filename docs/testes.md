# Testes

O que é conferido automaticamente, o que é conferido à mão e como escrever os testes do site.

## Estratégia

Poucos testes, nos lugares certos:

- **Teste unitário só onde existe lógica pura que pode quebrar sem ninguém ver:** cálculos, formatação e mapeamentos. Uma data no dia errado ou uma URL canônica com barra sobrando passam despercebidas no preview e só aparecem no Google semanas depois.
- **Componente só é testado quando tem lógica condicional relevante:** hoje, apenas o `<Seo>`, a nota em corações, a ficha da review, o texto do post, as abas e o script do analytics. O resto é markup, coberto pelo Lighthouse e pela revisão visual.
- **Sem teste de snapshot de HTML inteiro** e sem teste do que o próprio Astro ou o Sanity garantem.
- **O teste nasce no PR do utilitário**, ao lado do arquivo testado. Os próprios arquivos `*.test.ts` são a lista de casos: o nome de cada `it` descreve o comportamento.

## O que é automático e o que é manual

| Verificação                                         | Ferramenta                      | Onde roda                                  | Bloqueia o merge?        |
| --------------------------------------------------- | ------------------------------- | ------------------------------------------ | ------------------------ |
| Formatação, lint e tipos                            | Prettier, ESLint, `astro check` | `ci / quality`, em todo PR                 | sim                      |
| Testes unitários e de componente                    | Vitest + Container API do Astro | `ci / unit`, em todo PR                    | sim                      |
| Build (variáveis, rotas, `urlDoPost` com slug ruim) | `astro build`                   | `ci / build`, em todo PR                   | sim                      |
| Build com o conteúdo de `production` (redirects)    | `astro build`                   | `ci / build-producao`, em todo PR          | sim                      |
| Página 404 servida com status 404                   | `scripts/conferir-404.mjs`      | `ci / build`, depois do build              | sim                      |
| Links internos e âncoras                            | lychee no HTML do build         | `ci / links`, em todo PR                   | ainda não                |
| Performance, acessibilidade, SEO e boas práticas    | Lighthouse CI                   | `lighthouse`, no preview e em produção     | sim (exceto Performance) |
| Links externos quebrados nos posts                  | lychee contra o sitemap         | `links-externos`, toda segunda, abre issue | não                      |
| Dispositivos reais e leitor de tela                 | à mão                           | Em mudança visual ou de interação          | —                        |
| Revisão visual em 320, 768 e 1280px                 | à mão, prints no PR             | Em todo PR que muda algo visual            | —                        |

Metas, orçamento e como ler o resultado do Lighthouse CI: [`performance.md`](performance.md).

O que fica no manual é o que uma ferramenta não julga bem: se o leitor de tela anuncia a nota de um jeito que faz sentido, se o layout está bonito num celular de verdade, se a autora consegue publicar sem ajuda. O Lighthouse pega regressões, mas não substituem essas passadas.

## Como rodar

Na raiz do repositório:

```bash
pnpm test
```

```bash
pnpm test:watch
```

O `pnpm test` roda o `test` de todo workspace que tiver o script (hoje, `web` e `studio`) e precisa passar em menos de 1 minuto, localmente e no CI. O `pnpm test:watch` roda os testes do site de novo a cada arquivo salvo. Para rodar um arquivo só, de dentro de `web/` ou `studio/`: `pnpm exec vitest run src/lib/rotas.test.ts`.

## Links internos

O job `ci / links` roda o [lychee](https://lychee.cli.rs/) no HTML que o `ci / build` publicou como artifact (`web-dist`), sem buildar de novo e sem rede. Ele confere:

- todo link que começa com `/` (navegação, cards, paginação, CSS, fontes e ícones) aponta para um arquivo do build ou para uma pasta com `index.html`;
- todo link absoluto para o próprio site (o canonical e o RSS, por exemplo) também, porque a `SITE_URL` é remapeada para a pasta do build;
- toda âncora (`#conteudo`, `/sobre#autora`) existe como `id` na página de destino.

Links externos ficam de fora: são checados toda semana, em produção (veja [Links externos](#links-externos)). O relatório sai no resumo da execução (Actions → a execução do `ci` → Summary).

**Ainda não bloqueia o merge.** O passo do lychee tem `continue-on-error: true`: com link quebrado, o check fica verde e a execução mostra um aviso. Quando o relatório estiver limpo por alguns PRs (páginas de post e RSS no ar), apague essa linha do [`ci.yml`](../.github/workflows/ci.yml) para o job passar a falhar.

**Exclusões** ficam no [`lychee.toml`](../lychee.toml), cada uma com o motivo e, se temporária, a issue que a remove. Página que ainda não existe não entra na lista: ela é exatamente o que o relatório deve mostrar.

Para rodar localmente, com o [lychee instalado](https://lychee.cli.rs/installation/), depois do `pnpm build`, na raiz do repositório (Git Bash no Windows):

```bash
lychee --root-dir "$PWD/web/dist/client" --remap "^https://ronrom\.blog(/.*)?$ file://$PWD/web/dist/client\${1}" web/dist/client
```

## Links externos

O workflow [`links-externos`](../.github/workflows/links-externos.yml) roda toda segunda às 06:23 (Brasília) e pode ser rodado à mão em Actions → links-externos → Run workflow. Ele lista as páginas do sitemap de produção (`/sitemap-index.xml`) e passa ao lychee, que baixa cada uma e checa todos os links dela, externos e internos. A configuração é o [`lychee-externos.toml`](../lychee-externos.toml), com rede, tentativas repetidas e user agent de navegador.

O resultado fica na issue **"Links quebrados"** (labels `area:qa` e `prioridade:media`):

- **com link quebrado:** abre a issue ou, se já houver uma aberta, troca a lista e comenta. O relatório agrupa os erros pela página de origem, então dá para ir direto ao post;
- **sem link quebrado:** fecha a issue aberta, com um comentário;
- **erro na execução** (sitemap fora do ar, configuração inválida): o workflow falha e a issue não muda. O GitHub avisa por e-mail quem configurou o agendamento.

Link quebrado de verdade se corrige no post, no Studio; a issue fecha sozinha na checagem seguinte (ou rode o workflow à mão). Não feche a issue à mão com o link ainda quebrado: a próxima execução abre outra.

**Sites que bloqueiam robôs** (Instagram e Threads com 429 ou login, LinkedIn com 999, Facebook, X e TikTok) ficam nas exclusões do `lychee-externos.toml`, cada um com o motivo. Se um link aparece na issue mas abre normalmente no navegador, inclua o site lá. A resposta 429 (muitas requisições) é aceita para qualquer site, porque é limite de taxa, não link quebrado.

Para rodar localmente, com o [lychee instalado](https://lychee.cli.rs/installation/), na raiz do repositório (Git Bash no Windows):

```bash
lychee --config lychee-externos.toml $(curl -fsS https://ronrom.blog/sitemap-0.xml | grep -o '<loc>[^<]*</loc>' | sed -e 's|<loc>||' -e 's|</loc>||')
```

## Como escrever um teste

- **Onde:** em `web/src/**/*.test.ts` (site) ou `studio/lib/**/*.test.ts` (funções puras do Studio, como o `slugify`), ao lado do arquivo testado (`rotas.ts` e `rotas.test.ts`). Arquivos fora desse padrão não rodam.
- **Imports explícitos** de `vitest` (`describe`, `it`, `expect`), sem globais.
- **Nomes em português**, descrevendo o comportamento: `it('não vira o dia seguinte às 23h30 de Brasília')`.
- **Alias e módulos virtuais funcionam:** a config ([`web/vitest.config.ts`](../web/vitest.config.ts)) usa o `getViteConfig` do Astro, então `@/…`, `astro:env/client` e `astro:assets` resolvem como no build.
- **URL base fixa:** teste que depende da `SITE_URL` (como o de `canonicalUrl`) não pode depender do `web/.env` de quem roda. Fixe o valor com um mock:

  ```ts
  import { vi } from 'vitest';

  vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom.blog' }));
  ```

- **Fuso horário:** os testes rodam sempre em UTC (`TZ=UTC` no `vitest.config.ts`), como o build da Vercel. Assim, uma data formatada sem `timeZone: 'America/Sao_Paulo'` quebra o teste também numa máquina em Brasília, e não só no CI. O [`ambiente.test.ts`](../web/src/ambiente.test.ts) falha se essa configuração sumir.
- **Sem rede:** nenhum teste chama o Sanity, o YouTube ou outro serviço. Use as [fixtures](../web/src/lib/sanity/README.md#modo-fixtures) ou objetos montados no próprio teste. Para ler as fixtures pelas funções de `conteudo.ts`, ligue o modo fixtures com um mock, como no [`conteudo.test.ts`](../web/src/lib/sanity/conteudo.test.ts):

  ```ts
  vi.mock('astro:env/server', () => ({
    SANITY_FIXTURES: true,
    SANITY_PROJECT_ID: undefined,
    SANITY_DATASET: undefined,
    SANITY_API_VERSION: '2025-02-19',
  }));
  ```

### Teste de componente

Só para componentes com lógica condicional (hoje `Seo`, `Coracoes`, `FichaDaReview`, `Abas`, `Umami` e `CorpoDoPost`). Use a [Container API](https://docs.astro.build/en/reference/container-reference/) do Astro para renderizar o `.astro` como string e conferir o HTML:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Coracoes from '@/components/ui/Coracoes.astro';

describe('<Coracoes>', () => {
  it('anuncia a nota com vírgula decimal', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Coracoes, { props: { nota: 4.5 } });

    expect(html).toContain('aria-label="Nota: 4,5 de 5 corações"');
  });
});
```

Confira atributos e textos que importam (`aria-label`, `role`, rótulos visíveis), não a estrutura inteira do HTML.
