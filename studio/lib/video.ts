// Regras do bloco de vídeo do texto do post que não dependem do Sanity: quais links são aceitos e
// como tirar deles o provedor e o ID. Usadas pelo schema (schemaTypes/corpo.ts), pelo input que
// grava `provedor` e `idVideo` (componentes/VideoInput.tsx) e pela prévia no editor.

export type Provedor = 'youtube' | 'instagram';

export interface VideoDoLink {
  provedor: Provedor;
  idVideo: string;
}

export const MENSAGEM_DO_LINK_DO_VIDEO =
  'Cole o link de um vídeo do YouTube ou de um post do Instagram.';

// O ID do YouTube tem sempre 11 caracteres; o código de um post do Instagram não tem tamanho fixo.
// Depois do ID, o link pode seguir com parâmetros (`?si=`, `&t=`) ou âncora, mas não com mais
// caracteres do ID: `youtu.be/` com 12 caracteres é recusado.
const PADROES: { provedor: Provedor; regex: RegExp }[] = [
  {
    provedor: 'youtube',
    regex: /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\/?\?(?:[^#]*&)?v=([\w-]{11})(?:[&#]|$)/i,
  },
  { provedor: 'youtube', regex: /^https?:\/\/youtu\.be\/([\w-]{11})\/?(?:[?#]|$)/i },
  {
    provedor: 'youtube',
    regex: /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([\w-]{11})\/?(?:[?#]|$)/i,
  },
  {
    provedor: 'instagram',
    regex: /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reels?)\/([\w-]+)\/?(?:[?#]|$)/i,
  },
];

// Provedor e ID do vídeo, ou `null` se o link não é de um vídeo do YouTube nem de um post ou reel
// do Instagram.
export function videoDoLink(url: string | undefined): VideoDoLink | null {
  const link = url?.trim();
  if (!link) return null;

  for (const { provedor, regex } of PADROES) {
    const idVideo = regex.exec(link)?.[1];
    if (idVideo) return { provedor, idVideo };
  }
  return null;
}

// A `hqdefault` existe para todo vídeo (a `maxresdefault`, só para os enviados em alta resolução).
export function miniaturaDoYoutube(idVideo: string) {
  return `https://img.youtube.com/vi/${idVideo}/hqdefault.jpg`;
}

// Quando o vídeo não existe mais, o YouTube responde com uma imagem cinza de 120 px de largura no
// lugar da miniatura, em vez de um erro.
export const LARGURA_DA_MINIATURA_INDISPONIVEL = 120;

// Diz se o `provedor` e o `idVideo` guardados no bloco deixaram de acompanhar o link: o VideoInput
// usa para saber quando gravar, e a validação, para barrar dados mudados fora do Studio.
export function videoDesatualizado(valor: {
  url?: string | undefined;
  provedor?: string | undefined;
  idVideo?: string | undefined;
}) {
  const video = videoDoLink(valor.url);
  return video?.provedor !== valor.provedor || video?.idVideo !== valor.idVideo;
}
