import { createImageUrlBuilder } from '@sanity/image-url';
import { fonteDoConteudo } from './config';
import type { SanityImageCrop, SanityImageHotspot } from './tipos.gerados';

// URLs do CDN do Sanity para o <ImagemSanity> (#34): o `srcset` em larguras fixas, o `src` e as
// dimensões da tag. O CDN redimensiona, recorta e escolhe o formato (AVIF/WebP) sozinho; o site
// não processa imagem no build.

/** Larguras do `srcset`, em pixels. Nenhuma passa da largura do recorte: o CDN não amplia. */
export const LARGURAS = [320, 480, 640, 800, 1024, 1280, 1600, 1920] as const;

/** Qualidade das imagens do CDN (`q`): ~75 já não mostra artefato no AVIF e no WebP. */
export const QUALIDADE = 75;

/** O formato que as consultas devolvem para uma imagem (`IMAGEM_NO_GROQ`, README desta pasta). */
export interface ImagemDoSanity {
  asset: {
    _id: string;
    url: string;
    largura: number | null;
    altura: number | null;
    lqip: string | null;
  } | null;
  crop?: SanityImageCrop | undefined;
  hotspot?: SanityImageHotspot | undefined;
}

/** O que vai na tag `<img>`. Sem `srcset` quando a imagem não está no CDN (modo fixtures). */
export interface FontesDaImagem {
  src: string;
  srcset: string | undefined;
  width: number;
  height: number;
}

/** Projeto e dataset do CDN; `null` no modo fixtures, em que o asset tem um data URI no `url`. */
export type ProjetoDoCdn = { projectId: string; dataset: string } | null;

const PROJETO: ProjetoDoCdn =
  fonteDoConteudo.tipo === 'sanity'
    ? { projectId: fonteDoConteudo.projectId, dataset: fonteDoConteudo.dataset }
    : null;

// O `_id` de um asset traz as dimensões do original: `image-{id}-{largura}x{altura}-{ext}`.
const DIMENSOES_NO_ID = /-(\d+)x(\d+)-[a-z0-9]+$/;

function dimensoesDoOriginal(asset: NonNullable<ImagemDoSanity['asset']>) {
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
  imagem: ImagemDoSanity & { asset: NonNullable<ImagemDoSanity['asset']> },
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
export function fontesDaImagem(
  imagem: ImagemDoSanity,
  proporcao?: number,
  projeto: ProjetoDoCdn = PROJETO,
): FontesDaImagem | null {
  const { asset } = imagem;
  if (!asset) return null;

  const maximo = tamanhoMaximo({ ...imagem, asset }, proporcao);
  const versoes = larguras(maximo.largura);
  const maior = versoes[versoes.length - 1] ?? maximo.largura;
  // As dimensões da maior versão servida: dão a proporção certa à tag antes de a imagem chegar.
  const tamanho = { width: maior, height: Math.round((maior * maximo.altura) / maximo.largura) };

  // Nas fixtures, o `url` é um placeholder em SVG: vai direto, e o CSS recorta na proporção.
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
