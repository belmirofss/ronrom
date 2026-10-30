# Consultas do Sanity

Todas as consultas GROQ do site ficam em [`consultas.ts`](consultas.ts) (#25), escritas com `defineQuery`. O cliente e as funções de acesso que as usam ficam na #33. Os tipos dos resultados ficam em [`tipos.gerados.d.ts`](tipos.gerados.d.ts), gerado pelo typegen do Sanity: não edite esse arquivo à mão.

## Gerar os tipos

Rode na raiz depois de mudar uma consulta ou um schema do Studio:

```bash
pnpm typegen
```

O comando roda no Studio, porque é a CLI dele que conhece os schemas, e precisa do `studio/.env` (veja o [README do Studio](../../../../studio/README.md#rodar-localmente)). São dois passos, configurados no [`studio/sanity.cli.ts`](../../../../studio/sanity.cli.ts):

1. `sanity schema extract` grava os schemas em `studio/schema.json` (fora do Git). Com `enforceRequiredFields`, campo com `required()` não vem opcional no tipo: as consultas só leem documentos publicados, que passaram pela validação. Por isso um aviso de campo vazio usa `custom(...).warning()`, nunca `required().warning()`, que tiraria o `null` do tipo de um campo que pode vir vazio.
2. `sanity typegen generate` lê as consultas de `consultas.ts` e grava o `tipos.gerados.d.ts`: os tipos dos documentos e um `<NOME_DA_CONSULTA>_RESULT` por consulta, como `CONSULTA_DO_POST_RESULT`. O arquivo também registra cada consulta no `@sanity/client`, para o `client.fetch(CONSULTA_DO_POST, params)` da #33 já sair tipado.

O check `ci / quality` roda o `pnpm typegen` e falha se o arquivo versionado for diferente do gerado. Como o texto de cada consulta entra no arquivo, mudar uma projeção do Studio (abaixo) também muda o site, e o preview da Vercel builda.

O typegen lê as consultas sem rodar o código: os pedaços reaproveitados são só template literals com outras constantes, ou funções que só devolvem um template literal, sem `.map()` nem `.join()`.

## Regras de todas as consultas

- **Só conteúdo no ar:** nunca rascunho (`drafts.*`) nem versão de release (`versions.*`), e post só com `dataDePublicacao` até agora. Os testes ([`consultas.test.ts`](consultas.test.ts)) rodam cada consulta com o [`groq-js`](https://github.com/sanity-io/groq-js) num dataset com rascunho, versão e post no futuro, e falham se algum aparecer.
- **Ordem:** do mais recente para o mais antigo, com o `_id` desempatando, para a paginação não repetir nem pular post.
- **Slugs resolvidos:** `slug`, `categoria.slug` e `formato.slug` já vêm como texto, prontos para o `urlDoPost` (veja [`docs/seo-urls.md`](../../../../docs/seo-urls.md#helpers-de-rota)).
- **Projeções do Studio:** o corpo (`CORPO_NO_GROQ`), a ficha (`FICHA_NO_GROQ`) e as imagens (`IMAGEM_NO_GROQ`) vêm de [`studio/lib`](../../../../studio/lib), ao lado dos schemas e com os próprios testes.

## Formatos compartilhados

**Imagem** (capa, foto, imagem de compartilhamento, imagens do corpo e da galeria): o objeto da imagem com `alt`, `legenda` (quando o schema tem), `hotspot` e `crop`, e o asset expandido:

```ts
asset: { _id: string; url: string; largura: number | null; altura: number | null; lqip: string | null } | null
```

`lqip` é uma prévia borrada em base64; `asset` vem `null` se o arquivo foi apagado.

**Card** de post (listas, destaque, "Leia também", índice):

```ts
{
  _id, tipo: 'review' | 'pensamento', titulo, subtitulo: string | null, slug, dataDePublicacao,
  nota: number | null,                              // só em review
  categoria: { nome, slug } | null,                 // só em review
  formato: { nome, slug } | null,                   // só em pensamento
  capa: Imagem
}
```

**Rota** (o mínimo do `urlDoPost`): `{ tipo, slug, categoria: { slug } | null, formato: { slug } | null }`.

**Página de listagem**: `{ posts: Card[], total: number }`, com a fatia `[$inicio...$fim]` (fim exclusivo). Com 12 por página, a página `n` usa `inicio = (n - 1) * 12` e `fim = n * 12`; o `total` diz quantas páginas gerar.

## Consultas

| Consulta                          | Parâmetros                      | Resultado                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONSULTA_DAS_CONFIGURACOES`      | —                               | `{ fraseDaSemana, seo: { descricao, imagem }, redes: { rede, url }[] }` ou `null`                                                                                                                           |
| `CONSULTA_DO_SOBRE`               | —                               | `{ _updatedAt, nome, bio, foto, texto (Portable Text), seo: { descricao, imagem } }` ou `null`                                                                                                              |
| `CONSULTA_DO_DESTAQUE`            | —                               | Card do post escolhido em Configurações; se não houver (ou ele saiu do ar), o do mais recente. `null` sem nenhum post                                                                                       |
| `CONSULTA_DOS_ULTIMOS_POSTS`      | `$inicio`, `$fim`               | Página de listagem com todos os posts                                                                                                                                                                       |
| `CONSULTA_DOS_POSTS_DO_TIPO`      | `$tipo`, `$inicio`, `$fim`      | Página de listagem de reviews ou de pensamentos                                                                                                                                                             |
| `CONSULTA_DOS_POSTS_DA_CATEGORIA` | `$categoria`, `$inicio`, `$fim` | Página de listagem e `categoria: { nome, slug, descricao }`, `null` se o slug não existe                                                                                                                    |
| `CONSULTA_DOS_POSTS_DO_FORMATO`   | `$formato`, `$inicio`, `$fim`   | Página de listagem e `formato: { nome, slug, descricao }`, `null` se o slug não existe                                                                                                                      |
| `CONSULTA_DOS_POSTS_DA_TAG`       | `$tag`, `$inicio`, `$fim`       | Página de listagem e `tag: { nome, slug }`, `null` se o slug não existe                                                                                                                                     |
| `CONSULTA_DA_TAXONOMIA`           | —                               | `{ categorias, formatos, tags }`, cada item com `_id`, `nome`, `slug` e `total` de posts no ar. Categorias e formatos (com `descricao`) na ordem do menu, inclusive sem post; só as tags com post, por nome |
| `CONSULTA_DO_POST`                | `$tipo`, `$secao`, `$slug`      | Post inteiro ou `null` (abaixo). `$secao` é o slug da categoria (review) ou do formato (pensamento)                                                                                                         |
| `CONSULTA_DAS_ROTAS_DOS_POSTS`    | —                               | Rota de cada post, para o `getStaticPaths`                                                                                                                                                                  |
| `CONSULTA_DO_LEIA_TAMBEM`         | `$id`                           | Até 3 cards: mesma categoria (ou formato), depois mesmo tipo, depois os mais recentes, sem o próprio post. `[]` se o `$id` não existe                                                                       |
| `CONSULTA_DO_INDICE_DE_POSTS`     | —                               | Card de todos os posts, sem o corpo: `/posts-index.json` do "Mais lidos" (#57) e busca (#54)                                                                                                                |
| `CONSULTA_DOS_REDIRECTS`          | —                               | Rota e `anteriores: string[]` (caminhos completos antigos) dos posts que mudaram de endereço. Cada caminho antigo redireciona para o `urlDoPost` do post (#53)                                              |
| `CONSULTA_DO_SITEMAP`             | —                               | Rota, `_updatedAt` e `noindex: boolean` de cada post (#52)                                                                                                                                                  |

### Post

`CONSULTA_DO_POST` devolve o card com `categoria: { nome, slug, modeloFicha }` e mais:

- `_updatedAt`, para o `dateModified` e o `lastmod`;
- `ficha`: só os campos do modelo da categoria, com `modelo` (`'filme' | 'serie' | 'livro' | 'lugar' | 'comida'`) para separar os casos no TypeScript; campo vazio vem `null`, e a ficha toda vem `null` em pensamento ou sem ficha;
- `corpo`: o Portable Text com as imagens (soltas e da galeria) expandidas e cada `linkInterno` com `post: Rota | null`, `null` quando o destino não está no ar;
- `tags: { nome, slug }[]`, sem as tags apagadas ou não publicadas;
- `seo: { titulo, descricao, noindex, imagem } | null`.
