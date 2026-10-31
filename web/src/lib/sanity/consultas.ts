import { defineQuery } from 'groq';

import { CORPO_NO_GROQ } from '../../../../studio/lib/corpo';
import { FICHA_NO_GROQ } from '../../../../studio/lib/ficha';
import { IMAGEM_NO_GROQ } from '../../../../studio/lib/imagem';

// Todas as consultas GROQ do site. O formato de cada resultado está no README desta pasta, e os
// tipos saem do `pnpm typegen` (tipos.gerados.d.ts). O typegen lê as consultas sem rodar o código:
// os pedaços reaproveitados são só template literals com outras constantes, sem chamar função.
// As projeções do corpo, da ficha e das imagens vêm do Studio (studio/lib), junto dos schemas.

// Conteúdo público: nunca rascunho nem versão de release, e só post com data que já chegou (o
// Studio não deixa escolher data no futuro, mas o documento pode vir de outro lugar, como a API).
// `dateTime()` compara instantes: comparar os textos erraria com fusos ou milissegundos diferentes.
const PUBLICADO = `!(_id in path("drafts.**")) && !(_id in path("versions.**"))`;
const POST_PUBLICADO = `_type == "post" && ${PUBLICADO} && dateTime(dataDePublicacao) <= dateTime(now())`;

// Ordem das listas: mais recente primeiro. O `_id` desempata posts com a mesma data, para a
// paginação não repetir nem pular post entre uma página e outra.
const MAIS_RECENTES = `order(dataDePublicacao desc, _id asc)`;

const TAXONOMIA = `{ nome, "slug": slug.current }`;

// O que o `urlDoPost` (web/src/lib/rotas.ts, docs/seo-urls.md) precisa: tipo e slugs resolvidos.
const ROTA = `tipo, "slug": slug.current, categoria->{ "slug": slug.current }, formato->{ "slug": slug.current }`;

// Card de post no "Leia também" e no índice. Também traz o que o `urlDoPost` precisa.
const CAMPOS_DO_CARD = `
  _id,
  tipo,
  titulo,
  subtitulo,
  "slug": slug.current,
  dataDePublicacao,
  nota,
  "categoria": categoria->${TAXONOMIA},
  "formato": formato->${TAXONOMIA},
  "capa": capa${IMAGEM_NO_GROQ}
`;
const CARD = `{${CAMPOS_DO_CARD}}`;

// Card do destaque e das listagens, que mostram o tempo de leitura: o card e só o texto dos blocos
// do corpo, o que o `tempoDeLeitura` conta. Imagens, vídeos e marcas ficam de fora.
const CARD_COM_LEITURA = `{${CAMPOS_DO_CARD},
  "textoDoCorpo": corpo[_type == "block"]{ _type, children[]{ text } }
}`;

// Página de uma listagem: a fatia `[$inicio...$fim]` (fim exclusivo) e o total, para saber quantas
// páginas gerar. A página n de 12 posts usa inicio = (n - 1) * 12 e fim = n * 12.
const PAGINA_DE_POSTS = (filtro: string) => `
  "posts": *[${POST_PUBLICADO} && ${filtro}] | ${MAIS_RECENTES} [$inicio...$fim]${CARD_COM_LEITURA},
  "total": count(*[${POST_PUBLICADO} && ${filtro}])
`;

// Quantos posts o "Leia também" mostra.
const LEIA_TAMBEM = 3;

// Quantos posts o /rss.xml traz (#52).
const POSTS_NO_FEED = 30;

// --- Site ---

// Singleton `configuracoes`: frase da semana, SEO padrão e redes. O destaque tem consulta própria.
export const CONSULTA_DAS_CONFIGURACOES = defineQuery(`*[_id == "configuracoes"][0]{
  fraseDaSemana,
  seo{ descricao, "imagem": imagem${IMAGEM_NO_GROQ} },
  redes[]{ rede, url }
}`);

// Singleton `sobre`: barra lateral, páginas /sobre e /privacidade (o e-mail) e o `Person` do
// JSON-LD. O texto só tem links externos, que não precisam ser resolvidos.
export const CONSULTA_DO_SOBRE = defineQuery(`*[_id == "sobre"][0]{
  _updatedAt,
  nome,
  email,
  bio,
  "foto": foto${IMAGEM_NO_GROQ},
  texto,
  seo{ descricao, "imagem": imagem${IMAGEM_NO_GROQ} }
}`);

// --- Home e listagens ---

// Post escolhido em Configurações do site ou, sem escolha (ou com um post que saiu do ar), o mais
// recente. `null` só sem nenhum post publicado.
export const CONSULTA_DO_DESTAQUE = defineQuery(`coalesce(
  *[${POST_PUBLICADO} && _id == *[_id == "configuracoes"][0].postEmDestaque._ref][0]${CARD_COM_LEITURA},
  *[${POST_PUBLICADO}] | ${MAIS_RECENTES} [0]${CARD_COM_LEITURA}
)`);

// Todos os posts (/posts e o resto da home). Parâmetros: $inicio e $fim.
export const CONSULTA_DOS_ULTIMOS_POSTS = defineQuery(`{${PAGINA_DE_POSTS('true')}}`);

// /reviews e /pensamentos. Parâmetros: $tipo ("review" ou "pensamento"), $inicio e $fim.
export const CONSULTA_DOS_POSTS_DO_TIPO = defineQuery(`{${PAGINA_DE_POSTS('tipo == $tipo')}}`);

// /reviews/[categoria]. Parâmetros: $categoria (slug), $inicio e $fim. `categoria` vem `null` se o
// slug não existe.
export const CONSULTA_DOS_POSTS_DA_CATEGORIA = defineQuery(`{
  "categoria": *[_type == "categoria" && ${PUBLICADO} && slug.current == $categoria][0]{
    nome, "slug": slug.current, descricao
  },
  ${PAGINA_DE_POSTS('tipo == "review" && categoria->slug.current == $categoria')}
}`);

// /pensamentos/[formato]. Parâmetros: $formato (slug), $inicio e $fim. `formato` vem `null` se o
// slug não existe.
export const CONSULTA_DOS_POSTS_DO_FORMATO = defineQuery(`{
  "formato": *[_type == "formato" && ${PUBLICADO} && slug.current == $formato][0]{
    nome, "slug": slug.current, descricao
  },
  ${PAGINA_DE_POSTS('tipo == "pensamento" && formato->slug.current == $formato')}
}`);

// /tags/[tag]. Parâmetros: $tag (slug), $inicio e $fim. `tag` vem `null` se o slug não existe.
export const CONSULTA_DOS_POSTS_DA_TAG = defineQuery(`{
  "tag": *[_type == "tag" && ${PUBLICADO} && slug.current == $tag][0]${TAXONOMIA},
  ${PAGINA_DE_POSTS('$tag in tags[]->slug.current')}
}`);

// Menu, getStaticPaths das listagens e contagens. Categorias e formatos vêm na ordem do menu, com
// zero post também (a página da listagem existe vazia). Tags só com post, porque não há índice de
// tags e a página de uma tag sem post não teria o que mostrar.
export const CONSULTA_DA_TAXONOMIA = defineQuery(`{
  "categorias": *[_type == "categoria" && ${PUBLICADO}] | order(ordem asc){
    _id, nome, "slug": slug.current, descricao,
    "total": count(*[${POST_PUBLICADO} && tipo == "review" && categoria._ref == ^._id])
  },
  "formatos": *[_type == "formato" && ${PUBLICADO}] | order(ordem asc){
    _id, nome, "slug": slug.current, descricao,
    "total": count(*[${POST_PUBLICADO} && tipo == "pensamento" && formato._ref == ^._id])
  },
  "tags": *[_type == "tag" && ${PUBLICADO}]{
    _id, nome, "slug": slug.current,
    "total": count(*[${POST_PUBLICADO} && ^._id in tags[]._ref])
  }[total > 0] | order(nome asc)
}`);

// --- Post ---

// Página do post. Parâmetros: $tipo, $secao (slug da categoria, em review, ou do formato, em
// pensamento) e $slug. A ficha traz só os campos do modelo da categoria; o corpo vem com links
// internos e imagens resolvidos; tags apagadas ou não publicadas ficam de fora.
export const CONSULTA_DO_POST = defineQuery(`*[
  ${POST_PUBLICADO} && tipo == $tipo && slug.current == $slug &&
  select(tipo == "review" => categoria->slug.current, formato->slug.current) == $secao
][0]{
  _id,
  _updatedAt,
  tipo,
  titulo,
  subtitulo,
  "slug": slug.current,
  dataDePublicacao,
  "categoria": categoria->{ nome, "slug": slug.current, modeloFicha },
  "formato": formato->${TAXONOMIA},
  nota,
  "ficha": ${FICHA_NO_GROQ},
  "capa": capa${IMAGEM_NO_GROQ},
  "corpo": ${CORPO_NO_GROQ},
  "tags": (tags[]->)[defined(slug.current)]${TAXONOMIA},
  seo{ titulo, descricao, noindex, "imagem": imagem${IMAGEM_NO_GROQ} }
}`);

// getStaticPaths das páginas de post: os parâmetros de cada uma.
export const CONSULTA_DAS_ROTAS_DOS_POSTS = defineQuery(`*[${POST_PUBLICADO}]{ ${ROTA} }`);

// "Leia também" do post de `_id` $id: primeiro os da mesma categoria (ou formato), depois os do
// mesmo tipo, depois os mais recentes, sem o próprio post. Lista vazia se o $id não existe.
export const CONSULTA_DO_LEIA_TAMBEM = defineQuery(`coalesce(*[_type == "post" && _id == $id][0]{
  "posts": *[${POST_PUBLICADO} && _id != ^._id]{
    ...,
    "prioridade": select(
      tipo == ^.tipo && coalesce(categoria._ref, formato._ref) == coalesce(^.categoria._ref, ^.formato._ref) => 2,
      tipo == ^.tipo => 1,
      0
    )
  } | order(prioridade desc, dataDePublicacao desc, _id asc) [0...${LEIA_TAMBEM}]${CARD}
}.posts, [])`);

// --- Dados gerados no build ---

// /posts-index.json, que o "Mais lidos" (#57) cruza com o ranking pelo `_id`. Traz o texto do corpo
// só para o tempo de leitura: o JSON publicado leva o "X min de leitura" pronto, sem o texto.
export const CONSULTA_DO_INDICE_DE_POSTS = defineQuery(
  `*[${POST_PUBLICADO}] | ${MAIS_RECENTES} ${CARD_COM_LEITURA}`,
);

// Os `_id` publicados, que a rota /api/views (#56) aceita. Lidos no build e embutidos na função
// (src/lib/sanity/ids-publicados.ts): um post novo só conta depois do rebuild que o publica.
export const CONSULTA_DOS_IDS_PUBLICADOS = defineQuery(`*[${POST_PUBLICADO}]._id`);

// Redirects 301 (#53): cada caminho antigo de `anteriores` leva ao `urlDoPost` do post atual.
export const CONSULTA_DOS_REDIRECTS = defineQuery(
  `*[${POST_PUBLICADO} && count(slugsAnteriores) > 0]{ "anteriores": slugsAnteriores, ${ROTA} }`,
);

// Sitemap (#52): o `lastmod` de cada página (web/src/lib/sitemap.ts). A URL do post sai do
// `urlDoPost`, e post com `noindex` fica de fora. Os posts vêm na ordem das listagens, com as tags,
// para o `lastmod` de cada página de listagem; as datas da taxonomia, do Sobre e das Configurações
// cobrem o que essas páginas mostram além dos posts.
export const CONSULTA_DO_SITEMAP = defineQuery(`{
  "posts": *[${POST_PUBLICADO}] | ${MAIS_RECENTES} {
    ${ROTA},
    _updatedAt,
    dataDePublicacao,
    "noindex": coalesce(seo.noindex, false),
    "tags": (tags[]->)[defined(slug.current)].slug.current
  },
  "categorias": *[_type == "categoria" && ${PUBLICADO}]{ "slug": slug.current, _updatedAt },
  "formatos": *[_type == "formato" && ${PUBLICADO}]{ "slug": slug.current, _updatedAt },
  "tags": *[_type == "tag" && ${PUBLICADO}]{ "slug": slug.current, _updatedAt },
  "sobre": *[_id == "sobre"][0]._updatedAt,
  "configuracoes": *[_id == "configuracoes"][0]._updatedAt
}`);

// RSS (#52): os últimos posts, com o que a description (`descricaoDoPost`), as categorias
// e a capa do feed precisam. Do corpo, só o texto dos blocos, como no card com tempo de leitura.
export const CONSULTA_DO_FEED =
  defineQuery(`*[${POST_PUBLICADO}] | ${MAIS_RECENTES} [0...${POSTS_NO_FEED}]{
  tipo,
  "slug": slug.current,
  titulo,
  subtitulo,
  dataDePublicacao,
  "categoria": categoria->{ nome, "slug": slug.current },
  "formato": formato->{ nome, "slug": slug.current },
  "tags": (tags[]->)[defined(slug.current)]{ nome },
  "capa": capa${IMAGEM_NO_GROQ},
  "corpo": corpo[_type == "block"]{ _type, style, children[]{ text } },
  seo{ descricao }
}`);
