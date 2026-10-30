// Regras do texto do post (Portable Text) que não dependem do Sanity: os esquemas aceitos no link
// externo e a projeção GROQ que resolve os links internos e as imagens. Usadas pelo schema do corpo
// (schemaTypes/corpo.ts) e pelas consultas do site (web/src/lib/sanity/consultas.ts).

import { IMAGEM_NO_GROQ } from './imagem';

// Link externo: páginas e e-mail. Sem `tel:` nem `javascript:`, que o site não sabe mostrar.
export const ESQUEMAS_DO_LINK_EXTERNO = ['http', 'https', 'mailto'];

// `"corpo": ${CORPO_NO_GROQ}` numa consulta de post troca a referência de cada link interno pelo
// post de destino, com os slugs já resolvidos para o `urlDoPost` (docs/seo-urls.md). O link guarda
// o `_id`, não o slug: o caminho é montado no build e acompanha a troca de slug, categoria ou
// formato. Destino apagado ou ainda não publicado vem como `post: null`, e o site mostra só o texto.
// As imagens soltas e as da galeria vêm com o asset expandido (lib/imagem.ts).
// Fica num template literal sem chamadas de função: o typegen do Sanity só lê consultas que
// consegue montar sem rodar o código.
export const CORPO_NO_GROQ = `corpo[]{
  ...,
  _type == "block" => {
    markDefs[]{
      ...,
      _type == "linkInterno" => {
        "post": post->{
          tipo,
          "slug": slug.current,
          categoria->{ "slug": slug.current },
          formato->{ "slug": slug.current }
        }
      }
    }
  },
  _type == "imagem" => ${IMAGEM_NO_GROQ},
  _type == "galeria" => {
    "imagens": imagens[]${IMAGEM_NO_GROQ}
  }
}`;
