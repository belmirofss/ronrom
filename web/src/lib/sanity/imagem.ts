import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

// O mínimo de uma imagem vinda das consultas (`IMAGEM_NO_GROQ`): o asset expandido, o recorte e o
// hotspot. Capa, foto da autora e imagem de compartilhamento têm esse formato.
export interface ImagemDoSanity {
  asset: { _id: string; url: string } | null;
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  alt?: string;
}

// https://cdn.sanity.io/images/{projectId}/{dataset}/{arquivo}
const URL_DO_CDN = /^https:\/\/cdn\.sanity\.io\/images\/([^/]+)\/([^/]+)\//;

export const LARGURA_OG = 1200;
export const ALTURA_OG = 630;

// Imagem de compartilhamento (og:image) no CDN do Sanity: 1200×630, recortada no hotspot que a
// autora marcou no Studio. JPG explícito porque alguns crawlers não aceitam WebP nem AVIF.
// O projeto e o dataset saem da URL do próprio asset, que já vem do Sanity, sem depender das
// variáveis. Sem asset (arquivo apagado) ou fora do CDN, como os placeholders `data:` das fixtures
// (#33), devolve `null` e a página usa a imagem padrão.
export function ogImage(imagem: ImagemDoSanity): string | null {
  const [, projectId, dataset] = imagem.asset?.url.match(URL_DO_CDN) ?? [];
  if (!projectId || !dataset) {
    return null;
  }
  return createImageUrlBuilder({ projectId, dataset })
    .image(imagem as SanityImageSource)
    .width(LARGURA_OG)
    .height(ALTURA_OG)
    .fit('crop')
    .format('jpg')
    .quality(80)
    .url();
}
