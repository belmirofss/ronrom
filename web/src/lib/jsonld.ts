import type {
  BlogPosting,
  Book,
  BreadcrumbList,
  CafeOrCoffeeShop,
  CollectionPage,
  Graph,
  IdReference,
  Movie,
  Person,
  PostalAddress,
  Product,
  ProfilePage,
  Restaurant,
  Review,
  SearchAction,
  Thing,
  TouristAttraction,
  TVSeries,
  WebPage,
  WebSite,
  WithActionConstraints,
} from 'schema-dts';
import type { Ficha } from '@/lib/ficha';
import { NOTA_MAXIMA, NOTA_MINIMA, validarNota } from '@/lib/nota';
import { canonicalUrl, urlDoPost } from '@/lib/rotas';
import { imagemRecortada } from '@/lib/sanity/imagem';
import type {
  CONSULTA_DAS_CONFIGURACOES_RESULT,
  CONSULTA_DO_POST_RESULT,
  CONSULTA_DO_SOBRE_RESULT,
} from '@/lib/sanity/tipos.gerados';
import { descricaoDoPost, imagemDeCompartilhamento, imagemDoPost } from '@/lib/seo';
import { CAMINHO_DO_SOBRE, TITULO_DO_SOBRE } from '@/lib/sobre';
import { trilhaDoPost, type ItemDaTrilha } from '@/lib/trilha';
import { isoNoFuso } from '@/lib/utils/data';
import { contarPalavras } from '@/lib/utils/leitura';
import { DESCRICAO_DO_SITE, IDIOMA, NOME_DO_SITE } from '@/lib/utils/site';

// Dados estruturados (JSON-LD) das páginas (#50). Cada página publica um único @graph com o
// WebSite, a Person da autora e as entidades dela, ligados por @id estáveis: a mesma entidade tem o
// mesmo @id em todas as páginas e nunca aparece duas vezes no mesmo grafo. Quem renderiza é o
// <JsonLd> (src/components/seo/JsonLd.astro), com o `grafoDaPagina`.

type Post = NonNullable<CONSULTA_DO_POST_RESULT>;
type Sobre = CONSULTA_DO_SOBRE_RESULT;
type Configuracoes = CONSULTA_DAS_CONFIGURACOES_RESULT;

// --- @id ---

// Os @id partem da URL canônica (docs/seo-urls.md#identificador-estável-do-post), com um fragmento
// por entidade. A página (WebPage) usa a própria URL.
export const ID_DO_SITE = `${canonicalUrl('/')}#site`;
export const ID_DA_AUTORA = `${canonicalUrl(CAMINHO_DO_SOBRE)}#autora`;
export const idDoPost = (url: string) => `${url}#post`;
export const idDaTrilha = (url: string) => `${url}#trilha`;

const ref = (id: string): IdReference => ({ '@id': id });

// Nome alternativo do site para o Google (site names): o endereço de lançamento, sem o domínio.
export const NOME_ALTERNATIVO = 'Ronrom Blog';

// As proporções da capa que o Google pede no artigo (16:9 aproximado, 4:3 e 1:1), em 1200 de largura.
export const TAMANHOS_DA_CAPA = [
  [1200, 630],
  [1200, 900],
  [1200, 1200],
] as const;

// A foto da autora, quadrada.
const TAMANHO_DA_FOTO = 600;

// --- Entidades ---

/** O que toda página precisa para montar o WebSite e a Person: os singletons do Studio. */
export interface Identidade {
  sobre: Sobre;
  configuracoes: Configuracoes;
}

/**
 * A autora, a partir do singleton Sobre e das redes de Configurações do site. Sem nome no Sobre,
 * não há Person (o Google pede o nome do autor), e as outras entidades ficam sem autoria.
 */
export function autora({ sobre, configuracoes }: Identidade): Person | null {
  const nome = sobre?.nome?.trim();
  if (!nome) return null;
  const foto = sobre?.foto ? imagemRecortada(sobre.foto, TAMANHO_DA_FOTO, TAMANHO_DA_FOTO) : null;
  const redes = (configuracoes?.redes ?? []).flatMap(({ url }) => (url ? [url] : []));
  return {
    '@type': 'Person',
    '@id': ID_DA_AUTORA,
    name: nome,
    url: canonicalUrl(CAMINHO_DO_SOBRE),
    ...(foto ? { image: foto } : {}),
    ...(redes.length > 0 ? { sameAs: redes } : {}),
    ...(sobre?.bio?.trim() ? { description: sobre.bio.trim() } : {}),
  };
}

// A busca do Pagefind (#55) em /busca?q=. O Google aposentou a caixa de busca nos sitelinks em
// 2024: a ação não gera resultado visível, mas segue válida no schema.org.
const BUSCA: WithActionConstraints<SearchAction> = {
  '@type': 'SearchAction',
  target: {
    '@type': 'EntryPoint',
    urlTemplate: `${canonicalUrl('/busca')}?q={search_term_string}`,
  },
  'query-input': 'required name=search_term_string',
};

/** O site. O que importa para o Google é o nome (site names); o resto liga as entidades. */
export function site({ configuracoes }: Identidade, comAutora: boolean): WebSite {
  return {
    '@type': 'WebSite',
    '@id': ID_DO_SITE,
    name: NOME_DO_SITE,
    alternateName: NOME_ALTERNATIVO,
    url: canonicalUrl('/'),
    description: configuracoes?.seo?.descricao?.trim() || DESCRICAO_DO_SITE,
    inLanguage: IDIOMA,
    ...(comAutora ? { author: ref(ID_DA_AUTORA), publisher: ref(ID_DA_AUTORA) } : {}),
    potentialAction: BUSCA,
  };
}

/**
 * A trilha de navegação, com os mesmos itens do `Breadcrumb.astro` (@/lib/trilha). O último item
 * é a página aberta, e a URL dele é a canônica da página.
 */
export function breadcrumbList(itens: readonly ItemDaTrilha[]): BreadcrumbList {
  const pagina = itens.at(-1);
  if (!pagina) throw new Error('Trilha vazia em breadcrumbList.');
  return {
    '@type': 'BreadcrumbList',
    '@id': idDaTrilha(canonicalUrl(pagina.href)),
    itemListElement: itens.map(({ rotulo, href }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: rotulo,
      item: canonicalUrl(href),
    })),
  };
}

// O que toda página do grafo tem em comum: URL, nome, idioma e o vínculo com o site.
function pagina(url: string, nome: string) {
  return { '@id': url, url, name: nome, inLanguage: IDIOMA, isPartOf: ref(ID_DO_SITE) } as const;
}

/** A página /sobre: um ProfilePage cuja entidade principal é a autora. */
export function perfil(sobre: Sobre): ProfilePage {
  const url = canonicalUrl(CAMINHO_DO_SOBRE);
  return {
    '@type': 'ProfilePage',
    ...pagina(url, TITULO_DO_SOBRE),
    mainEntity: ref(ID_DA_AUTORA),
    ...(sobre?._updatedAt ? { dateModified: isoNoFuso(sobre._updatedAt) } : {}),
  };
}

/** A página de um post, com a trilha. A entidade principal (BlogPosting ou Review) aponta para ela. */
export function paginaDoPost(post: Post): WebPage {
  const url = canonicalUrl(urlDoPost(post));
  return {
    '@type': 'WebPage',
    ...pagina(url, post.titulo ?? ''),
    breadcrumb: ref(idDaTrilha(url)),
  };
}

/** Uma página de listagem (`/reviews/filmes/pagina/2`), pela trilha que termina nela. */
export function paginaDaListagem(titulo: string, trilha: readonly ItemDaTrilha[]): CollectionPage {
  const ultima = trilha.at(-1);
  if (!ultima) throw new Error('Trilha vazia em paginaDaListagem.');
  const url = canonicalUrl(ultima.href);
  return { '@type': 'CollectionPage', ...pagina(url, titulo), breadcrumb: ref(idDaTrilha(url)) };
}

// As imagens do artigo: a de compartilhamento do post (a do SEO ou a capa) nos três tamanhos ou,
// fora do CDN (fixtures) ou sem arquivo, a imagem padrão do site.
function imagensDoPost(post: Post): string[] {
  const imagem = imagemDoPost(post);
  const recortes = imagem
    ? TAMANHOS_DA_CAPA.flatMap(
        ([largura, altura]) => imagemRecortada(imagem, largura, altura) ?? [],
      )
    : [];
  return recortes.length > 0
    ? recortes
    : [imagemDeCompartilhamento(null, undefined, post.titulo ?? '').url];
}

/** Um pensamento. Datas no fuso de Brasília; a seção é o formato e as palavras-chave, as tags. */
export function blogPosting(post: Post, comAutora: boolean): BlogPosting {
  const url = canonicalUrl(urlDoPost(post));
  const tags = (post.tags ?? []).flatMap(({ nome }) => (nome ? [nome] : []));
  return {
    '@type': 'BlogPosting',
    '@id': idDoPost(url),
    url,
    headline: post.titulo ?? '',
    description: descricaoDoPost(post),
    image: imagensDoPost(post),
    datePublished: isoNoFuso(post.dataDePublicacao),
    dateModified: isoNoFuso(post._updatedAt),
    ...(comAutora ? { author: ref(ID_DA_AUTORA), publisher: ref(ID_DA_AUTORA) } : {}),
    mainEntityOfPage: ref(url),
    isPartOf: ref(ID_DO_SITE),
    inLanguage: IDIOMA,
    ...(tags.length > 0 ? { keywords: tags } : {}),
    ...(post.formato?.nome ? { articleSection: post.formato.nome } : {}),
    wordCount: contarPalavras(post.corpo),
  };
}

// --- Review (#51) ---

// O Google só mostra as estrelas (review snippet) quando o `itemReviewed` é de um dos tipos da
// lista dele: Movie, Book, CreativeWorkSeries (TVSeries), LocalBusiness (Restaurant,
// CafeOrCoffeeShop) e Product entre os nossos. Lugar (TouristAttraction) e comida sem marca (Thing)
// continuam válidos no schema.org, sem expectativa de snippet.
// https://developers.google.com/search/docs/appearance/structured-data/review-snippet

// A categoria de restaurantes e cafés usa a ficha de lugar, como a de lugares, mas vira um
// LocalBusiness (docs/seo-urls.md). O slug não muda depois de publicado.
export const CATEGORIA_DE_RESTAURANTES = 'restaurantes-e-cafes';

// "Cafeteria", "Café", "Cafés especiais": o tipo de cozinha diz se é café ou restaurante.
const CAFE = /\bcaf[eé]/i;

const FORMATOS_DO_LIVRO = { ebook: 'EBook', audiobook: 'AudiobookFormat' } as const;

/** A chave só entra com valor: campo vazio da ficha não vira `"director": undefined`. */
function opcional<Chave extends string, Valor>(chave: Chave, valor: Valor | undefined) {
  return (valor === undefined ? {} : { [chave]: valor }) as { [C in Chave]?: Valor };
}

function texto(valor: string | null | undefined): string | undefined {
  return valor?.trim() || undefined;
}

// Ano da ficha como data ISO 8601 de só o ano ("2023").
function ano(valor: number | null | undefined): string | undefined {
  return typeof valor === 'number' ? String(valor) : undefined;
}

function pessoa(nome: string | null | undefined): Person | undefined {
  const preenchido = texto(nome);
  return preenchido ? { '@type': 'Person', name: preenchido } : undefined;
}

type FichaDoModelo<Modelo extends Ficha['modelo']> = Extract<Ficha, { modelo: Modelo }>;

// O endereço da ficha de lugar, com o bairro junto da rua, como nos endereços brasileiros.
function enderecoPostal(endereco: FichaDoModelo<'lugar'>['endereco']): PostalAddress | undefined {
  const rua = [texto(endereco?.rua), texto(endereco?.bairro)].filter(Boolean).join(' - ');
  const cidade = texto(endereco?.cidade);
  if (!rua && !cidade) return undefined;
  return {
    '@type': 'PostalAddress',
    ...opcional('streetAddress', rua || undefined),
    ...opcional('addressLocality', cidade),
    ...opcional('addressRegion', endereco?.uf),
    addressCountry: 'BR',
  };
}

// O endereço do Instagram, com o perfil sem @, como na ficha (src/lib/ficha.ts).
function urlDoInstagram(perfil: string | null): string | undefined {
  const usuario = texto(perfil)?.replace(/^@/, '');
  return usuario ? `https://www.instagram.com/${usuario}/` : undefined;
}

// O restaurante ou café (LocalBusiness) e o lugar para conhecer (TouristAttraction).
function lugar(
  nome: string,
  ficha: FichaDoModelo<'lugar'>,
  categoria: string | null | undefined,
  imagem: string | undefined,
): Restaurant | CafeOrCoffeeShop | TouristAttraction {
  const comum = {
    name: nome,
    ...opcional('image', imagem),
    ...opcional('address', enderecoPostal(ficha.endereco)),
    ...opcional('hasMap', texto(ficha.linkDoMapa)),
  };
  if (categoria !== CATEGORIA_DE_RESTAURANTES) return { '@type': 'TouristAttraction', ...comum };
  const cozinha = texto(ficha.tipoDeCozinha);
  const negocio = {
    ...comum,
    ...opcional('priceRange', texto(ficha.faixaDePreco)),
    ...opcional('servesCuisine', cozinha),
    ...opcional('url', urlDoInstagram(ficha.instagram)),
  };
  return cozinha && CAFE.test(cozinha)
    ? { '@type': 'CafeOrCoffeeShop', ...negocio }
    : { '@type': 'Restaurant', ...negocio };
}

/**
 * O que a review avalia, tipado pelo modelo da ficha da categoria. O nome é o título do post (o
 * filme, o livro, o café), e a imagem, a capa. Sem ficha (categoria sem modelo), vira um Thing.
 */
export function itemAvaliado(post: Pick<Post, 'titulo' | 'categoria' | 'ficha' | 'capa'>): Thing {
  const nome = post.titulo?.trim() ?? '';
  const [largura, altura] = TAMANHOS_DA_CAPA[0];
  const imagem = (post.capa && imagemRecortada(post.capa, largura, altura)) || undefined;
  const ficha = post.ficha;

  switch (ficha?.modelo) {
    case 'filme':
      return {
        '@type': 'Movie',
        name: nome,
        ...opcional('image', imagem),
        ...opcional('director', pessoa(ficha.direcao)),
        ...opcional('dateCreated', ano(ficha.ano)),
        ...opcional('duration', ficha.duracao ? `PT${ficha.duracao}M` : undefined),
      } satisfies Movie;
    case 'serie':
      return {
        '@type': 'TVSeries',
        name: nome,
        ...opcional('image', imagem),
        ...opcional('creator', pessoa(ficha.criacao)),
        ...opcional('startDate', ano(ficha.anoDeEstreia)),
        ...opcional('endDate', ano(ficha.anoDeFim)),
      } satisfies TVSeries;
    case 'livro': {
      const editora = texto(ficha.editora);
      return {
        '@type': 'Book',
        name: nome,
        ...opcional('image', imagem),
        ...opcional('author', pessoa(ficha.autoria)),
        ...opcional('datePublished', ano(ficha.ano)),
        ...opcional(
          'publisher',
          editora ? { '@type': 'Organization' as const, name: editora } : undefined,
        ),
        ...opcional('numberOfPages', ficha.paginas ?? undefined),
        // "Físico" não diz se é capa dura ou brochura: fica sem formato.
        ...opcional(
          'bookFormat',
          ficha.formatoDoLivro && ficha.formatoDoLivro !== 'fisico'
            ? FORMATOS_DO_LIVRO[ficha.formatoDoLivro]
            : undefined,
        ),
      } satisfies Book;
    }
    case 'lugar':
      return lugar(nome, ficha, post.categoria?.slug, imagem);
    case 'comida': {
      // Com marca, é um produto que dá para comprar; sem, só o nome do que foi provado.
      const marca = texto(ficha.marca);
      if (!marca) return { '@type': 'Thing', name: nome, ...opcional('image', imagem) };
      return {
        '@type': 'Product',
        name: nome,
        ...opcional('image', imagem),
        brand: { '@type': 'Brand', name: marca },
      } satisfies Product;
    }
    default:
      return { '@type': 'Thing', name: nome, ...opcional('image', imagem) };
  }
}

/**
 * Uma review: o item avaliado e a nota da autora, a mesma dos corações (`validarNota`), de 0,5 a
 * 5. Sem AggregateRating, porque a nota é de uma pessoa só. O Google exige o autor, então quem
 * monta o grafo só chama esta função quando há autora.
 */
export function review(post: Post): Review {
  const url = canonicalUrl(urlDoPost(post));
  return {
    '@type': 'Review',
    '@id': idDoPost(url),
    url,
    name: post.titulo ?? '',
    reviewBody: descricaoDoPost(post),
    image: imagensDoPost(post),
    datePublished: isoNoFuso(post.dataDePublicacao),
    dateModified: isoNoFuso(post._updatedAt),
    author: ref(ID_DA_AUTORA),
    publisher: ref(ID_DA_AUTORA),
    mainEntityOfPage: ref(url),
    isPartOf: ref(ID_DO_SITE),
    inLanguage: IDIOMA,
    itemReviewed: itemAvaliado(post),
    reviewRating: {
      '@type': 'Rating',
      ratingValue: validarNota(post.nota),
      bestRating: NOTA_MAXIMA,
      worstRating: NOTA_MINIMA,
    },
  };
}

// --- Grafo da página ---

/** A página que o <JsonLd> descreve, com o que cada uma precisa além da identidade. */
export type PaginaDoJsonLd =
  | { tipo: 'home' }
  | { tipo: 'sobre' }
  | { tipo: 'post'; post: Post }
  | { tipo: 'listagem'; titulo: string; trilha: readonly ItemDaTrilha[] };

// A entidade principal do post: BlogPosting no pensamento e Review na review. Sem autora, a review
// fica sem a Review, que sem `author` só daria erro no Search Console.
function artigoDoPost(post: Post, comAutora: boolean): Thing[] {
  if (post.tipo === 'pensamento') return [blogPosting(post, comAutora)];
  if (post.tipo === 'review' && comAutora) return [review(post)];
  return [];
}

// As entidades próprias de cada página.
function entidadesDaPagina(
  pagina: PaginaDoJsonLd,
  identidade: Identidade,
  comAutora: boolean,
): Thing[] {
  switch (pagina.tipo) {
    case 'home':
      return [];
    case 'sobre':
      return comAutora ? [perfil(identidade.sobre)] : [];
    case 'post':
      return [
        paginaDoPost(pagina.post),
        ...artigoDoPost(pagina.post, comAutora),
        breadcrumbList(trilhaDoPost(pagina.post)),
      ];
    case 'listagem':
      return [paginaDaListagem(pagina.titulo, pagina.trilha), breadcrumbList(pagina.trilha)];
  }
}

/** O @graph completo de uma página: o site, a autora (se houver) e as entidades da página. */
export function grafoDaPagina(pagina: PaginaDoJsonLd, identidade: Identidade): Graph {
  const pessoa = autora(identidade);
  const entidades: Thing[] = [
    site(identidade, Boolean(pessoa)),
    ...(pessoa ? [pessoa] : []),
    ...entidadesDaPagina(pagina, identidade, Boolean(pessoa)),
  ];
  return { '@context': 'https://schema.org', '@graph': entidades };
}

// --- Serialização ---

// Dentro do <script>, `</script>` (ou `<!--`) no texto de um post fecharia a tag antes da hora. Os
// sinais de HTML viram escapes Unicode (`\u003c`), que o JSON lê como o mesmo caractere; os
// separadores de linha e de parágrafo (U+2028 e U+2029) também, porque quebram o JavaScript de quem
// lê o JSON-LD com eval.
const PERIGOSOS = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, 'g');

const escapeUnicode = (caractere: string) =>
  `\\u${caractere.charCodeAt(0).toString(16).padStart(4, '0')}`;

/** O JSON do `<script type="application/ld+json">`, seguro para ir direto no HTML. */
export function serializarJsonLd(dados: Graph): string {
  return JSON.stringify(dados).replace(PERIGOSOS, escapeUnicode);
}
