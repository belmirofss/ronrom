// Projeção GROQ de uma imagem do Sanity, usada pelo texto do post (lib/corpo.ts) e pelas consultas
// do site (capa, foto da autora, imagem de compartilhamento).

// `capa${IMAGEM_NO_GROQ}` mantém o recorte, o hotspot, o `alt` e a legenda, e troca a referência do
// asset pelo próprio asset: `url` e `_id` para montar o endereço no CDN, as dimensões para o
// `width`/`height` da tag (sem CLS) e o `lqip`, uma prévia borrada em base64 para mostrar enquanto a
// imagem carrega. Asset apagado vem como `asset: null`.
export const IMAGEM_NO_GROQ = `{
  ...,
  "asset": asset->{
    _id,
    url,
    "largura": metadata.dimensions.width,
    "altura": metadata.dimensions.height,
    "lqip": metadata.lqip
  }
}`;
