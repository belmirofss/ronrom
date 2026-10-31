import { describe, expect, it } from 'vitest';
import { fontesDaImagem, larguras, versaoDaImagem, type ImagemDoSanity } from '@/lib/sanity/imagem';

const CDN = 'https://cdn.sanity.io/images/teste/production/abc-2400x1600.jpg';

function imagem(
  extra: Partial<ImagemDoSanity> = {},
  largura = 2400,
  altura = 1600,
): ImagemDoSanity {
  return {
    asset: {
      _id: `image-abc-${largura}x${altura}-jpg`,
      url: `https://cdn.sanity.io/images/teste/production/abc-${largura}x${altura}.jpg`,
      largura,
      altura,
      lqip: 'data:image/jpeg;base64,AAAA',
    },
    ...extra,
  };
}

const crop = (left: number, right: number, top = 0, bottom = 0) => ({
  _type: 'sanity.imageCrop' as const,
  left,
  right,
  top,
  bottom,
});

const hotspot = (x: number, y = 0.5) => ({
  _type: 'sanity.imageHotspot' as const,
  x,
  y,
  width: 0.2,
  height: 0.2,
});

/** As URLs do `srcset`, pela largura declarada. */
function urlsDoSrcset(srcset: string | undefined): Map<number, URL> {
  return new Map(
    (srcset ?? '').split(', ').map((item) => {
      const [url = '', largura = ''] = item.split(' ');
      return [Number.parseInt(largura), new URL(url)];
    }),
  );
}

describe('larguras', () => {
  it('usa as larguras fixas até 1920', () => {
    expect(larguras(4000)).toEqual([320, 480, 640, 800, 1024, 1280, 1600, 1920]);
    expect(larguras(1920)).toEqual([320, 480, 640, 800, 1024, 1280, 1600, 1920]);
  });

  it('não passa da largura da imagem e termina nela', () => {
    expect(larguras(1000)).toEqual([320, 480, 640, 800, 1000]);
    expect(larguras(800)).toEqual([320, 480, 640, 800]);
  });

  it('usa só a própria largura numa imagem menor que 320', () => {
    expect(larguras(200)).toEqual([200]);
  });
});

describe('fontesDaImagem', () => {
  it('gera o srcset com auto=format e qualidade 75 em cada largura', () => {
    const fontes = fontesDaImagem(imagem(), undefined);
    const urls = urlsDoSrcset(fontes?.srcset);

    expect([...urls.keys()]).toEqual([320, 480, 640, 800, 1024, 1280, 1600, 1920]);
    for (const [largura, url] of urls) {
      expect(`${url.origin}${url.pathname}`).toBe(CDN);
      expect(url.searchParams.get('w')).toBe(String(largura));
      expect(url.searchParams.get('auto')).toBe('format');
      expect(url.searchParams.get('q')).toBe('75');
      expect(url.searchParams.has('rect')).toBe(false);
    }
    expect(fontes?.src).toBe(urls.get(1920)?.href);
  });

  it('dá width e height da maior versão, na proporção do original', () => {
    expect(fontesDaImagem(imagem(), undefined)).toMatchObject({
      width: 1920,
      height: 1280,
    });
  });

  it('recorta pela proporção pedida, com width e height nela', () => {
    const fontes = fontesDaImagem(imagem(), 4 / 3);
    const url = urlsDoSrcset(fontes?.srcset).get(800);

    expect(fontes).toMatchObject({ width: 1920, height: 1440 });
    expect(url?.searchParams.get('w')).toBe('800');
    expect(url?.searchParams.get('h')).toBe('600');
    expect(url?.searchParams.get('fit')).toBe('crop');
    // O maior 4:3 dentro de 2400×1600 tem 2133×1600, centrado no meio da imagem.
    expect(url?.searchParams.get('rect')).toBe('134,0,2133,1600');
  });

  it('não amplia: a proporção limita a maior versão', () => {
    // 21:9 dentro de 1200×900 é 1200×514; 4:3 dentro de 1200×1600 é 1200×900.
    expect(fontesDaImagem(imagem({}, 1200, 900), 21 / 9)).toMatchObject({
      width: 1200,
      height: 514,
    });
    const retrato = fontesDaImagem(imagem({}, 1200, 1600), 4 / 3);
    expect([...urlsDoSrcset(retrato?.srcset).keys()]).toEqual([320, 480, 640, 800, 1024, 1200]);
  });

  it('respeita o hotspot ao recortar pela proporção', () => {
    const naDireita = fontesDaImagem(imagem({ hotspot: hotspot(0.9) }), 4 / 3);
    const naEsquerda = fontesDaImagem(imagem({ hotspot: hotspot(0.1) }), 4 / 3);

    expect(urlsDoSrcset(naDireita?.srcset).get(320)?.searchParams.get('rect')).toBe(
      '267,0,2133,1600',
    );
    expect(urlsDoSrcset(naEsquerda?.srcset).get(320)?.searchParams.get('rect')).toBe(
      '0,0,2133,1600',
    );
  });

  it('respeita o recorte do Studio nas URLs e nas dimensões', () => {
    // Tirar um quarto de cada lado deixa 1200×1600.
    const fontes = fontesDaImagem(imagem({ crop: crop(0.25, 0.25) }), undefined);
    const urls = urlsDoSrcset(fontes?.srcset);

    expect(fontes).toMatchObject({ width: 1200, height: 1600 });
    expect([...urls.keys()]).toEqual([320, 480, 640, 800, 1024, 1200]);
    expect(urls.get(320)?.searchParams.get('rect')).toBe('600,0,1200,1600');
  });

  it('lê as dimensões do _id quando o asset vem sem elas', () => {
    const base = imagem();
    const semDimensoes = { asset: base.asset && { ...base.asset, largura: null, altura: null } };

    expect(fontesDaImagem(semDimensoes, undefined)).toMatchObject({
      width: 1920,
      height: 1280,
    });
  });

  it('devolve null se o asset foi apagado', () => {
    expect(fontesDaImagem({ asset: null }, 4 / 3)).toBeNull();
  });

  it('usa o url do asset direto, sem srcset, fora do CDN (modo fixtures)', () => {
    const placeholder = 'data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E';
    const base = imagem();
    const fixture = { asset: base.asset && { ...base.asset, url: placeholder } };

    expect(fontesDaImagem(fixture, 4 / 3)).toEqual({
      src: placeholder,
      srcset: undefined,
      width: 1920,
      height: 1440,
    });
  });
});

describe('versaoDaImagem', () => {
  it('gera uma URL só, recortada na proporção e na largura pedida', () => {
    const versao = versaoDaImagem(imagem(), 480, 4 / 3);
    expect(versao).toMatchObject({ width: 480, height: 360 });

    const url = new URL(versao?.src ?? '');
    expect(url.searchParams.get('w')).toBe('480');
    expect(url.searchParams.get('h')).toBe('360');
    expect(url.searchParams.get('fit')).toBe('crop');
    expect(url.searchParams.get('auto')).toBe('format');
  });

  it('não amplia uma imagem menor que a largura pedida', () => {
    expect(versaoDaImagem(imagem({}, 400, 300), 480, 4 / 3)).toMatchObject({
      width: 400,
      height: 300,
    });
  });

  it('devolve null se o asset foi apagado', () => {
    expect(versaoDaImagem({ asset: null }, 480, 4 / 3)).toBeNull();
  });

  it('usa o url do asset direto fora do CDN (modo fixtures)', () => {
    const placeholder = 'data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E';
    const base = imagem();
    const fixture = { asset: base.asset && { ...base.asset, url: placeholder } };
    expect(versaoDaImagem(fixture, 480, 4 / 3)).toEqual({
      src: placeholder,
      width: 480,
      height: 360,
    });
  });
});
