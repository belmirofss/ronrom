# Studio (Sanity)

Painel de edição do Ronrom, feito com o [Sanity Studio](https://www.sanity.io/docs/studio) (v6, TypeScript). Fica no monorepo ao lado do site (`web/`) para que schemas, consultas GROQ e tipos gerados andem juntos. O Studio publicado é hospedado pelo Sanity em `https://ronrom.sanity.studio`; ele não faz parte do build do Astro nem da Vercel.

## Rodar localmente

1. Instale as dependências na raiz do repositório: `pnpm install`.
2. Copie `studio/.env.example` para `studio/.env` e preencha as variáveis (tabela abaixo).
3. Na raiz, rode `pnpm studio:dev` e abra `http://localhost:3333`. O Studio pede login com uma conta que seja membro do projeto no Sanity.

| Comando (na raiz)    | O que faz                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm studio:dev`    | Sobe o Studio em `http://localhost:3333`                                                     |
| `pnpm studio:build`  | Gera o Studio estático em `studio/dist`                                                      |
| `pnpm studio:deploy` | Faz o build e publica em `ronrom.sanity.studio` (pede `sanity login` ou `SANITY_AUTH_TOKEN`) |
| `pnpm typecheck`     | Roda o `tsc --noEmit` no site e no Studio                                                    |

Para outros comandos da CLI: `pnpm --filter studio sanity <comando>` (ex.: `pnpm --filter studio sanity login`).

`deployment.autoUpdates` fica desligado: o Studio publicado roda a versão do `pnpm-lock.yaml`, e atualizar o Sanity é um PR de dependência como outro qualquer.

## Deploy

O Studio publicado fica em `https://ronrom.sanity.studio` e edita o dataset `production`.

- **Automático:** o workflow [`studio.yml`](../.github/workflows/studio.yml) roda `pnpm studio:deploy` a cada push na `main` que muda algo em `studio/`. Push que só mexe no site, na documentação ou nos workflows não redeploya. Para publicar sem commit, use Actions → studio → Run workflow.
- **Manual:** na raiz, `pnpm studio:deploy`, com `sanity login` feito antes.

O hostname vem do `--url ronrom` no script `deploy` do `studio/package.json`: o primeiro deploy registra o endereço e os seguintes reaproveitam, sem pergunta. Se um dia o nome mudar, troque ali.

O dataset vem do [`studio/.env.production`](.env.production), versionado, que o `sanity build` e o `sanity deploy` leem por cima do `studio/.env`. Assim um deploy feito da sua máquina não publica um Studio apontando para `development`.

O workflow precisa de dois valores em Settings → Secrets and variables → Actions:

| Nome                       | Tipo     | Valor                                        |
| -------------------------- | -------- | -------------------------------------------- |
| `SANITY_AUTH_TOKEN`        | Secret   | Token `studio-deploy-ci-5` (veja Tokens)     |
| `SANITY_STUDIO_PROJECT_ID` | Variable | O mesmo ID do projeto usado no `studio/.env` |

O token precisa do papel **Deploy Studio** (ou Administrator). Com Editor, o deploy falha com `missing required grant sanity.project.deployStudio`.

## Schemas

Ficam em [`schemaTypes/`](schemaTypes); campos repetidos (nome, slug, descrição, ordem, tags, texto alternativo, legenda, descrição e imagem de SEO) em [`schemaTypes/campos.ts`](schemaTypes/campos.ts).

| Tipo            | Campos                                              | Observação                                                     |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `post`          | veja [Post](#post)                                  | Review e pensamento num tipo só, separados pelo campo `tipo`   |
| `categoria`     | `nome`, `slug`, `descricao`, `ordem`, `modeloFicha` | Categorias das reviews; `modeloFicha` define a ficha da review |
| `formato`       | `nome`, `slug`, `descricao`, `ordem`                | Formatos dos pensamentos                                       |
| `tag`           | `nome`, `slug`                                      | Criada direto do post, pelo "Criar novo" do campo de tags      |
| `configuracoes` | veja [Singletons](#singletons)                      | Singleton com `_id` `configuracoes`                            |
| `sobre`         | veja [Singletons](#singletons)                      | Singleton com `_id` `sobre`                                    |

Slugs seguem a [política de URLs](../docs/seo-urls.md#slugs): o botão "Gerar" usa o `slugify` de [`lib/slug.ts`](lib/slug.ts), que tira acentos e cedilha ("Séries" vira `series`), e a validação recusa slug fora do formato e o reservado `pagina`. A unicidade é a padrão do Sanity, dentro do mesmo tipo: duas tags não podem ter o mesmo slug, mas uma tag e uma categoria podem. O post usa o mesmo `campoSlug` e o `campoTags`.

### Post

Um único tipo `post`, com o campo `tipo` (`review` ou `pensamento`), para que slug, listagens, "Mais lidos" e busca usem um namespace e uma consulta só. O formulário tem três abas: **Conteúdo**, **Review** (só em review) e **SEO**.

| Campo              | Regras                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `tipo`             | Obrigatório; fica só leitura assim que é escolhido, porque faz parte do endereço                                         |
| `categoria`        | Referência, obrigatória e visível só em review                                                                           |
| `formato`          | Referência, obrigatória e visível só em pensamento                                                                       |
| `nota`             | De meio a 5 corações, em passos de meio; obrigatória e visível só em review, recusada em pensamento                      |
| `ficha`            | Dados técnicos da review, que mudam conforme o modelo de ficha da categoria; veja "Ficha da review" abaixo               |
| `titulo`           | Obrigatório; aviso acima de 70 caracteres                                                                                |
| `subtitulo`        | Opcional                                                                                                                 |
| `slug`             | Gerado do título, obrigatório e único entre os posts                                                                     |
| `dataDePublicacao` | Obrigatória, começa com a hora da criação e não aceita data no futuro (não há agendamento)                               |
| `capa`             | Imagem com hotspot, obrigatória; `alt` obrigatório e `legenda` (legenda ou crédito) opcional                             |
| `corpo`            | Portable Text com estilos, listas, links, imagem e citação em destaque; veja "Texto do post" abaixo                      |
| `tags`             | Referências a `tag`, sem repetir                                                                                         |
| `seo`              | `titulo` (aviso acima de 60), `descricao` (aviso acima de 160), `imagem` (`alt` obrigatório se houver imagem), `noindex` |
| `slugsAnteriores`  | Caminhos antigos do post, só leitura, dentro de "Avançado" na aba SEO                                                    |

A lista de posts mostra a capa, o título e um subtítulo como "Review · Filmes · ♥♥♥½" ou "Pensamento · Frases soltas"; as funções puras por trás disso (caminho, slugs anteriores, data, corações) ficam em [`lib/post.ts`](lib/post.ts), com testes.

**Nota em corações.** A `nota` aparece nas abas Conteúdo e Review e usa o input de [`componentes/InputDeNota.tsx`](componentes/InputDeNota.tsx): 5 corações (vinho quando preenchido, contorno rosa quando vazio), em que clicar no coração grava a nota inteira e clicar na metade esquerda grava meio a menos (4º coração: `4`; metade esquerda dele: `3.5`). Passar o mouse pré-visualiza a nota, e o botão "Limpar" apaga. Por baixo são 10 radios nativos, de "meio coração" a "5 corações": as setas do teclado andam de meio em meio. As regras (valores aceitos, rótulos, validação) ficam em [`lib/nota.ts`](lib/nota.ts), com testes. A lista de posts mostra a nota em texto (♥ e ½), porque o Sanity só aceita texto no subtítulo da lista de documentos.

**Ficha da review.** A `ficha` fica na aba Review e usa o input de [`componentes/FichaInput.tsx`](componentes/FichaInput.tsx). Como o `hidden` do Sanity não enxerga campos da categoria referenciada, o input lê `categoria._ref`, busca o `modeloFicha` dela (e escuta mudanças) e mostra só os campos daquele modelo. Sem categoria, mostra "Escolha a categoria para preencher a ficha." Os campos e as regras ficam em [`lib/ficha.ts`](lib/ficha.ts), com testes (a projeção GROQ é conferida com o `groq-js`):

| Modelo   | Categorias                    | Campos (obrigatório em **negrito**)                                                                                                           |
| -------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `filme`  | Filmes                        | **`direcao`**, `ano`, `duracao` (minutos), `ondeVi` (`meio`: cinema ou streaming, `qual`)                                                     |
| `serie`  | Séries                        | **`criacao`**, `anoDeEstreia`, `anoDeFim` (vazio se ainda está no ar), `temporadasVistas`, `ondeVi`                                           |
| `livro`  | Livros                        | **`autoria`**, `editora`, `ano`, `paginas`, `formatoDoLivro` (`fisico`, `ebook` ou `audiobook`)                                               |
| `lugar`  | Restaurantes e cafés, Lugares | `endereco` (**`rua`**, `bairro`, **`cidade`**, **`uf`**), `linkDoMapa`, `faixaDePreco` (R$ a R$$$$), `tipoDeCozinha`, `oQuePedi`, `instagram` |
| `comida` | Comidas                       | `marca` (marca ou onde comprar), `preco` (reais), **`oQueProvei`**                                                                            |
| todos    |                               | `valeAPena` (frase curta opcional)                                                                                                            |

Os campos de todos os modelos ficam num objeto só e sem prefixo; os que têm o mesmo sentido em mais de um modelo (`ano`, `ondeVi`) têm o mesmo nome e continuam valendo ao trocar de categoria. Os obrigatórios são conferidos por uma validação que também busca o modelo da categoria. Ao trocar para uma categoria de outro modelo, nada é apagado em silêncio: o input lista os campos preenchidos que deixaram de valer e oferece o botão "Apagar esses campos". Eles ficam guardados, mas o site não os lê: as consultas usam o `FICHA_NO_GROQ` de `lib/ficha.ts` (`"ficha": ${FICHA_NO_GROQ}`), que devolve só os campos do modelo da categoria e `null` em pensamento ou sem ficha. A lista de campos foi aprovada na #1 e pode mudar depois do onboarding da autora (#31).

**Texto do post.** O `corpo` fica em [`schemaTypes/corpo.ts`](schemaTypes/corpo.ts) e oferece só o que o layout "Caderno" do site sabe mostrar (WEB-09), com rótulos e ícones em pt-BR:

| Na barra          | Opções                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Estilos           | Parágrafo, Subtítulo (`h2`), Subtítulo menor (`h3`) e Citação (`blockquote`); sem `h1`, porque o título do post já é o `h1`             |
| Formatação        | Negrito e itálico; sublinhado e código ficam desligados                                                                                 |
| Listas            | Com marcadores e numerada                                                                                                               |
| Links             | `link` (externo, `href` obrigatório em `http`, `https` ou `mailto`) e `linkInterno` (referência a outro post, sem criar post pelo link) |
| `imagem`          | Imagem com hotspot; `alt` obrigatório, `legenda` opcional e `largura` (`normal` ou `larga`); sem a imagem, o bloco não deixa publicar   |
| `citacaoDestaque` | `texto` obrigatório e `fonte` (autor ou fonte) opcional, mostrada no editor em letra grande e vinho, parecida com o site                |

O `linkInterno` guarda o `_id` do post, não o endereço: o link continua certo depois que o destino muda de slug, categoria ou formato. Como a referência é forte, o Sanity não deixa apagar um post que outro post linka (ele mostra quais). As consultas do site usam o `CORPO_NO_GROQ` de [`lib/corpo.ts`](lib/corpo.ts) (`"corpo": ${CORPO_NO_GROQ}`), que troca cada referência pelo post de destino com os slugs já resolvidos para o `urlDoPost`; destino ainda não publicado vem como `post: null`, e o site mostra só o texto. A projeção tem testes com o `groq-js`.

**Endereço antigo.** O botão "Publicar" do post é envolvido por [`acoes/publicarPost.ts`](acoes/publicarPost.ts): ao publicar um post que já estava no ar com outro slug, categoria ou formato, ele guarda o caminho publicado (`/reviews/filmes/slug-antigo`) em `slugsAnteriores`, para a #53 gerar o redirect. Se a consulta ao Sanity falhar, o post não é publicado e a autora vê um aviso para tentar de novo. Mudar o slug, a categoria ou o formato de um post publicado mostra um aviso amarelo no campo, sem impedir a publicação.

### Singletons

Dois documentos únicos, registrados em `document.singletons` no [`sanity.config.ts`](sanity.config.ts) (API nativa do Sanity 6, ainda beta), com `_id` igual ao nome do tipo. O site lê os dois por esse `_id`. O Sanity tira os dois do menu "Criar" e tira o "Duplicar"; a configuração tira também "Excluir" e "Despublicar" ([`lib/estrutura.ts`](lib/estrutura.ts)), para o site nunca ficar sem eles. O documento passa a existir na primeira vez que a autora publica.

**Configurações do site** ([`schemaTypes/configuracoes.ts`](schemaTypes/configuracoes.ts)), abas Home e SEO e redes:

| Campo            | Regras                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `fraseDaSemana`  | `texto` (aviso acima de 280), `autoria` e `data` opcionais; autor ou data sem texto é erro                |
| `postEmDestaque` | Referência a post, só publicado (a validação confere); vazio, a home usa o post mais recente              |
| `seo`            | SEO padrão do site: `descricao` (aviso se vazia ou acima de 160) e `imagem` (`alt` obrigatório se houver) |
| `redes[]`        | `rede` (Instagram, TikTok, YouTube, Letterboxd, Goodreads, Skoob, Pinterest ou Outra) e `url` (https)     |

O destaque da home saiu do post (era o boolean `destaque`): com um só post escolhido aqui, não existe o caso de dois posts ligados ao mesmo tempo.

**Sobre mim** ([`schemaTypes/sobre.ts`](schemaTypes/sobre.ts)), abas Conteúdo e SEO:

| Campo   | Regras                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `nome`  | Obrigatório                                                                                                                |
| `foto`  | Imagem com hotspot, obrigatória, com `alt` obrigatório                                                                     |
| `bio`   | Bio curta da barra lateral, obrigatória, até 200 caracteres (erro)                                                         |
| `texto` | Portable Text simples, um pedaço do `corpo`: parágrafo, subtítulo (`h2`), lista, negrito, itálico e o mesmo `link` externo |
| `seo`   | `descricao` e `imagem`, opcionais; vazios, o site usa a bio e a foto                                                       |

### Navegação

A lista da esquerda é montada em [`estrutura.ts`](estrutura.ts), com os filtros e valores iniciais em [`lib/estrutura.ts`](lib/estrutura.ts) (com testes, os filtros conferidos com o `groq-js`):

- **Reviews**: "Todas as reviews" e uma subpasta por categoria publicada, na `ordem` do menu do site.
- **Pensamentos**: "Todos os pensamentos" e uma subpasta por formato.
- **Rascunhos**: todo post com mudança não publicada (`_originalId in path("drafts.**")`: as listas consultam na perspectiva de rascunhos, em que o `_id` já vem sem o `drafts.`), o que nunca foi ao ar e o que foi editado depois, do mais recente para o mais antigo (`_updatedAt`).
- Configurações do site e Sobre mim.
- Categorias, Formatos e Tags.

As listas de posts começam ordenadas pela data de publicação, mais recente primeiro. O "+" de cada lista cria o post certo: "Nova review" e "Novo pensamento" já vêm com o `tipo`; dentro de uma subpasta, também com a categoria ou o formato (modelos `review-da-categoria` e `pensamento-do-formato`, com o `_id` como parâmetro). Com o `keepPanesOnCreate` do `structureTool`, o post novo abre ao lado da lista, sem esconder as pastas. No menu "Criar" do topo aparecem só "Nova review" e "Novo pensamento", além de categoria, formato e tag: o modelo padrão do post, sem tipo, foi tirado.

As subpastas são lidas ao abrir Reviews ou Pensamentos: uma categoria ou um formato novo aparece depois de recarregar o Studio.

### Taxonomia inicial

As 6 categorias e os 4 formatos de [`lib/taxonomia.ts`](lib/taxonomia.ts) (nomes, slugs, descrições e `_id` fixos, como `categoria-filmes`) são gravados por [`scripts/criar-taxonomia.ts`](scripts/criar-taxonomia.ts). Ele usa `createOrReplace`, então rodar de novo não duplica nada, mas **desfaz edições** feitas no Studio nesses dez documentos (nome, descrição, ordem). Depois que a autora começar a editar, mude o arquivo antes de rodar de novo.

Com `studio/.env` preenchido e `sanity login` feito, na raiz (o token do CI só publica o Studio e não grava conteúdo):

```bash
pnpm --filter studio taxonomia --dataset development
```

```bash
pnpm --filter studio taxonomia --dataset production
```

O dataset é sempre explícito: sem `--dataset`, o script não grava nada.

## Idioma, marca e ferramentas

- **pt-BR:** a interface usa o [`@sanity/locale-pt-br`](https://github.com/sanity-io/locales), ativado em `sanity.config.ts`.
- **Marca:** o ícone do workspace (o gato do mosaico, simplificado) e o tema ficam em [`marca/`](marca). O tema usa vinho como cor primária e na barra de navegação, malva no lugar do cinza e a fonte DM Sans, carregada pelo pacote `@fontsource-variable/dm-sans` (sem depender do Google Fonts). Ele é montado com `buildLegacyTheme`, a única API de tema pública do Sanity 6, marcada como deprecated: ao atualizar o Sanity de major, confira se ela ainda existe.
- **Vision** (playground de GROQ): só aparece no `pnpm studio:dev`. O Studio publicado não tem, porque a autora não precisa dele.

## Variáveis de ambiente

Ficam em `studio/.env` (não versionado). O Sanity só expõe ao Studio as variáveis com prefixo `SANITY_STUDIO_`.

| Variável                   | Exemplo       | Uso                                                        |
| -------------------------- | ------------- | ---------------------------------------------------------- |
| `SANITY_STUDIO_PROJECT_ID` | `a1b2c3d4`    | ID do projeto "Ronrom" em sanity.io/manage                 |
| `SANITY_STUDIO_DATASET`    | `development` | Dataset que o Studio edita (`development` ou `production`) |

Sem elas o Studio não abre e mostra qual variável falta.

### Tokens

Tokens **nunca** entram no código nem em `.env` versionado. São criados em sanity.io/manage → projeto → API → Tokens e guardados nos Secrets do GitHub (Settings → Secrets and variables → Actions) e nas variáveis de ambiente da Vercel.

| Nome do token        | Permissão     | Variável                | Onde fica       | Uso                                     |
| -------------------- | ------------- | ----------------------- | --------------- | --------------------------------------- |
| `viewer`             | Viewer        | `SANITY_API_READ_TOKEN` | GitHub e Vercel | Ler rascunhos no preview e fazer backup |
| `studio-deploy-ci-5` | Deploy Studio | `SANITY_AUTH_TOKEN`     | GitHub          | `sanity deploy` no CI                   |

`SANITY_AUTH_TOKEN` é o nome que a CLI do Sanity lê para autenticar sem `sanity login`. Nenhum token grava conteúdo: seed e scripts como o da taxonomia rodam da máquina de quem mantém o projeto, com `sanity login`.

Crie o token de deploy pelo site (API → Tokens → Add API token, permissão Deploy Studio), não pela CLI: o `sanity tokens add --grant deploy-studios` cria o token mas não mostra o valor. O token aparece uma vez só; para salvar no GitHub sem colar no terminal, copie e rode no PowerShell `gh secret set SANITY_AUTH_TOKEN --body (Get-Clipboard)`.

## Projeto no Sanity (plano Free)

Configuração feita uma vez, em [sanity.io/manage](https://www.sanity.io/manage), com a conta do dono do repositório:

- **Projeto:** "Ronrom", plano Free (até 20 usuários, 2 datasets públicos, 10 mil documentos, papéis Administrator e Viewer, histórico de 3 dias, sem backups).
- **Datasets:** `production` e `development`, ambos públicos (o Free não permite privados).
- **CORS** (API → CORS origins): `http://localhost:3333` **com** credenciais (o Studio faz login por cookie) e `http://localhost:4321` sem credenciais (Astro dev). Os domínios de produção e de preview da Vercel entram depois.

Pela CLI, depois de `pnpm --filter studio sanity login`:

```bash
pnpm --filter studio sanity datasets create production --visibility public
pnpm --filter studio sanity datasets create development --visibility public
pnpm --filter studio sanity cors add http://localhost:3333 --credentials
pnpm --filter studio sanity cors add http://localhost:4321 --no-credentials
pnpm --filter studio sanity tokens add viewer --role viewer
```

O token de deploy é criado pelo site (veja [Tokens](#tokens)). O primeiro deploy, que registra `ronrom.sanity.studio`, foi feito com `pnpm studio:deploy` da máquina do dono, logado como administrador.

### Rascunhos em dataset público

Num dataset público, qualquer pessoa lê os documentos publicados sem token, mas os rascunhos (IDs `drafts.*`) e versões só aparecem para quem tem token. Para conferir, esta consulta sem token deve voltar `0` mesmo com um rascunho salvo no Studio:

```bash
curl "https://<projectId>.apicdn.sanity.io/v2025-02-19/data/query/development?query=count(*%5B_id%20in%20path(%22drafts.**%22)%5D)"
```

Por isso o preview de rascunhos no site usa o token `viewer`, e nada sensível deve ser guardado em documentos publicados.
