# Testes

O que é conferido automaticamente, o que é conferido à mão e como escrever os testes do site. Definido na #16 (QA-04).

## Estratégia

Poucos testes, nos lugares certos:

- **Teste unitário só onde existe lógica pura que pode quebrar sem ninguém ver:** cálculos, formatação e mapeamentos. Uma data no dia errado ou uma URL canônica com barra sobrando passam despercebidas no preview e só aparecem no Google semanas depois.
- **Componente só é testado quando tem lógica condicional relevante:** hoje, apenas a nota em corações e a ficha da review. O resto é markup e já é coberto pelo E2E, pelo axe e pela revisão visual.
- **Sem teste de snapshot de HTML inteiro** e sem teste do que o próprio Astro ou o Sanity garantem.
- **O teste nasce no PR do utilitário.** As issues que criam utilitários (#33, #34, #40, #51) escrevem os testes junto, cobrindo os [casos listados abaixo](#casos-por-utilitário).

## O que é automático e o que é manual

| Verificação                                         | Ferramenta                      | Onde roda                                    | Bloqueia o merge?        | Issue    |
| --------------------------------------------------- | ------------------------------- | -------------------------------------------- | ------------------------ | -------- |
| Formatação, lint e tipos                            | Prettier, ESLint, `astro check` | `ci / quality`, em todo PR                   | sim                      | #5       |
| Testes unitários e de componente                    | Vitest + Container API do Astro | `ci / unit`, em todo PR                      | sim                      | #16      |
| Build (variáveis, rotas, `urlDoPost` com slug ruim) | `astro build`                   | `ci / build`, em todo PR                     | sim                      | #5       |
| Links internos e âncoras                            | lychee no HTML do build         | `ci / links`, em todo PR                     | depois de estabilizar    | #45      |
| Smoke E2E dos caminhos principais                   | Playwright                      | Contra o preview da Vercel e a produção      | sim (check do PR)        | #49      |
| Acessibilidade automatizada (WCAG 2.1 AA)           | `@axe-core/playwright`          | Junto com o E2E                              | sim (serious/critical)   | #49      |
| Performance, SEO e boas práticas                    | Lighthouse CI                   | Contra o preview da Vercel                   | sim (exceto Performance) | #60      |
| Links externos quebrados nos posts                  | lychee contra o sitemap         | Cron semanal, abre issue                     | não                      | #62      |
| Dispositivos reais (iPhone/Safari, Android/Chrome)  | à mão                           | Antes do lançamento e em mudança visual      | —                        | #67      |
| Leitor de tela (NVDA, VoiceOver, TalkBack)          | à mão                           | Auditoria (#48) e checklist de go-live (#67) | —                        | #48, #67 |
| Revisão visual em 320, 768 e 1280px                 | à mão, prints no PR             | Em todo PR que muda algo visual              | —                        | —        |
| Fluxo da autora (publicar no Studio e ver no site)  | à mão, com a autora             | Onboarding e go-live                         | —                        | #31, #67 |
| Prévia de link (WhatsApp, Instagram, Telegram)      | à mão                           | Go-live                                      | —                        | #67      |

O que fica no manual é o que uma ferramenta não julga bem: se o leitor de tela anuncia a nota de um jeito que faz sentido, se o layout está bonito num celular de verdade, se a autora consegue publicar sem ajuda. O axe e o Lighthouse pegam regressões, mas não substituem essas passadas.

## Como rodar

Na raiz do repositório:

```bash
pnpm test
```

```bash
pnpm test:watch
```

O `pnpm test` roda o `test` de todo workspace que tiver o script (hoje, `web` e `studio`) e precisa passar em menos de 1 minuto, localmente e no CI. O `pnpm test:watch` roda os testes do site de novo a cada arquivo salvo. Para rodar um arquivo só, de dentro de `web/` ou `studio/`: `pnpm exec vitest run src/lib/rotas.test.ts`.

## Como escrever um teste

- **Onde:** em `web/src/**/*.test.ts` (site) ou `studio/lib/**/*.test.ts` (funções puras do Studio, como o `slugify`), ao lado do arquivo testado (`rotas.ts` e `rotas.test.ts`). Arquivos fora desse padrão não rodam.
- **Imports explícitos** de `vitest` (`describe`, `it`, `expect`), sem globais.
- **Nomes em português**, descrevendo o comportamento: `it('não vira o dia seguinte às 23h30 de Brasília')`.
- **Alias e módulos virtuais funcionam:** a config ([`web/vitest.config.ts`](../web/vitest.config.ts)) usa o `getViteConfig` do Astro, então `@/…`, `astro:env/client` e `astro:assets` resolvem como no build.
- **URL base fixa:** teste que depende da `SITE_URL` (como o de `canonicalUrl`) não pode depender do `web/.env` de quem roda. Fixe o valor com um mock:

  ```ts
  import { vi } from 'vitest';

  vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));
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

Só para os componentes listados em [Componentes](#componentes). Use a [Container API](https://docs.astro.build/en/reference/container-reference/) do Astro para renderizar o `.astro` como string e conferir o HTML:

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

## Casos por utilitário

Cada item abaixo vira pelo menos um `it` no PR da issue indicada. Quem implementa pode acrescentar casos; tirar um caso pede um PR que atualize este doc.

### Tempo de leitura: `tempoDeLeitura(portableText)` (#34)

- [ ] Texto vazio (`[]`, `undefined` ou só blocos sem texto) devolve `"1 min de leitura"`, o mínimo.
- [ ] Só imagens, vídeos e embeds, sem texto: `"1 min de leitura"`. Legendas e `alt` não contam como palavras.
- [ ] Texto curto (menos de 200 palavras): `"1 min de leitura"`.
- [ ] Arredonda para cima: 201 palavras dão `"2 min de leitura"`; 400, `"2 min de leitura"`.
- [ ] Texto longo (por exemplo, 2.000 palavras): `"10 min de leitura"`.
- [ ] Conta palavras de todos os blocos de texto (parágrafos, títulos, listas, citações) e de todos os `children` de um bloco, inclusive com marcas (negrito, link).
- [ ] Espaços repetidos, quebras de linha e pontuação solta não contam como palavras.

### Datas em pt-BR: `formatarData(iso)` (#34)

- [ ] `2026-03-14T12:00:00-03:00` vira `"14 de março de 2026"` (mês por extenso e minúsculo).
- [ ] **Virada de dia:** `2026-03-14T23:30:00-03:00` (23h30 em Brasília, já 15/03 em UTC) continua `"14 de março de 2026"`. Com o fuso de teste em UTC, esse caso falha se a formatação usar UTC ou o fuso da máquina.
- [ ] O mesmo instante escrito em UTC (`2026-03-15T02:30:00Z`) dá o mesmo resultado.
- [ ] Virada de ano: `2026-12-31T23:30:00-03:00` é `"31 de dezembro de 2026"`.
- [ ] Data inválida (`''`, `'ontem'`) lança erro, em vez de mostrar `"Invalid Date"`.

### Slugs e URLs (#18, #33)

O `slugify` compartilhado (#18):

- [ ] `"Café com Pão"` vira `"cafe-com-pao"` (acentos e cedilha removidos, minúsculas, espaço vira hífen).
- [ ] Todos os exemplos da tabela de [slugs do `seo-urls.md`](seo-urls.md#formato), incluindo `"Ação & aventura!"` → `"acao-aventura"`.
- [ ] Hífens repetidos viram um só, sem hífen no começo nem no fim; o resultado sempre casa com `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

Os helpers de `rotas.ts` (#33):

- [ ] Todos os exemplos da tabela de [exemplos do `seo-urls.md`](seo-urls.md#exemplos-viram-casos-de-teste), um `it` por linha.
- [ ] **Barra final consistente:** nenhum helper devolve caminho terminado em `/`, salvo a home; `canonicalUrl('/sobre/')`, `canonicalUrl('/sobre/index.html')` e `canonicalUrl('/sobre')` dão o mesmo resultado.
- [ ] **URL canônica absoluta:** a origem vem da `SITE_URL` (mockada no teste), funciona com e sem barra no fim dela, e a query string e o `#fragmento` saem.
- [ ] **Paginação:** `urlDaPagina(base, 1)` é a própria `base`; `2` em diante vira `{base}/pagina/{n}`; `0`, `-1`, `1.5` e `NaN` lançam erro.
- [ ] `urlDoPost` lança erro sem slug, sem categoria (review) ou sem formato (pensamento), e com slug fora do formato (`"Dias Perfeitos"`, `"pagina"`).

### Consultas GROQ (#25)

As consultas de [`web/src/lib/sanity/consultas.ts`](../web/src/lib/sanity/consultas.ts) rodam com o `groq-js` num dataset montado no teste, com o "agora" fixo:

- [ ] Nenhuma consulta devolve rascunho (`drafts.*`), versão de release (`versions.*`) ou post com data no futuro.
- [ ] Listagens em ordem do mais recente, com a fatia da página e o total; categoria, formato ou tag inexistente vem `null`.
- [ ] O post só é achado no tipo e na categoria (ou formato) certos, com a ficha do modelo da categoria e sem tags fora do ar.
- [ ] Destaque com e sem escolha nas configurações, "Leia também" na ordem de prioridade, redirects e sitemap.

### Seed de desenvolvimento (#26)

O seed grava direto pela API, sem a validação do Studio. Os testes de [`studio/lib/seed.test.ts`](../studio/lib/seed.test.ts) conferem o conteúdo de exemplo com as mesmas regras:

- [ ] A trava aceita só o dataset `development`, e o filtro do `--reset` (rodado no `groq-js`) pega `seed-*` e `drafts.seed-*`, nunca a taxonomia, os singletons ou um `_id` que só contém `seed`.
- [ ] Uma review por categoria e um pensamento por formato, com frase curta, texto longo, post sem subtítulo e um post com todos os blocos do texto.
- [ ] Cada post passa nas regras de slug, nota, data, ficha do modelo da categoria, vídeo e galeria; toda referência aponta para um documento do seed ou da taxonomia, e todo objeto em array tem `_key`.
- [ ] Duas chamadas devolvem os mesmos documentos (o seed não usa a hora atual).

### Nota em corações (#35)

A conversão da nota para corações fica numa função pura, usada pelo `Coracoes.astro` e pelo JSON-LD (#51):

- [ ] Todas as notas válidas, de `0.5` a `5` em passos de `0.5` (10 casos, com `it.each`), dão o número certo de corações cheios, meios e vazios, sempre 5 no total.
- [ ] `4.5` dá 4 cheios, 1 meio e 0 vazios; `0.5` dá 0 cheios, 1 meio e 4 vazios; `5` dá 5 cheios.
- [ ] Valor inválido (`0`, `5.5`, `4.3`, `-1`, `NaN`, ausente) lança erro, para a review não sair com nota errada.
- [ ] Texto acessível com vírgula decimal: `"Nota: 4,5 de 5 corações"`, `"Nota: 5 de 5 corações"` (sem `,0`).

### Categoria para tipo do JSON-LD (#51)

- [ ] Uma linha por categoria (com `it.each`), com fixture de ficha preenchida: `filmes` → `Movie`, `series` → `TVSeries`, `livros` → `Book`, `restaurantes-e-cafes` → `Restaurant` ou `CafeOrCoffeeShop`, `lugares` → `TouristAttraction`, `comidas` → `Product` (com marca) ou `Thing`.
- [ ] Fallback: categoria desconhecida vira `Thing`, sem quebrar o build.
- [ ] Campos vazios da ficha não aparecem no JSON-LD (sem `"director": undefined` nem string vazia).
- [ ] `reviewRating` usa a mesma nota da função dos corações, com `bestRating: 5` e `worstRating: 0.5`, e não há `AggregateRating`.

### ID de vídeo do YouTube (#40)

- [ ] Extrai o ID (11 caracteres) dos formatos `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`, `youtube.com/embed/ID` e `youtube-nocookie.com/embed/ID`.
- [ ] Aceita `www.` e `m.`, `http` e `https`, e ignora parâmetros extras (`&t=42s`, `?si=…`, `&list=…`) em qualquer posição.
- [ ] URL que não é do YouTube, URL sem ID ou ID com tamanho errado devolve `null` (ou lança erro, conforme a #40 decidir), nunca um ID errado.

### Componentes

Teste de componente (Container API) existe só para estes dois:

- **`Coracoes.astro` (#35):** um único `role="img"` com o `aria-label` da nota, os SVGs internos com `aria-hidden="true"`, e o número de corações cheios, meios e vazios renderizados para `4.5` e `5`.
- **`FichaDaReview.astro` (#42):** os rótulos certos para cada modelo de ficha (filme, série, livro, lugar, comida), campos vazios ocultos (sem `<dt>` sem `<dd>`), a nota em corações presente e nada renderizado para quem não é review.
