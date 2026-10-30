import type { Post, SanityImageAsset } from '../tipos.gerados';

// Peças para montar os documentos das fixtures (dataset.ts) no formato que o Sanity guarda, com
// os tipos que o typegen gerou dos schemas: um campo que muda no Studio quebra o `astro check` aqui.

/** Campos de sistema que todo documento tem. */
export function sistema(criadoEm: string, atualizadoEm = criadoEm) {
  return { _createdAt: criadoEm, _updatedAt: atualizadoEm, _rev: 'fixture' };
}

// `_key` de cada item de array (blocos, spans, imagens da galeria, tags). Só precisa ser única
// dentro do array; um contador do módulo é determinístico entre um build e outro.
let ultimaChave = 0;
export function chave(): string {
  ultimaChave += 1;
  return `fx${ultimaChave}`;
}

export const referencia = (id: string) => ({ _type: 'reference' as const, _ref: id });

export const referenciaComChave = (id: string) => ({ ...referencia(id), _key: chave() });

// --- Imagens ---

// Placeholder em SVG, num data URI: sem arquivo no repositório e sem rede, nem no build nem no
// navegador. As cores são as do layout "Caderno" (web/src/styles/tokens.css).
const FUNDOS = ['#F2DACE', '#D49A9A', '#EBD3C8', '#AA5E7A'];

function svg(largura: number, altura: number, rotulo: string, fundo: string): string {
  const texto = rotulo.replace(/[<>&"]/g, '');
  const conteudo =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">` +
    `<rect width="100%" height="100%" fill="${fundo}"/>` +
    `<text x="50%" y="50%" fill="#2E1220" font-family="sans-serif" font-size="${Math.round(altura / 12)}" text-anchor="middle" dominant-baseline="middle">${texto}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(conteudo)}`;
}

/**
 * Asset de imagem no formato do Sanity. O `_id` segue o padrão `image-{id}-{largura}x{altura}-{ext}`
 * dos assets de verdade (o `@sanity/image-url` lê as dimensões dele); o `url` é o placeholder.
 */
export function asset(nome: string, largura: number, altura: number, rotulo: string) {
  const id = `fixture${nome.replace(/[^a-z0-9]/gi, '')}`;
  const url = svg(largura, altura, rotulo, FUNDOS[nome.length % FUNDOS.length] ?? '#F2DACE');
  return {
    _id: `image-${id}-${largura}x${altura}-svg`,
    _type: 'sanity.imageAsset',
    ...sistema('2026-01-01T12:00:00Z'),
    originalFilename: `${nome}.svg`,
    sha1hash: id,
    extension: 'svg',
    mimeType: 'image/svg+xml',
    size: url.length,
    assetId: id,
    path: `images/fixtures/${id}-${largura}x${altura}.svg`,
    url,
    metadata: {
      _type: 'sanity.imageMetadata',
      dimensions: {
        _type: 'sanity.imageDimensions',
        width: largura,
        height: altura,
        aspectRatio: largura / altura,
      },
      lqip: svg(20, Math.max(1, Math.round((20 * altura) / largura)), '', '#EBD3C8'),
      hasAlpha: false,
      isOpaque: true,
    },
  } satisfies SanityImageAsset;
}

type Asset = ReturnType<typeof asset>;

/** Campo de imagem (capa, foto, imagem de compartilhamento) apontando para um asset. */
export function imagem(de: Asset, alt: string, legenda?: string) {
  return {
    _type: 'image' as const,
    asset: referencia(de._id),
    alt,
    ...(legenda ? { legenda } : {}),
  };
}

// --- Portable Text ---

type BlocoDoCorpo = Extract<NonNullable<Post['corpo']>[number], { _type: 'block' }>;
type Anotacao = NonNullable<BlocoDoCorpo['markDefs']>[number];
type LinkExterno = Extract<Anotacao, { _type: 'link' }>;
type LinkInterno = Extract<Anotacao, { _type: 'linkInterno' }>;

/** Um pedaço do texto de um bloco: texto puro ou com marcas (negrito, itálico, link). */
export interface Trecho<A extends Anotacao = Anotacao> {
  texto: string;
  marcas: string[];
  anotacao?: A | undefined;
}

export const negrito = (texto: string): Trecho<never> => ({ texto, marcas: ['strong'] });
export const italico = (texto: string): Trecho<never> => ({ texto, marcas: ['em'] });

export function link(texto: string, href: string): Trecho<LinkExterno> {
  const anotacao = { _type: 'link' as const, _key: chave(), href };
  return { texto, marcas: [anotacao._key], anotacao };
}

/** Link para outro post, pelo `_id` (o site resolve o endereço no build). */
export function linkInterno(texto: string, idDoPost: string): Trecho<LinkInterno> {
  const anotacao = { _type: 'linkInterno' as const, _key: chave(), post: referencia(idDoPost) };
  return { texto, marcas: [anotacao._key], anotacao };
}

type Entrada = string | Trecho;

// As anotações que os trechos de um bloco trazem: `never` sem link, só `LinkExterno` com links
// externos. Assim o texto do Sobre, que só aceita link externo, não recebe um link interno.
type AnotacoesDe<T extends readonly Entrada[]> = T[number] extends infer E
  ? E extends { anotacao?: infer A }
    ? Exclude<A, undefined>
    : never
  : never;

// Bloco de texto com o estilo dado. Cada trecho vira um span; as anotações dos links vão para
// `markDefs`. O estilo, a lista e as anotações saem como literais: o texto do Sobre aceita menos
// que o corpo do post, e o tipo de cada um confere isso.
function bloco<E extends NonNullable<BlocoDoCorpo['style']>, T extends readonly Entrada[]>(
  style: E,
  trechos: T,
) {
  const partes = trechos.map((trecho): Trecho =>
    typeof trecho === 'string' ? { texto: trecho, marcas: [] } : trecho,
  );
  return {
    _type: 'block' as const,
    _key: chave(),
    style,
    markDefs: partes.flatMap((parte) =>
      parte.anotacao ? [parte.anotacao] : [],
    ) as AnotacoesDe<T>[],
    children: partes.map((parte) => ({
      _type: 'span' as const,
      _key: chave(),
      text: parte.texto,
      marks: parte.marcas,
    })),
  };
}

export const paragrafo = <T extends Entrada[]>(...trechos: T) => bloco('normal', trechos);

export const subtitulo = <N extends 'h2' | 'h3'>(nivel: N, texto: string) => bloco(nivel, [texto]);

/** Citação longa no meio do texto (o estilo "Citação" do editor). */
export const citacao = <T extends Entrada[]>(...trechos: T) => bloco('blockquote', trechos);

export const itemDeLista = <L extends NonNullable<BlocoDoCorpo['listItem']>, T extends Entrada[]>(
  listItem: L,
  trechos: T,
  level = 1,
) => ({ ...bloco('normal', trechos), listItem, level });

export function imagemNoTexto(
  de: Asset,
  alt: string,
  largura: 'normal' | 'larga',
  legenda?: string,
) {
  return { ...imagem(de, alt, legenda), _type: 'imagem' as const, _key: chave(), largura };
}

export function galeria(imagens: { de: Asset; alt: string; legenda?: string }[]) {
  return {
    _type: 'galeria' as const,
    _key: chave(),
    imagens: imagens.map(({ de, alt, legenda }) => ({
      ...imagem(de, alt, legenda),
      _key: chave(),
    })),
  };
}

/** Vídeo como o VideoInput do Studio grava: o link e, tirados dele, o provedor e o ID. */
export function video(
  provedor: 'youtube' | 'instagram',
  idVideo: string,
  url: string,
  legenda?: string,
) {
  return {
    _type: 'video' as const,
    _key: chave(),
    url,
    provedor,
    idVideo,
    ...(legenda ? { legenda } : {}),
  };
}

export function citacaoDestaque(texto: string, fonte?: string) {
  return { _type: 'citacaoDestaque' as const, _key: chave(), texto, ...(fonte ? { fonte } : {}) };
}
