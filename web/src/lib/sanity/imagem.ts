import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

// URLs do CDN do Sanity: o `srcset` do <ImagemSanity> (#34) e a imagem de compartilhamento do
// <Seo> (#32). O CDN redimensiona, recorta e escolhe o formato sozinho; o site não processa imagem
// no build.

// O mínimo de uma imagem vinda das consultas (`IMAGEM_NO_GROQ`): o asset expandido, o recorte e o
// hotspot. Capa, foto da autora, imagem de compartilhamento e imagens do texto têm esse formato.
// Sem `largura` e `altura`, as dimensões saem do `_id`.
export interface ImagemDoSanity {
  asset: {
    _id: string;
    url: string;
    largura?: number | null;
    altura?: number | null;
    lqip?: string | null;
  } | null;
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
}

type Asset = NonNullable<ImagemDoSanity['asset']>;

// https://cdn.sanity.io/images/{projectId}/{dataset}/{arquivo}
const URL_DO_CDN = /^https:\/\/cdn\.sanity\.io\/images\/([^/]+)\/([^/]+)\//;

// O projeto e o dataset saem da URL do próprio asset, que já vem do Sanity, sem depender das
// variáveis. Fora do CDN, como os placeholders `data:` das fixtures (#33), não há projeto.
function projetoDoCdn(asset: Asset | null): { projectId: string; dataset: string } | null {
  const [, projectId, dataset] = asset?.url.match(URL_DO_CDN) ?? [];
  return projectId && dataset ? { projectId, dataset } : null;
}

// --- Imagem responsiva (<ImagemSanity>) ---

/** Larguras do `srcset`, em pixels. Nenhuma passa da largura do recorte: o CDN não amplia. */
export const LARGURAS = [320, 480, 640, 800, 1024, 1280, 1600, 1920] as const;

/** Qualidade das imagens do CDN (`q`): ~75 já não mostra artefato no AVIF e no WebP. */
export const QUALIDADE = 75;

/** O que vai na tag `<img>`. Sem `srcset` quando a imagem não está no CDN (modo fixtures). */
export interface FontesDaImagem {
  src: string;
  srcset: string | undefined;
  width: number;
  height: number;
}

// O `_id` de um asset traz as dimensões do original: `image-{id}-{largura}x{altura}-{ext}`.
const DIMENSOES_NO_ID = /-(\d+)x(\d+)-[a-z0-9]+$/;

function dimensoesDoOriginal(asset: Asset) {
  if (asset.largura && asset.altura) return { largura: asset.largura, altura: asset.altura };
  const [, largura, altura] = DIMENSOES_NO_ID.exec(asset._id) ?? [];
  if (!largura || !altura) {
    throw new Error(`Não deu para saber as dimensões da imagem ${asset._id}.`);
  }
  return { largura: Number(largura), altura: Number(altura) };
}

/**
 * Tamanho da maior versão que o CDN entrega sem ampliar: o recorte feito no Studio e, com
 * `proporcao` (largura / altura, como `4 / 3`), o maior retângulo nessa proporção dentro dele.
 */
export function tamanhoMaximo(
  imagem: ImagemDoSanity & { asset: Asset },
  proporcao?: number,
): { largura: number; altura: number } {
  const original = dimensoesDoOriginal(imagem.asset);
  const crop = imagem.crop;
  const largura = Math.round(original.largura * (1 - (crop?.left ?? 0) - (crop?.right ?? 0)));
  const altura = Math.round(original.altura * (1 - (crop?.top ?? 0) - (crop?.bottom ?? 0)));
  if (!proporcao) return { largura, altura };

  const larguraNaProporcao = Math.min(largura, Math.floor(altura * proporcao));
  return { largura: larguraNaProporcao, altura: Math.round(larguraNaProporcao / proporcao) };
}

/**
 * As larguras do `srcset` de uma imagem com `maxima` pixels de largura: as de `LARGURAS` menores
 * que ela e a própria `maxima` (limitada à maior de `LARGURAS`), para a maior versão não sair
 * menor do que o arquivo permite.
 */
export function larguras(maxima: number): number[] {
  const teto = Math.min(maxima, Math.max(...LARGURAS));
  return [...LARGURAS.filter((largura) => largura < teto), teto];
}

/**
 * `src`, `srcset`, `width` e `height` de uma imagem do Sanity, respeitando o recorte e o hotspot
 * do Studio. Com `proporcao`, cada versão sai recortada nela, centrada no hotspot. `null` se o
 * asset foi apagado.
 */
export function fontesDaImagem(imagem: ImagemDoSanity, proporcao?: number): FontesDaImagem | null {
  const { asset } = imagem;
  if (!asset) return null;

  const maximo = tamanhoMaximo({ ...imagem, asset }, proporcao);
  const versoes = larguras(maximo.largura);
  const maior = versoes[versoes.length - 1] ?? maximo.largura;
  // As dimensões da maior versão servida: dão a proporção certa à tag antes de a imagem chegar.
  const tamanho = { width: maior, height: Math.round((maior * maximo.altura) / maximo.largura) };

  // Nas fixtures, o `url` é um placeholder em SVG: vai direto, e o CSS recorta na proporção.
  const projeto = projetoDoCdn(asset);
  if (!projeto) return { src: asset.url, srcset: undefined, ...tamanho };

  const base = createImageUrlBuilder(projeto)
    .image({
      asset: { _ref: asset._id },
      ...(imagem.crop ? { crop: imagem.crop } : {}),
      ...(imagem.hotspot ? { hotspot: imagem.hotspot } : {}),
    })
    .auto('format')
    .quality(QUALIDADE);

  const url = (largura: number) =>
    proporcao
      ? base
          .width(largura)
          .height(Math.round(largura / proporcao))
          .fit('crop')
          .url()
      : base.width(largura).url();

  return {
    src: url(maior),
    srcset: versoes.map((largura) => `${url(largura)} ${largura}w`).join(', '),
    ...tamanho,
  };
}

// --- Imagem de compartilhamento (<Seo>) ---

export const LARGURA_OG = 1200;
export const ALTURA_OG = 630;

// Imagem de compartilhamento (og:image) no CDN do Sanity: 1200×630, recortada no hotspot que a
// autora marcou no Studio. JPG explícito porque alguns crawlers não aceitam WebP nem AVIF.
// Sem asset (arquivo apagado) ou fora do CDN, devolve `null` e a página usa a imagem padrão.
export function ogImage(imagem: ImagemDoSanity): string | null {
  const projeto = projetoDoCdn(imagem.asset);
  if (!projeto) {
    return null;
  }
  return createImageUrlBuilder(projeto)
    .image(imagem as SanityImageSource)
    .width(LARGURA_OG)
    .height(ALTURA_OG)
    .fit('crop')
    .format('jpg')
    .quality(80)
    .url();
}

// --- Miniatura (resultado da busca) ---

/**
 * Uma única URL do CDN com `largura` pixels, recortada na `proporcao` e centrada no hotspot, como
 * a miniatura do resultado da busca (#54). Fora do CDN (modo fixtures), o próprio placeholder, como
 no `fontesDaImagem`. `null` se o asset foi apagado.
 */
export function urlDaMiniatura(
  imagem: ImagemDoSanity,
  largura: number,
  proporcao: number,
): string | null {
  if (!imagem.asset) return null;
  const projeto = projetoDoCdn(imagem.asset);
  if (!projeto) return imagem.asset.url;
  return createImageUrlBuilder(projeto)
    .image(imagem as SanityImageSource)
    .width(largura)
    .height(Math.round(largura / proporcao))
    .fit('crop')
    .auto('format')
    .quality(QUALIDADE)
    .url();
}
