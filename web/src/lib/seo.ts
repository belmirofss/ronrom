import { PUBLIC_SANITY_VISUAL_EDITING_ENABLED, VERCEL_ENV } from 'astro:env/server';
import { ALTURA_OG, LARGURA_OG, ogImage, type ImagemDoSanity } from '@/lib/sanity/imagem';
import type { CONSULTA_DO_POST_RESULT } from '@/lib/sanity/tipos.gerados';
import { DESCRICAO_DO_SITE, URL_DO_SITE } from '@/lib/utils/site';

// Props do <Seo> (src/components/seo/Seo.astro), que o LayoutBase recebe em `seo`. É `type`, e não
// `interface`, para caber nas props genéricas da Container API nos testes.
export type Metadados = {
  // Título da página, sem o " · Ronrom" (o <Seo> acrescenta). Sem título, é a home.
  title?: string | undefined;
  description: string;
  // Caminho da página (`/sobre`); o <Seo> monta a URL absoluta com o `canonicalUrl`.
  canonical: string;
  // Páginas vizinhas de uma listagem paginada (`seoDaPaginacao`, de @/lib/listagem), em caminho.
  prev?: string | undefined;
  next?: string | undefined;
  // Imagem do Sanity; sem ela (ou com o asset apagado), vale a imagem padrão do site.
  image?: ImagemDoSanity | null | undefined;
  imageAlt?: string | undefined;
  type?: 'website' | 'article' | undefined;
  noindex?: boolean | undefined;
  // Datas ISO 8601, só em `article`.
  publishedTime?: string | undefined;
  modifiedTime?: string | undefined;
  section?: string | undefined;
};

// Acima disso, o Google costuma cortar o título no resultado da busca. O <Seo> avisa no build.
export const LIMITE_DO_TITULO = 65;

// Tamanho da description gerada a partir do corpo do post.
export const LIMITE_DA_DESCRICAO = 155;

// Para as páginas sem imagem própria (home, listagens, /sobre sem foto). Gerada a partir do
// favicon.svg (web/README.md#ícones-e-imagem-de-compartilhamento).
const IMAGEM_PADRAO = {
  caminho: '/og-padrao.jpg',
  alt: 'O gato do Ronrom, em vinho sobre um quadrado rosa.',
};

export const ROBOTS_INDEXAVEL = 'index,follow,max-image-preview:large';
export const ROBOTS_NOINDEX = 'noindex,follow';
export const ROBOTS_BLOQUEADO = 'noindex,nofollow';

// Só o deploy de produção pode ser indexado (#52). Nos previews da Vercel, no build local e no CI,
// o robots.txt bloqueia tudo e toda página sai com noindex,nofollow, mesmo as indexáveis. A prévia
// de rascunhos (#43) roda como produção no projeto ronrom-previa, mas também fica bloqueada.
export const SITE_INDEXAVEL = VERCEL_ENV === 'production' && !PUBLIC_SANITY_VISUAL_EDITING_ENABLED;

/** O `<meta name="robots">` de uma página: a prop `noindex` só vale onde o site é indexável. */
export function robotsDaPagina(noindex: boolean, indexavel = SITE_INDEXAVEL): string {
  if (!indexavel) {
    return ROBOTS_BLOQUEADO;
  }
  return noindex ? ROBOTS_NOINDEX : ROBOTS_INDEXAVEL;
}

/** O /robots.txt: libera tudo e aponta o sitemap em produção; fora dela, bloqueia tudo. */
export function robotsTxt(indexavel: boolean, sitemap: string): string {
  const linhas = indexavel
    ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${sitemap}`]
    : ['User-agent: *', 'Disallow: /'];
  return `${linhas.join('\n')}\n`;
}

export interface ImagemDeCompartilhamento {
  url: string;
  largura: number;
  altura: number;
  alt: string;
}

// og:image e twitter:image: a imagem do Sanity recortada em 1200×630 ou, sem ela, a padrão. O alt
// preferido é o `imageAlt`, depois o da própria imagem e, por fim, o título da página.
export function imagemDeCompartilhamento(
  imagem: ImagemDoSanity | null | undefined,
  alt: string | undefined,
  titulo: string,
): ImagemDeCompartilhamento {
  const url = imagem ? ogImage(imagem) : null;
  if (!url) {
    return {
      url: new URL(IMAGEM_PADRAO.caminho, URL_DO_SITE).href,
      largura: LARGURA_OG,
      altura: ALTURA_OG,
      alt: IMAGEM_PADRAO.alt,
    };
  }
  return {
    url,
    largura: LARGURA_OG,
    altura: ALTURA_OG,
    alt: alt?.trim() || imagem?.alt?.trim() || titulo,
  };
}

// Corta o texto em até `limite` caracteres (com as reticências) sem quebrar palavra.
export function resumir(texto: string, limite = LIMITE_DA_DESCRICAO): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= limite) {
    return limpo;
  }
  const corte = limpo.slice(0, limite - 1);
  // Se o corte caiu no meio de uma palavra, volta até o espaço anterior. Uma palavra só, maior que
  // o limite inteiro, é cortada mesmo.
  const fimDaPalavra = /\s/.test(limpo.charAt(limite - 1));
  const ultimoEspaco = corte.lastIndexOf(' ');
  const inteiro = fimDaPalavra || ultimoEspaco <= 0 ? corte : corte.slice(0, ultimoEspaco);
  return `${inteiro.replace(/[\s,.;:!?…–—-]+$/, '')}…`;
}

type Post = NonNullable<CONSULTA_DO_POST_RESULT>;

// O que o `textoDoCorpo` lê de cada bloco: serve o corpo inteiro da página do post e só os blocos
// de texto, que o feed (#52) pede.
type CorpoComTexto = ReadonlyArray<{
  _type: string;
  style?: string | null;
  children?: ReadonlyArray<{ text?: string | null }> | null;
}> | null;

// O texto corrido do corpo: parágrafos, listas e citações, sem os subtítulos (que soltos no meio
// da description não fazem sentido), as imagens, os vídeos e as citações em destaque.
export function textoDoCorpo(corpo: CorpoComTexto): string {
  return (corpo ?? [])
    .flatMap((bloco) =>
      bloco._type === 'block' && bloco.style !== 'h2' && bloco.style !== 'h3'
        ? [(bloco.children ?? []).map((trecho) => trecho.text ?? '').join('')]
        : [],
    )
    .join(' ');
}

type PostParaSeo = Pick<
  Post,
  | 'tipo'
  | 'titulo'
  | 'subtitulo'
  | 'dataDePublicacao'
  | '_updatedAt'
  | 'categoria'
  | 'formato'
  | 'capa'
  | 'corpo'
  | 'seo'
>;

// Description do post: a do SEO, depois o subtítulo, depois o começo do corpo. Post sem nenhum
// dos três (só imagens, por exemplo) fica com a do site. O feed (#52) usa a mesma.
export function descricaoDoPost(post: {
  subtitulo: string | null;
  corpo: CorpoComTexto;
  seo: { descricao: string | null } | null;
}): string {
  return (
    post.seo?.descricao?.trim() ||
    post.subtitulo?.trim() ||
    resumir(textoDoCorpo(post.corpo)) ||
    DESCRICAO_DO_SITE
  );
}

// A imagem de compartilhamento do post: a do SEO, se tiver arquivo, ou a capa, que é obrigatória.
// É a do og:image e a do JSON-LD (#50).
export function imagemDoPost(post: Pick<PostParaSeo, 'seo' | 'capa'>) {
  return post.seo?.imagem?.asset ? post.seo.imagem : post.capa;
}

// Metadados da página de um post (#42).
export function seoDoPost(post: PostParaSeo, canonical: string): Metadados {
  return {
    title: post.seo?.titulo?.trim() || post.titulo,
    description: descricaoDoPost(post),
    canonical,
    image: imagemDoPost(post),
    type: 'article',
    noindex: post.seo?.noindex ?? false,
    publishedTime: post.dataDePublicacao,
    modifiedTime: post._updatedAt,
    section: (post.tipo === 'review' ? post.categoria : post.formato)?.nome,
  };
}
