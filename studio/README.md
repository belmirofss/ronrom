# Studio (Sanity)

Painel de edição do Ronrom, feito com o [Sanity Studio](https://www.sanity.io/docs/studio) (v6, TypeScript). Fica no monorepo ao lado do site (`web/`) para que schemas, consultas GROQ e tipos gerados andem juntos. O Studio publicado é hospedado pelo Sanity em `https://ronrom.sanity.studio`; ele não faz parte do build do Astro nem da Vercel.

## Rodar localmente

1. Instale as dependências na raiz do repositório: `pnpm install`.
2. Copie `studio/.env.example` para `studio/.env` e preencha as variáveis (tabela abaixo).
3. Na raiz, rode `pnpm studio:dev` e abra `http://localhost:3333`. O Studio pede login com uma conta que seja membro do projeto no Sanity.

| Comando (na raiz)    | O que faz                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm studio:dev`    | Sobe o Studio em `http://localhost:3333`                                                           |
| `pnpm studio:build`  | Gera o Studio estático em `studio/dist`                                                            |
| `pnpm studio:deploy` | Faz o build e publica em `ronrom.sanity.studio` (pede `sanity login` ou `SANITY_AUTH_TOKEN`)       |
| `pnpm typecheck`     | Roda o `tsc --noEmit` no site e no Studio                                                          |
| `pnpm typegen`       | Gera os tipos das consultas do site a partir dos schemas ([veja](../web/src/lib/sanity/README.md)) |
| `pnpm seed`          | Popula o dataset `development` com conteúdo de exemplo ([veja](#seed))                             |

Para outros comandos da CLI: `pnpm --filter studio sanity <comando>` (ex.: `pnpm --filter studio sanity login`).

Mudou um schema? Rode `pnpm typegen` e commite o `web/src/lib/sanity/tipos.gerados.d.ts` junto: o CI falha se os tipos do site ficarem desatualizados.

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

Ficam em [`schemaTypes/`](schemaTypes); campos repetidos (nome, slug, descrição, ordem, texto alternativo, legenda, descrição e imagem de SEO) em [`schemaTypes/campos.ts`](schemaTypes/campos.ts).

| Tipo            | Campos                                              | Observação                                                     |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `post`          | veja [Post](#post)                                  | Review e pensamento num tipo só, separados pelo campo `tipo`   |
| `categoria`     | `nome`, `slug`, `descricao`, `ordem`, `modeloFicha` | Categorias das reviews; `modeloFicha` define a ficha da review |
| `formato`       | `nome`, `slug`, `descricao`, `ordem`                | Formatos dos pensamentos                                       |
| `tag`           | `nome`, `slug`                                      | Escondido: o site não mostra mais tags (#145)                  |
| `configuracoes` | veja [Singletons](#singletons)                      | Singleton com `_id` `configuracoes`                            |
| `sobre`         | veja [Singletons](#singletons)                      | Singleton com `_id` `sobre`                                    |

Slugs seguem a [política de URLs](../docs/seo-urls.md#slugs): o botão "Gerar" usa o `slugify` de [`lib/slug.ts`](lib/slug.ts), que tira acentos e cedilha ("Séries" vira `series`), e a validação recusa slug fora do formato e o reservado `pagina`. A unicidade é a padrão do Sanity, dentro do mesmo tipo: duas categorias não podem ter o mesmo slug, mas uma categoria e um formato podem. O post usa o mesmo `campoSlug`.

### Post

Um único tipo `post`, com o campo `tipo` (`review` ou `pensamento`), para que slug, listagens, "Mais lidos" e busca usem um namespace e uma consulta só. O formulário tem três abas: **Conteúdo**, **Review** (só em review) e **SEO**.

| Campo              | Regras                                                                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tipo`             | Obrigatório; fica só leitura assim que é escolhido, porque faz parte do endereço                                                                                                                                                                    |
| `categoria`        | Referência, obrigatória e visível só em review                                                                                                                                                                                                      |
| `formato`          | Referência, obrigatória e visível só em pensamento                                                                                                                                                                                                  |
| `nota`             | De meio a 5 corações, em passos de meio; obrigatória e visível só em review, recusada em pensamento                                                                                                                                                 |
| `ficha`            | Dados técnicos da review, que mudam conforme o modelo de ficha da categoria; veja "Ficha da review" abaixo                                                                                                                                          |
| `titulo`           | Obrigatório; aviso acima de 70 caracteres                                                                                                                                                                                                           |
| `subtitulo`        | Opcional                                                                                                                                                                                                                                            |
| `slug`             | Gerado do título, obrigatório e único entre os posts                                                                                                                                                                                                |
| `dataDePublicacao` | Obrigatória, começa com a hora da criação e não aceita data no futuro (não há agendamento)                                                                                                                                                          |
| `capa`             | Imagem com hotspot, obrigatória; `alt` obrigatório e `legenda` (legenda ou crédito) opcional                                                                                                                                                        |
| `corpo`            | Portable Text com estilos, listas, links, imagem, galeria, vídeo e citação em destaque; veja "Texto do post" abaixo                                                                                                                                 |
| `tags`             | Escondido (#145): o site não mostra mais tags; o campo fica só para não perder o que já foi preenchido. O tipo `tag` continua registrado pelo mesmo motivo, fora da estrutura e do menu "Criar". Para tirar de vez, apague os dois com uma migração |
| `seo`              | `titulo` (aviso acima de 60), `descricao` (aviso acima de 160), `imagem` (`alt` obrigatório se houver imagem), `noindex`                                                                                                                            |
| `slugsAnteriores`  | Caminhos antigos do post, só leitura, dentro de "Avançado" na aba SEO                                                                                                                                                                               |

A lista de posts mostra a capa, o título e um subtítulo como "Review · Filmes · ♥♥♥½" ou "Pensamento · Frases soltas"; as funções puras por trás disso (caminho, slugs anteriores, data, corações) ficam em [`lib/post.ts`](lib/post.ts), com testes.

**Nota em corações.** A `nota` aparece nas abas Conteúdo e Review e usa o input de [`componentes/InputDeNota.tsx`](componentes/InputDeNota.tsx): 5 corações (vinho quando preenchido, contorno rosa quando vazio), em que clicar no coração grava a nota inteira e clicar na metade esquerda grava meio a menos (4º coração: `4`; metade esquerda dele: `3.5`). Passar o mouse pré-visualiza a nota, e o botão "Limpar" apaga. Por baixo são 10 radios nativos, de "meio coração" a "5 corações": as setas do teclado andam de meio em meio. As regras (valores aceitos, rótulos, validação) ficam em [`lib/nota.ts`](lib/nota.ts), com testes. A lista de posts mostra a nota em texto (♥ e ½), porque o Sanity só aceita texto no subtítulo da lista de documentos.

**Ficha da review.** A `ficha` fica na aba Review e usa o input de [`componentes/FichaInput.tsx`](componentes/FichaInput.tsx). Como o `hidden` do Sanity não enxerga campos da categoria referenciada, o input lê `categoria._ref`, busca o `modeloFicha` dela (e escuta mudanças) e mostra só os campos daquele modelo. Sem categoria, mostra "Escolha a categoria para preencher a ficha." Os campos e as regras ficam em [`lib/ficha.ts`](lib/ficha.ts), com testes (a projeção GROQ é conferida com o `groq-js`):

| Modelo  | Categorias                           | Campos (obrigatório em **negrito**)                                                                                                           |
| ------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `filme` | Filmes, Documentários                | **`direcao`**, `ano`, `duracao` (minutos), `ondeVi` (`meio`: cinema ou streaming, `qual`)                                                     |
| `serie` | Séries                               | **`criacao`**, `anoDeEstreia`, `anoDeFim` (vazio se ainda está no ar), `temporadasVistas`, `ondeVi`                                           |
| `livro` | Livros                               | **`autoria`**, `editora`, `ano`, `paginas`, `formatoDoLivro` (`fisico`, `ebook` ou `audiobook`)                                               |
| `lugar` | Restaurantes e cafés, Outros lugares | `endereco` (**`rua`**, `bairro`, **`cidade`**, **`uf`**), `linkDoMapa`, `faixaDePreco` (R$ a R$$$$), `tipoDeCozinha`, `oQuePedi`, `instagram` |
| todos   |                                      | `valeAPena` (frase curta opcional)                                                                                                            |

Os campos de todos os modelos ficam num objeto só e sem prefixo; os que têm o mesmo sentido em mais de um modelo (`ano`, `ondeVi`) têm o mesmo nome e continuam valendo ao trocar de categoria. Os obrigatórios são conferidos por uma validação que também busca o modelo da categoria. Ao trocar para uma categoria de outro modelo, nada é apagado em silêncio: o input lista os campos preenchidos que deixaram de valer e oferece o botão "Apagar esses campos". Eles ficam guardados, mas o site não os lê: as consultas usam o `FICHA_NO_GROQ` de `lib/ficha.ts` (`"ficha": ${FICHA_NO_GROQ}`), que devolve só os campos do modelo da categoria, mais o `modelo` que os identifica, e `null` em pensamento ou sem ficha. A projeção é escrita por extenso, porque o typegen não roda código ([`web/src/lib/sanity`](../web/src/lib/sanity/README.md)); um teste confere que cada modelo traz os campos de `CAMPOS_DA_FICHA`. A lista de campos foi aprovada na #1 e pode mudar depois do onboarding da autora (#31).

**Texto do post.** O `corpo` fica em [`schemaTypes/corpo.ts`](schemaTypes/corpo.ts) e oferece só o que o layout "Caderno" do site sabe mostrar (WEB-09), com rótulos e ícones em pt-BR:

| Na barra          | Opções                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Estilos           | Parágrafo, Subtítulo (`h2`), Subtítulo menor (`h3`) e Citação (`blockquote`); sem `h1`, porque o título do post já é o `h1`             |
| Formatação        | Negrito e itálico; sublinhado e código ficam desligados                                                                                 |
| Listas            | Com marcadores e numerada                                                                                                               |
| Links             | `link` (externo, `href` obrigatório em `http`, `https` ou `mailto`) e `linkInterno` (referência a outro post, sem criar post pelo link) |
| `imagem`          | Imagem com hotspot; `alt` obrigatório, `legenda` opcional e `largura` (`normal` ou `larga`); sem a imagem, o bloco não deixa publicar   |
| `galeria`         | `imagens`: de 2 a 12 imagens com hotspot, cada uma com `alt` obrigatório e `legenda` opcional; no editor, as miniaturas de todas        |
| `video`           | `url` obrigatória (YouTube ou Instagram), `legenda` opcional e, escondidos, `provedor` e `idVideo`; no editor, a miniatura ou um cartão |
| `citacaoDestaque` | `texto` obrigatório e `fonte` (autor ou fonte) opcional, mostrada no editor em letra grande e vinho, parecida com o site                |

O `linkInterno` guarda o `_id` do post, não o endereço: o link continua certo depois que o destino muda de slug, categoria ou formato. Como a referência é forte, o Sanity não deixa apagar um post que outro post linka (ele mostra quais). As consultas do site usam o `CORPO_NO_GROQ` de [`lib/corpo.ts`](lib/corpo.ts) (`"corpo": ${CORPO_NO_GROQ}`), que troca cada referência pelo post de destino com os slugs já resolvidos para o `urlDoPost`; destino ainda não publicado vem como `post: null`, e o site mostra só o texto. A mesma projeção expande o asset das imagens soltas e das da galeria com o `IMAGEM_NO_GROQ` de [`lib/imagem.ts`](lib/imagem.ts) (URL, dimensões e `lqip`). As duas têm testes com o `groq-js`.

**Vídeo e galeria.** As regras ficam em [`lib/video.ts`](lib/video.ts) e [`lib/galeria.ts`](lib/galeria.ts), com testes. O `video` aceita `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/` e `instagram.com/p/` ou `/reel/`; qualquer outro link é recusado com "Cole o link de um vídeo do YouTube ou de um post do Instagram." O `provedor` (`youtube` ou `instagram`) e o `idVideo` são gravados no próprio bloco pelo input de [`componentes/VideoInput.tsx`](componentes/VideoInput.tsx), a cada link novo, para o site montar o player sem interpretar a URL; se um dia ficarem diferentes do link (documento mudado fora do Studio), a validação não deixa publicar. A prévia ([`componentes/PreviewVideo.tsx`](componentes/PreviewVideo.tsx)) mostra a miniatura do YouTube (`img.youtube.com/vi/<id>/hqdefault.jpg`) ou um cartão do Instagram, que não oferece miniatura sem login; vídeo sem miniatura (apagado ou privado) ou link inválido mostram "Prévia indisponível" com o link. A `galeria` com menos de 2 imagens, mais de 12, imagem sem arquivo ou sem `alt` não publica; para uma foto só, o bloco certo é a `imagem`.

**Endereço antigo.** O botão "Publicar" do post é envolvido por [`acoes/publicarPost.ts`](acoes/publicarPost.ts): ao publicar um post que já estava no ar com outro slug, categoria ou formato, ele guarda o caminho publicado (`/reviews/filmes/slug-antigo`) em `slugsAnteriores`, para a #53 gerar o redirect. Se a consulta ao Sanity falhar, o post não é publicado e a autora vê um aviso para tentar de novo. Mudar o slug, a categoria ou o formato de um post publicado mostra um aviso amarelo no campo, sem impedir a publicação. No build seguinte, cada caminho guardado vira um redirect 301 para o endereço atual ([`docs/cabecalhos.md`](../docs/cabecalhos.md#slug-alterado)).

> **Para a autora: mudou o slug? O endereço antigo continua funcionando.** Pode trocar o slug, a categoria ou o formato de um post que já está no ar. Ao publicar, o Studio guarda o endereço antigo (em "Slugs anteriores", dentro de "Avançado" na aba SEO), e uns minutos depois, quando o site atualiza, quem abrir o link antigo (num compartilhamento, no Google) cai direto no endereço novo. O Google também passa a mostrar o endereço novo, sem perder o que o post já tinha conquistado. Não precisa mexer em "Slugs anteriores". Só evite usar num post novo o slug antigo de outro post: o link antigo passa a abrir o post novo.

### Singletons

Dois documentos únicos, registrados em `document.singletons` no [`sanity.config.ts`](sanity.config.ts) (API nativa do Sanity 6, ainda beta), com `_id` igual ao nome do tipo. O site lê os dois por esse `_id`. O Sanity tira os dois do menu "Criar" e tira o "Duplicar"; a configuração tira também "Excluir" e "Despublicar" ([`lib/estrutura.ts`](lib/estrutura.ts)), para o site nunca ficar sem eles. O documento passa a existir na primeira vez que a autora publica.

**Configurações do site** ([`schemaTypes/configuracoes.ts`](schemaTypes/configuracoes.ts)), abas Home e SEO e redes:

| Campo            | Regras                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `fraseDaSemana`  | "Frase em destaque": `texto` (aviso acima de 280), `autoria` e `data` opcionais; autor ou data sem texto é erro |
| `postEmDestaque` | Referência a post, só publicado (a validação confere); vazio, a home usa o post mais recente                    |
| `seo`            | SEO padrão do site: `descricao` (aviso se vazia ou acima de 160) e `imagem` (`alt` obrigatório se houver)       |
| `redes[]`        | `rede` (Instagram, TikTok, YouTube, Letterboxd, Goodreads, Skoob, Pinterest ou Outra) e `url` (https)           |

O destaque da home saiu do post (era o boolean `destaque`): com um só post escolhido aqui, não existe o caso de dois posts ligados ao mesmo tempo.

As `redes` são o canal da `/privacidade` para os pedidos sobre os dados (a LGPD pede um; o Sobre mim não tem e-mail, #146). Mantenha ao menos uma preenchida: sem nenhuma, a página só manda para o `/sobre`.

**Sobre mim** ([`schemaTypes/sobre.ts`](schemaTypes/sobre.ts)), abas Conteúdo e SEO:

| Campo   | Regras                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `nome`  | Obrigatório                                                                                                                |
| `foto`  | Imagem com hotspot, obrigatória, com `alt` obrigatório                                                                     |
| `bio`   | Bio curta da barra lateral, obrigatória, até 200 caracteres (erro)                                                         |
| `texto` | Portable Text simples, um pedaço do `corpo`: parágrafo, subtítulo (`h2`), lista, negrito, itálico e o mesmo `link` externo |
| `seo`   | `descricao` e `imagem`, opcionais; vazios, o site usa a bio e a foto                                                       |

### Prévia (aba Apresentação)

A aba **Apresentação** é o [Presentation](https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool) do Sanity, configurado no [`sanity.config.ts`](sanity.config.ts) com as regras de [`lib/previa.ts`](lib/previa.ts) (com testes). Ela abre o site da prévia num painel ao lado do editor, com o rascunho atual no layout do site; ao editar, a prévia recarrega. Clicar num texto da prévia (título, subtítulo, parágrafos, legendas, ficha) abre o campo dele no editor.

- **Endereço:** `https://ronrom-previa.vercel.app`, um segundo projeto da Vercel ([`docs/ambientes.md`](../docs/ambientes.md#prévia-de-rascunhos-ronrom-previa), [ADR 0006](../docs/adr/0006-previa-de-rascunhos-em-projeto-separado.md)). Para o site local, `SANITY_STUDIO_PREVIEW_URL=http://localhost:4321` no `studio/.env`.
- **Entrada:** o Presentation gera um segredo temporário e abre `/api/previa/ativar` com ele; o site confere o segredo e só então mostra rascunhos (`previewMode`).
- **De documento para página** (`resolve.locations`): o post abre na página dele (o mesmo caminho do `caminhoDoPost`) e na home; sem tipo, categoria ou formato e slug, aparece um aviso. As Configurações abrem a home, e o Sobre mim, a página `/sobre` e a home.
- **De página para documento** (`resolve.mainDocuments`): ao navegar na prévia, `/reviews/{categoria}/{slug}` e `/pensamentos/{formato}/{slug}` abrem o post, `/sobre` abre o Sobre mim e `/` abre as Configurações.

### Navegação

A lista da esquerda é montada em [`estrutura.ts`](estrutura.ts), com os filtros e valores iniciais em [`lib/estrutura.ts`](lib/estrutura.ts) (com testes, os filtros conferidos com o `groq-js`):

- **Reviews**: "Todas as reviews" e uma subpasta por categoria publicada, na `ordem` do menu do site.
- **Pensamentos**: "Todos os pensamentos" e uma subpasta por formato.
- **Rascunhos**: todo post com mudança não publicada (`_originalId in path("drafts.**")`: as listas consultam na perspectiva de rascunhos, em que o `_id` já vem sem o `drafts.`), o que nunca foi ao ar e o que foi editado depois, do mais recente para o mais antigo (`_updatedAt`).
- Configurações do site e Sobre mim.
- Categorias e Formatos.

As listas de posts começam ordenadas pela data de publicação, mais recente primeiro. O "+" de cada lista cria o post certo: "Nova review" e "Novo pensamento" já vêm com o `tipo`; dentro de uma subpasta, também com a categoria ou o formato (modelos `review-da-categoria` e `pensamento-do-formato`, com o `_id` como parâmetro). Com o `keepPanesOnCreate` do `structureTool`, o post novo abre ao lado da lista, sem esconder as pastas. No menu "Criar" do topo aparecem só "Nova review" e "Novo pensamento", além de categoria e formato: o modelo padrão do post, sem tipo, e o da tag (#145) foram tirados.

As subpastas são lidas ao abrir Reviews ou Pensamentos: uma categoria ou um formato novo aparece depois de recarregar o Studio.

### Taxonomia inicial

As 6 categorias e os 2 formatos de [`lib/taxonomia.ts`](lib/taxonomia.ts) (nomes, slugs, descrições e `_id` fixos, como `categoria-filmes`) são gravados por [`scripts/criar-taxonomia.ts`](scripts/criar-taxonomia.ts). Ele usa `createOrReplace`, então rodar de novo não duplica nada, mas **desfaz edições** feitas no Studio nesses oito documentos (nome, descrição, ordem). Depois que a autora começar a editar, mude o arquivo antes de rodar de novo.

Com `studio/.env` preenchido e `sanity login` feito, na raiz (o token do CI só publica o Studio e não grava conteúdo):

```bash
pnpm --filter studio taxonomia --dataset development
```

```bash
pnpm --filter studio taxonomia --dataset production
```

O dataset é sempre explícito: sem `--dataset`, o script não grava nada.

### Migrações

Um PR que muda o conteúdo com um script de `scripts/` (como os dois abaixo) entra em produção em duas partes: o script, que alguém roda à mão em cada dataset, e o código, que vai ao ar no merge. A Vercel builda a `main` contra o `production`, então **a migração vem antes do merge**:

1. No PR, escreva a migração e o código que depende dela. O script tem de deixar o código no ar funcionando: entre a migração e o merge, o site é o código antigo com o dataset novo.
2. Rode o script no `development` e no `production`, primeiro sem `--gravar` (confira o plano) e depois com `--gravar`.
3. Rode de novo o check `ci / build-producao` do PR (Re-run jobs). Ele faz o mesmo build da Vercel, só lendo o `production`, e fica vermelho enquanto o código depender de algo que o dataset ainda não tem, como um redirect fixo por cima de uma listagem que ainda está no ar (#150, #155).
4. Só com ele verde, faça o merge.

Merge antes da migração não derruba o site, mas o deploy da Vercel falha e a produção fica presa no anterior até alguém gravar a migração e fazer um redeploy.

### Revisão das categorias

Na #142, Documentários entrou (ficha de filme, logo depois de Séries), Lugares passou a se chamar "Outros lugares" (o slug `lugares` continua) e Comidas saiu, junto com o modelo de ficha `comida` ([`docs/seo-urls.md`](../docs/seo-urls.md#categorias-reviews)). O [`scripts/revisar-categorias.ts`](scripts/revisar-categorias.ts) leva cada dataset para a taxonomia nova, numa transação só:

- grava as seis categorias de [`lib/taxonomia.ts`](lib/taxonomia.ts) (como o `taxonomia`, desfaz edições feitas nelas no Studio);
- apaga a `categoria-comidas`, publicada e rascunho.

Enquanto algum documento (publicado, rascunho ou versão de lançamento) apontar para Comidas, o script lista quais são e não grava nada: mude a categoria desses posts antes. Sem `--gravar`, só mostra o que faria. Rodar de novo não muda nada. Na raiz, confira o plano e depois grave:

```bash
pnpm --filter studio revisar-categorias --dataset production
```

```bash
pnpm --filter studio revisar-categorias --dataset production --gravar
```

No `development`, rode antes o `pnpm seed`, que passa a review de exemplo de Comidas para Documentários. **A ordem importa:** grave no dataset antes do merge do PR. Enquanto a categoria existe, a listagem `/reviews/comidas` está no ar, e o build recusa o redirect fixo de [`web/redirects.mjs`](../web/redirects.mjs) por cima dela. O código anterior funciona com o dataset migrado: a listagem de Comidas some até o merge.

### Unificação dos formatos

Na #143, Artigos, Textos e Opiniões viraram um formato só, "Textos e opiniões", com o slug `textos` ([`docs/seo-urls.md`](../docs/seo-urls.md#formatos-pensamentos)). O [`scripts/unificar-formatos.ts`](scripts/unificar-formatos.ts) leva cada dataset para a taxonomia nova, numa transação só:

- grava o nome, a descrição e a ordem novos dos dois formatos (como o `taxonomia`, desfaz edições feitas neles no Studio);
- passa os posts de Artigos e Opiniões, publicados, rascunhos e versões de lançamento, para "Textos e opiniões";
- guarda o endereço antigo de cada post publicado (`/pensamentos/artigos/slug`) em `slugsAnteriores`, como faria o "Publicar", para o build gerar o redirect 301;
- apaga os formatos `formato-artigos` e `formato-opinioes`.

Sem `--gravar`, só mostra o que faria. Rodar de novo não muda nada. Na raiz, confira o plano e depois grave:

```bash
pnpm --filter studio unificar-formatos --dataset production
```

```bash
pnpm --filter studio unificar-formatos --dataset production --gravar
```

Rode no `development` do mesmo jeito (o `pnpm seed` já grava os posts no formato novo, mas não apaga os formatos antigos). **A ordem importa:** grave no dataset antes do merge do PR. Enquanto um formato antigo tem posts, a listagem dele está no ar, e o build recusa o redirect fixo de [`web/redirects.mjs`](../web/redirects.mjs) por cima dela. O código anterior funciona com o dataset migrado: as listagens antigas somem até o merge, e os posts já redirecionam pelo `slugsAnteriores`.

### Seed

Conteúdo de exemplo para desenvolver e testar o site antes da autora escrever. Grava **só no dataset `development`**: [`scripts/seed.ts`](scripts/seed.ts) grava a taxonomia inicial e, depois, o conteúdo de [`seed/conteudo.ts`](seed/conteudo.ts):

- **12 posts:** uma review por categoria, com nota e ficha preenchidas, e pensamentos dos dois formatos. Entre eles, uma frase bem curta ("Café primeiro."), um texto longo ("Por que eu ainda escrevo à mão"), três posts sem subtítulo e a review de "Dias Perfeitos", com todos os blocos do texto (imagem, galeria, vídeo do YouTube e do Instagram, citação em destaque, citação, listas, link externo e link para outro post).
- As **Configurações do site** (frase em destaque, post em destaque, SEO e redes) e o **Sobre mim**.
- **10 imagens** de [`seed/imagens`](seed/imagens): ilustrações próprias com a paleta do Ronrom, sem direitos de terceiros, enviadas como assets.

Com `studio/.env` preenchido e `sanity login` feito (o token do usuário é o token de escrita, como na taxonomia), na raiz:

```bash
pnpm seed
```

```bash
pnpm seed --reset
```

Os documentos têm `_id` fixo com o prefixo `seed-` (`seed-post-01`), as datas são fixas e tudo é gravado com `createOrReplace`: rodar de novo não duplica nada e desfaz edições feitas nos documentos do seed. As imagens não duplicam, porque o Sanity identifica o asset pelo conteúdo do arquivo. Leva menos de 10 segundos.

O `--reset` apaga antes todos os documentos `seed-*`, publicados e rascunhos, inclusive os que saíram do seed, e tira o destaque da home se ele for um post do seed. Não apaga a taxonomia, os singletons (que o seed sobrescreve) nem os assets. Se um documento seu referenciar um post do seed, o Sanity recusa o reset e mostra qual.

**Trava:** o seed só aceita o dataset `development`, mesmo com `SANITY_STUDIO_DATASET=production` no `.env`. Com `SANITY_DATASET` com qualquer outro valor, ele aborta antes de gravar:

```bash
SANITY_DATASET=production pnpm seed
```

O link do Instagram do post "Dias Perfeitos" é fictício (`/p/DExemploRonrom/`): passa na validação do Studio, mas o embed do site mostra o post indisponível.

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

| Nome do token        | Permissão     | Variável                | Onde fica                         | Uso                                    |
| -------------------- | ------------- | ----------------------- | --------------------------------- | -------------------------------------- |
| `viewer`             | Viewer        | `SANITY_API_READ_TOKEN` | GitHub e Vercel (`ronrom-previa`) | Ler rascunhos na prévia e fazer backup |
| `studio-deploy-ci-5` | Deploy Studio | `SANITY_AUTH_TOKEN`     | GitHub                            | `sanity deploy` no CI                  |

`SANITY_AUTH_TOKEN` é o nome que a CLI do Sanity lê para autenticar sem `sanity login`. Nenhum token grava conteúdo: seed e scripts como o da taxonomia rodam da máquina de quem mantém o projeto, com `sanity login`.

Crie o token de deploy pelo site (API → Tokens → Add API token, permissão Deploy Studio), não pela CLI: o `sanity tokens add --grant deploy-studios` cria o token mas não mostra o valor. O token aparece uma vez só; para salvar no GitHub sem colar no terminal, copie e rode no PowerShell `gh secret set SANITY_AUTH_TOKEN --body (Get-Clipboard)`.

## Projeto no Sanity (plano Free)

Configuração feita uma vez, em [sanity.io/manage](https://www.sanity.io/manage), com a conta do dono do repositório:

- **Projeto:** "Ronrom", plano Free (até 20 usuários, 2 datasets públicos, 10 mil documentos, papéis Administrator e Viewer, histórico de 3 dias, sem backups).
- **Datasets:** `production` e `development`, ambos públicos (o Free não permite privados).
- **CORS** (API → CORS origins): `http://localhost:3333` **com** credenciais (o Studio faz login por cookie) e, sem credenciais, `http://localhost:4321` (Astro dev) e `https://ronrom.blog` (o site em produção, no domínio próprio da #63). Os previews da Vercel não estão na lista: o site busca o conteúdo no build, não no navegador.

Pela CLI, depois de `pnpm --filter studio sanity login`:

```bash
pnpm --filter studio sanity datasets create production --visibility public
pnpm --filter studio sanity datasets create development --visibility public
pnpm --filter studio sanity cors add http://localhost:3333 --credentials
pnpm --filter studio sanity cors add http://localhost:4321 --no-credentials
pnpm --filter studio sanity cors add https://ronrom.blog --no-credentials
pnpm --filter studio sanity tokens add viewer --role viewer
```

O token de deploy é criado pelo site (veja [Tokens](#tokens)). O primeiro deploy, que registra `ronrom.sanity.studio`, foi feito com `pnpm studio:deploy` da máquina do dono, logado como administrador.

### Rascunhos em dataset público

Num dataset público, qualquer pessoa lê os documentos publicados sem token, mas os rascunhos (IDs `drafts.*`) e versões só aparecem para quem tem token. Para conferir, esta consulta sem token deve voltar `0` mesmo com um rascunho salvo no Studio:

```bash
curl "https://<projectId>.apicdn.sanity.io/v2025-02-19/data/query/development?query=count(*%5B_id%20in%20path(%22drafts.**%22)%5D)"
```

Por isso a prévia de rascunhos usa o token `viewer`, e nada sensível deve ser guardado em documentos publicados.
