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
  // Imagem do Sanity; sem ela (ou com o asset apagado), vale a imagem padrão do site.
  image?: ImagemDoSanity | null | undefined;
  imageAlt?: string | undefined;
  type?: 'website' | 'article' | undefined;
  noindex?: boolean | undefined;
  // Datas ISO 8601, só em `article`.
  publishedTime?: string | undefined;
  modifiedTime?: string | undefined;
  tags?: readonly string[] | undefined;
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

// O texto corrido do corpo: parágrafos, listas e citações, sem os subtítulos (que soltos no meio
// da description não fazem sentido), as imagens, os vídeos e as citações em destaque.
export function textoDoCorpo(corpo: Post['corpo']): string {
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
  | 'tags'
  | 'seo'
>;

// Description do post: a do SEO, depois o subtítulo, depois o começo do corpo. Post sem nenhum
// dos três (só imagens, por exemplo) fica com a do site.
export function descricaoDoPost(post: PostParaSeo): string {
  return (
    post.seo?.descricao?.trim() ||
    post.subtitulo?.trim() ||
    resumir(textoDoCorpo(post.corpo)) ||
    DESCRICAO_DO_SITE
  );
}

// Metadados da página de um post (#42). A imagem de compartilhamento é a do SEO, se tiver arquivo,
// ou a capa, que é obrigatória.
export function seoDoPost(post: PostParaSeo, canonical: string): Metadados {
  const imagem = post.seo?.imagem?.asset ? post.seo.imagem : post.capa;
  return {
    title: post.seo?.titulo?.trim() || post.titulo,
    description: descricaoDoPost(post),
    canonical,
    image: imagem,
    type: 'article',
    noindex: post.seo?.noindex ?? false,
    publishedTime: post.dataDePublicacao,
    modifiedTime: post._updatedAt,
    tags: post.tags?.map(({ nome }) => nome) ?? [],
    section: (post.tipo === 'review' ? post.categoria : post.formato)?.nome,
  };
}
