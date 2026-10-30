// Regras do bloco de galeria do texto do post que não dependem do Sanity: quantas imagens cabem e
// o endereço das miniaturas da prévia. Usadas pelo schema (schemaTypes/corpo.ts) e pela prévia
// (componentes/PreviewGaleria.tsx).

export const MINIMO_DE_IMAGENS = 2;
export const MAXIMO_DE_IMAGENS = 12;

// Problema na quantidade de imagens, ou `null` se está dentro do limite. Galeria vazia conta como
// zero: a regra `min` do Sanity não olha um campo que ainda não existe.
export function problemaNaQuantidadeDeImagens(quantidade: number) {
  if (quantidade < MINIMO_DE_IMAGENS) {
    return `A galeria precisa de pelo menos ${MINIMO_DE_IMAGENS} imagens. Para uma só, use o bloco "Imagem".`;
  }
  if (quantidade > MAXIMO_DE_IMAGENS) {
    return `A galeria aceita até ${MAXIMO_DE_IMAGENS} imagens. Divida em duas galerias ou tire ${quantidade - MAXIMO_DE_IMAGENS}.`;
  }
  return null;
}

// Miniatura quadrada de uma imagem do Sanity, pelo CDN de imagens (o `url` do asset aceita os
// parâmetros de corte e tamanho). O dobro do tamanho mostrado, para telas de alta densidade.
export function urlDaMiniatura(urlDoAsset: string, tamanho: number) {
  const lado = tamanho * 2;
  return `${urlDoAsset}?w=${lado}&h=${lado}&fit=crop&auto=format`;
}
