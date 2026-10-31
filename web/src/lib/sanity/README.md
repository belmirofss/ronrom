# Conteúdo do Sanity

Como o site lê o conteúdo do Sanity no build:

| Arquivo                                    | O que tem                                                                       | Issue |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ----- |
| [`conteudo.ts`](conteudo.ts)               | As funções de acesso (`buscarPost`, `buscarUltimos`...): **o que páginas usam** | #33   |
| [`imagem.ts`](imagem.ts)                   | As URLs do CDN de uma imagem (`fontesDaImagem`), usadas pelo `<ImagemSanity>`   | #34   |
| [`consultas.ts`](consultas.ts)             | Todas as consultas GROQ, escritas com `defineQuery`                             | #25   |
| [`tipos.gerados.d.ts`](tipos.gerados.d.ts) | Os tipos dos resultados, gerados pelo typegen: não edite à mão                  | #25   |
| [`cliente.ts`](cliente.ts)                 | O `consultar` do site, que escolhe entre o Sanity e as fixtures                 | #33   |
| [`config.ts`](config.ts)                   | De onde vem o conteúdo (`fonteDoConteudo`): Sanity ou fixtures                  | #8    |
| [`fonte.ts`](fonte.ts)                     | A regra da fonte e o `@sanity/client`, sem o `astro:env`                        | #53   |
| [`redirects.ts`](redirects.ts)             | O que os redirects do build buscam, chamado pelo `astro.config.mjs`             | #53   |
| [`fixtures/`](fixtures)                    | O dataset de exemplo do [modo fixtures](#modo-fixtures)                         | #33   |

## Funções de acesso

Páginas, componentes e endpoints importam só de `@/lib/sanity/conteudo` (as URLs de imagem, do [`imagem.ts`](#imagens), pelo `<ImagemSanity>`). O ESLint recusa importar `@sanity/client`, `groq-js`, o `cliente.ts` ou as fixtures fora desta pasta, e as URLs saem sempre de [`@/lib/rotas`](../rotas.ts) (veja [`docs/seo-urls.md`](../../../../docs/seo-urls.md#helpers-de-rota)).

```astro
---
import { urlDoPost } from '@/lib/rotas';
import { buscarRotasDosPosts } from '@/lib/sanity/conteudo';

const rotas = await buscarRotasDosPosts();
---

<ul>
  {rotas.map((rota) => (
    <li>
      <a href={urlDoPost(rota)}>{rota.slug}</a>
    </li>
  ))}
</ul>
```

| Função                                  | Consulta                          |
| --------------------------------------- | --------------------------------- |
| `buscarConfiguracoes()`                 | `CONSULTA_DAS_CONFIGURACOES`      |
| `buscarSobre()`                         | `CONSULTA_DO_SOBRE`               |
| `buscarDestaque()`                      | `CONSULTA_DO_DESTAQUE`            |
| `buscarUltimos(pagina?)`                | `CONSULTA_DOS_ULTIMOS_POSTS`      |
| `buscarPostsDoTipo(tipo, pagina?)`      | `CONSULTA_DOS_POSTS_DO_TIPO`      |
| `buscarPostsDaCategoria(slug, pagina?)` | `CONSULTA_DOS_POSTS_DA_CATEGORIA` |
| `buscarPostsDoFormato(slug, pagina?)`   | `CONSULTA_DOS_POSTS_DO_FORMATO`   |
| `buscarTaxonomia()`                     | `CONSULTA_DA_TAXONOMIA`           |
| `buscarListasDoAno()`                   | `CONSULTA_DAS_LISTAS_DO_ANO`      |
| `buscarAnosDasListas()`                 | `CONSULTA_DOS_ANOS_DAS_LISTAS`    |
| `buscarPost({ tipo, secao, slug })`     | `CONSULTA_DO_POST`                |
| `buscarRotasDosPosts()`                 | `CONSULTA_DAS_ROTAS_DOS_POSTS`    |
| `buscarLeiaTambem(id)`                  | `CONSULTA_DO_LEIA_TAMBEM`         |
| `buscarIndiceDePosts()`                 | `CONSULTA_DO_INDICE_DE_POSTS`     |
| `buscarSitemap()`                       | `CONSULTA_DO_SITEMAP`             |
| `CONSULTA_DO_FEED`                      | —                                 | Os 30 posts mais recentes, para o `/rss.xml`: rota, título, subtítulo, data, categoria ou formato, capa, texto dos blocos do corpo e `seo.descricao` (#52) |
| `buscarFeed()`                          | `CONSULTA_DO_FEED`                |

As listagens recebem o número da página (a partir de 1; o padrão é 1) e calculam a fatia com `fatiaDaPagina(n)`, a partir de `POSTS_POR_PAGINA` (12). `totalDePaginas(total)` diz quantas páginas gerar, com pelo menos uma.

Cada função devolve o tipo `<NOME_DA_CONSULTA>_RESULT` do typegen, passado explicitamente ao `consultar`. Não dá para deixar o `@sanity/client` achar o tipo sozinho pelo texto da consulta: as consultas paginadas são montadas com uma função (`PAGINA_DE_POSTS`), e o TypeScript vê o texto delas como `string`. Consulta nova ganha uma função nova aqui, com o tipo dela.

## Cliente

O `criarConsultar` do [`fonte.ts`](fonte.ts) cria o `@sanity/client`, e o [`cliente.ts`](cliente.ts) o usa com a fonte do `astro:env`. O cliente tem:

- **`apiVersion` fixa**, da `SANITY_API_VERSION` (padrão `2025-02-19`): uma mudança da API não muda o site sem um PR.
- **`useCdn: false`**: o build roda logo depois da publicação ([deploy hook](../../../../docs/deploy.md)) e precisa do conteúdo novo, que a API CDN pode levar alguns instantes para entregar. São poucas consultas por build.
- **`perspective: 'published'`**: nunca rascunho nem versão de release, além do filtro que as próprias consultas já fazem.
- **Sem token.** O conteúdo publicado é público; o token viewer (`SANITY_API_READ_TOKEN`) é só da [prévia de rascunhos](#prévia-de-rascunhos). O `cliente.ts` lê o `astro:env/server` (pelo `config.ts`), que o Astro recusa em código de navegador: o cliente, e o token da prévia, rodam só no servidor.

### Prévia de rascunhos

No build da prévia (`PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true`, só no projeto `ronrom-previa` da Vercel; veja [`docs/ambientes.md`](../../../../docs/ambientes.md#prévia-de-rascunhos-ronrom-previa)), o mesmo cliente muda três coisas:

- **`perspective: 'drafts'`**: o rascunho por cima do publicado. Nessa perspectiva o `_id` vem sem o `drafts.` (o original fica em `_originalId`), então o filtro "só conteúdo no ar" das consultas deixa o rascunho passar sem mudar nenhuma consulta. Um post nunca publicado aparece porque o Studio preenche a `dataDePublicacao` com a hora da criação.
- **Token viewer**, que lê os rascunhos e o segredo do Presentation (`validarUrlDaPrevia`, reexportado pelo `conteudo.ts` para o `/api/previa/ativar`).
- **Stega**: cada texto de [`CAMPOS_COM_STEGA`](stega.ts) leva, em caracteres invisíveis, o documento e o campo de onde veio, e o script da edição visual os torna clicáveis. Só texto corrido (título, subtítulo, spans do corpo, legendas, campos livres da ficha...): valores que o site compara (`tipo`, `modelo`, `provedor`, `rede`, `uf`...) quebrariam com a marca, e o `alt` ficaria estranho no leitor de tela. Campo novo de texto que deva ser clicável na prévia entra nessa lista.

## Modo fixtures

Sem `SANITY_PROJECT_ID` e `SANITY_DATASET`, ou com `SANITY_FIXTURES=true`, o site lê um dataset de exemplo guardado no repositório em vez do Sanity: o build roda sem rede e sem segredo, como no CI. Em produção isso é proibido (veja [`docs/ambientes.md`](../../../../docs/ambientes.md#sem-o-sanity-configurado-fixtures)). Para forçar as fixtures com o Sanity configurado, ponha `SANITY_FIXTURES=true` no `web/.env`.

As fixtures são **documentos no formato do Sanity**, não resultados prontos: o `consultar` roda as mesmas consultas de `consultas.ts` com o [`groq-js`](https://github.com/sanity-io/groq-js), a implementação de GROQ do Sanity. Assim, filtros, ordem, paginação e referências se comportam como no Sanity, e não há um segundo formato para manter.

- [`fixtures/dataset.ts`](fixtures/dataset.ts): o conteúdo. A taxonomia é a do Studio ([`studio/lib/taxonomia.ts`](../../../../studio/lib/taxonomia.ts)), com os `_id` e slugs de produção. Os documentos são tipados com os tipos do schema gerados pelo typegen: um campo renomeado no Studio quebra o `pnpm check` aqui.
- [`fixtures/documentos.ts`](fixtures/documentos.ts): os helpers que montam documentos, imagens e blocos de Portable Text.
- [`fixtures/index.ts`](fixtures/index.ts): o `consultarFixtures`, carregado com import dinâmico só no modo fixtures.

O que o dataset tem (o [`conteudo.test.ts`](conteudo.test.ts) confere):

- **1 review de cada categoria**, com nota e ficha do modelo certo. A ficha do mirante (Lugares) fica sem tipo de cozinha e sem Instagram: o caso do campo vazio.
- **Pensamentos dos dois formatos**: um texto com **todos os blocos do Portable Text** (subtítulos h2 e h3, citação, listas com marcadores e numerada, com subnível, negrito, itálico, link externo `https` e `mailto`, link interno no ar e fora do ar, imagem normal e larga, galeria, vídeo do YouTube e do Instagram e citação em destaque com e sem fonte), um texto sem subtítulo, uma frase curta (com `noindex` e um endereço antigo, para o sitemap e os redirects) e uma opinião com o SEO preenchido. O texto com todos os blocos e a opinião guardam o endereço de antes da unificação dos formatos (#143), em `/pensamentos/artigos` e `/pensamentos/opinioes`.
- Configurações (frase em destaque, post em destaque e redes) e a página Sobre.

**Imagens.** Cada asset é um placeholder em SVG num data URI (`url`), com dimensões e `lqip`: nada vai para o repositório nem para a rede. O `_id` segue o padrão dos assets do Sanity (`image-{id}-{largura}x{altura}-svg`), mas não existe no CDN, e sem `SANITY_PROJECT_ID` não há como montar uma URL do CDN. O [`imagem.ts`](imagem.ts) usa o `url` do asset direto no modo fixtures, sem `srcset`, e o `<ImagemSanity>` recorta na proporção pelo CSS (veja [Imagens](#imagens)).

São 10 posts, menos que uma página de listagem. Para testar a paginação, acrescente posts no `dataset.ts`.

## Gerar os tipos

Rode na raiz depois de mudar uma consulta ou um schema do Studio:

```bash
pnpm typegen
```

O comando roda no Studio, porque é a CLI dele que conhece os schemas, e precisa do `studio/.env` (veja o [README do Studio](../../../../studio/README.md#rodar-localmente)). São dois passos, configurados no [`studio/sanity.cli.ts`](../../../../studio/sanity.cli.ts):

1. `sanity schema extract` grava os schemas em `studio/schema.json` (fora do Git). Com `enforceRequiredFields`, campo com `required()` não vem opcional no tipo: as consultas só leem documentos publicados, que passaram pela validação. Por isso um aviso de campo vazio usa `custom(...).warning()`, nunca `required().warning()`, que tiraria o `null` do tipo de um campo que pode vir vazio.
2. `sanity typegen generate` lê as consultas de `consultas.ts` e grava o `tipos.gerados.d.ts`: os tipos dos documentos e um `<NOME_DA_CONSULTA>_RESULT` por consulta, como `CONSULTA_DO_POST_RESULT`. O arquivo também registra cada consulta no mapa `SanityQueries` do `@sanity/client`, mas o site não depende disso: veja [Funções de acesso](#funções-de-acesso).

O check `ci / quality` roda o `pnpm typegen` e falha se o arquivo versionado for diferente do gerado. Como o texto de cada consulta entra no arquivo, mudar uma projeção do Studio (abaixo) também muda o site, e o preview da Vercel builda.

O typegen lê as consultas sem rodar o código: os pedaços reaproveitados são só template literals com outras constantes, ou funções que só devolvem um template literal, sem `.map()` nem `.join()`.

## Regras de todas as consultas

- **Só conteúdo no ar:** nunca rascunho (`drafts.*`) nem versão de release (`versions.*`), e post só com `dataDePublicacao` até agora. Os testes ([`consultas.test.ts`](consultas.test.ts)) rodam cada consulta com o [`groq-js`](https://github.com/sanity-io/groq-js) num dataset com rascunho, versão e post no futuro, e falham se algum aparecer.
- **Ordem:** do mais recente para o mais antigo, com o `_id` desempatando, para a paginação não repetir nem pular post.
- **Slugs resolvidos:** `slug`, `categoria.slug` e `formato.slug` já vêm como texto, prontos para o `urlDoPost` (veja [`docs/seo-urls.md`](../../../../docs/seo-urls.md#helpers-de-rota)).
- **Parâmetro `$tag`:** o tipo `QueryParams` do `@sanity/client` reserva `tag`, que é o nome de uma opção do `fetch`. É só uma trava de tipo: o `consultar` aceita um parâmetro com esse nome, e ele chega ao Sanity como `$tag`.
- **Projeções do Studio:** o corpo (`CORPO_NO_GROQ`), a ficha (`FICHA_NO_GROQ`) e as imagens (`IMAGEM_NO_GROQ`) vêm de [`studio/lib`](../../../../studio/lib), ao lado dos schemas e com os próprios testes.

## Formatos compartilhados

**Imagem** (capa, foto, imagem de compartilhamento, imagens do corpo e da galeria): o objeto da imagem com `alt`, `legenda` (quando o schema tem), `hotspot` e `crop`, e o asset expandido:

```ts
asset: { _id: string; url: string; largura: number | null; altura: number | null; lqip: string | null } | null
```

`lqip` é uma prévia borrada em base64; `asset` vem `null` se o arquivo foi apagado.

## Imagens

Toda imagem do conteúdo passa pelo [`<ImagemSanity>`](../../components/ui/ImagemSanity.astro) (veja o [README do site](../../../README.md#imagens-datas-e-tempo-de-leitura)), que pega as URLs no [`imagem.ts`](imagem.ts). O `fontesDaImagem(imagem, proporcao?)` monta, com o [`@sanity/image-url`](https://github.com/sanity-io/image-url):

- **`srcset` em larguras fixas** (`LARGURAS`: 320, 480, 640, 800, 1024, 1280, 1600 e 1920), sempre com `auto=format` (o CDN entrega AVIF ou WebP conforme o navegador) e `q=75`. Nenhuma versão passa do tamanho do arquivo: as larguras maiores que ele saem, e a última é a própria largura do arquivo (até 1920).
- **Recorte e hotspot do Studio:** o `crop` vira o `rect` da URL. Com `proporcao` (largura / altura, como `4 / 3`), cada versão sai com `w`, `h` e `fit=crop`, no maior retângulo dessa proporção dentro do recorte, centrado no hotspot.
- **`width` e `height`** da maior versão, para a tag reservar o espaço certo antes de a imagem chegar (sem CLS). As dimensões vêm do asset ou, se faltarem, do `_id` (`image-{id}-{largura}x{altura}-{ext}`).
- **`null` sem asset** (arquivo apagado): o componente não renderiza nada.

O projeto e o dataset saem da URL do próprio asset (`https://cdn.sanity.io/images/{projeto}/{dataset}/...`), como no `ogImage` do `<Seo>`, sem depender das variáveis. Fora do CDN, como no [modo fixtures](#modo-fixtures), o `src` é o `url` do asset (o placeholder em SVG) e não há `srcset`.

**Card** de post ("Leia também" e índice):

```ts
{
  _id, tipo: 'review' | 'pensamento', titulo, subtitulo: string | null, slug, dataDePublicacao,
  nota: number | null,                              // só em review
  categoria: { nome, slug } | null,                 // só em review
  formato: { nome, slug } | null,                   // só em pensamento
  capa: Imagem
}
```

**Card com leitura** (destaque e listagens, que mostram o tempo de leitura): o card e mais `textoDoCorpo`, só os blocos de texto do corpo com o texto dos spans (`{ _type: 'block', children: { text }[] }[]`), o que o `tempoDeLeitura` conta. Nos componentes, os dois formatos são os tipos `Card` e `CardComLeitura`, de [`src/lib/card.ts`](../card.ts).

**Rota** (o mínimo do `urlDoPost`): `{ tipo, slug, categoria: { slug } | null, formato: { slug } | null }`.

**Página de listagem**: `{ posts: CardComLeitura[], total: number }`, com a fatia `[$inicio...$fim]` (fim exclusivo). Com 12 por página, a página `n` usa `inicio = (n - 1) * 12` e `fim = n * 12`; o `total` diz quantas páginas gerar.

## Consultas

| Consulta                          | Parâmetros                      | Resultado                                                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CONSULTA_DAS_CONFIGURACOES`      | —                               | `{ fraseDaSemana, seo: { descricao, imagem }, redes: { rede, url }[] }` ou `null`                                                                                                                                                                |
| `CONSULTA_DO_SOBRE`               | —                               | `{ _updatedAt, nome, bio, foto, texto (Portable Text), seo: { descricao, imagem } }` ou `null`                                                                                                                                                   |
| `CONSULTA_DO_DESTAQUE`            | —                               | Card com leitura do post escolhido em Configurações; se não houver (ou ele saiu do ar), o do mais recente. `null` sem nenhum post                                                                                                                |
| `CONSULTA_DOS_ULTIMOS_POSTS`      | `$inicio`, `$fim`               | Página de listagem com todos os posts                                                                                                                                                                                                            |
| `CONSULTA_DOS_POSTS_DO_TIPO`      | `$tipo`, `$inicio`, `$fim`      | Página de listagem de reviews ou de pensamentos                                                                                                                                                                                                  |
| `CONSULTA_DOS_POSTS_DA_CATEGORIA` | `$categoria`, `$inicio`, `$fim` | Página de listagem e `categoria: { nome, slug, descricao }`, `null` se o slug não existe                                                                                                                                                         |
| `CONSULTA_DOS_POSTS_DO_FORMATO`   | `$formato`, `$inicio`, `$fim`   | Página de listagem e `formato: { nome, slug, descricao }`, `null` se o slug não existe                                                                                                                                                           |
| `CONSULTA_DA_TAXONOMIA`           | —                               | `{ categorias, formatos }`, cada item com `_id`, `nome`, `slug` e `total` de posts no ar. Categorias e formatos (com `descricao`) na ordem do menu, inclusive sem post                                                                           |
| `CONSULTA_DAS_LISTAS_DO_ANO`      | —                               | Card com leitura e `modelo` (`livro`, `filme` ou `serie`) de cada review de livro, filme ou série, da mais recente à mais antiga. O site agrupa por ano em `@/lib/listas` (#137)                                                                 |
| `CONSULTA_DOS_ANOS_DAS_LISTAS`    | —                               | `tipo`, `dataDePublicacao` e `modelo` das mesmas reviews, sem os cards: os anos com lista, no rodapé                                                                                                                                             |
| `CONSULTA_DO_POST`                | `$tipo`, `$secao`, `$slug`      | Post inteiro ou `null` (abaixo). `$secao` é o slug da categoria (review) ou do formato (pensamento)                                                                                                                                              |
| `CONSULTA_DAS_ROTAS_DOS_POSTS`    | —                               | Rota de cada post, para o `getStaticPaths`                                                                                                                                                                                                       |
| `CONSULTA_DO_LEIA_TAMBEM`         | `$id`                           | Até 3 cards: mesma categoria (ou formato), depois mesmo tipo, depois os mais recentes, sem o próprio post. `[]` se o `$id` não existe                                                                                                            |
| `CONSULTA_DO_INDICE_DE_POSTS`     | —                               | Card de todos os posts, com o texto dos blocos do corpo (para o tempo de leitura): `/posts-index.json` do "Mais lidos" (#57)                                                                                                                     |
| `CONSULTA_DOS_REDIRECTS`          | —                               | Rota e `anteriores: string[]` (caminhos completos antigos) dos posts que mudaram de endereço. Cada caminho antigo redireciona para o `urlDoPost` do post (#53)                                                                                   |
| `CONSULTA_DO_SITEMAP`             | —                               | `{ posts, categorias, formatos, sobre, configuracoes }`: de cada post, na ordem das listagens, a rota, `_updatedAt`, `dataDePublicacao`, `modelo` (da categoria, para as listas do ano) e `noindex`; dos outros documentos, o `_updatedAt` (#52) |

### Post

`CONSULTA_DO_POST` devolve o card com `categoria: { nome, slug, modeloFicha }` e mais:

- `_updatedAt`, para o `dateModified` e o `lastmod`;
- `ficha`: só os campos do modelo da categoria, com `modelo` (`'filme' | 'serie' | 'livro' | 'lugar' | 'comida'`) para separar os casos no TypeScript; campo vazio vem `null`, e a ficha toda vem `null` em pensamento ou sem ficha;
- `corpo`: o Portable Text com as imagens (soltas e da galeria) expandidas e cada `linkInterno` com `post: Rota | null`, `null` quando o destino não está no ar;
- `seo: { titulo, descricao, noindex, imagem } | null`.
