import { ESQUEMAS_DO_LINK_EXTERNO } from '../../../studio/lib/corpo';
import { slugify } from '../../../studio/lib/slug';
import { urlDoPost, type PostComRota } from '@/lib/rotas';
import type { CONSULTA_DO_POST_RESULT } from '@/lib/sanity/tipos.gerados';

// Regras do texto do post (Portable Text) que o <CorpoDoPost> aplica antes de renderizar: o nível
// e a âncora dos subtítulos, os blocos vazios que saem e o endereço de cada link. Ficam aqui, sem
// Astro, para os testes e o futuro sumário do post usarem as mesmas regras.

/** O corpo como a `CONSULTA_DO_POST` devolve. */
export type Corpo = NonNullable<NonNullable<CONSULTA_DO_POST_RESULT>['corpo']>;
type ItemDoCorpo = Corpo[number];
type BlocoDeTexto = Extract<ItemDoCorpo, { _type: 'block' }>;

/** Bloco de texto pronto para renderizar. Subtítulo tem `style` `h2` ou `h3` e a `ancora`. */
export type BlocoPreparado = BlocoDeTexto & { ancora?: string };

/** Item do corpo pronto para renderizar. */
export type ItemPreparado = Exclude<ItemDoCorpo, BlocoDeTexto> | BlocoPreparado;

// O `<main id="conteudo">` do LayoutBase: um subtítulo "Conteúdo" não pode repetir o id.
const IDS_DA_PAGINA = ['conteudo'];

// Âncora de um subtítulo sem letra nem número ("???"), que o slugify deixa vazia.
const ANCORA_PADRAO = 'secao';

function textoDoBloco(bloco: BlocoDeTexto): string {
  return (bloco.children ?? []).map((span) => span.text ?? '').join('');
}

/**
 * Prepara o corpo para o renderizador:
 *
 * - **Subtítulos sem pular nível.** O título do post é o h1, então um h1 do editor vira h2, e um
 *   h3 antes de qualquer h2 também vira h2. Cada subtítulo ganha a `ancora` (o `id`), com o
 *   slugify das URLs e `-2`, `-3`... nos repetidos.
 * - **Sem bloco vazio.** Parágrafos, subtítulos e itens de lista sem texto (o Enter a mais no
 *   editor) saem: renderizados, seriam espaço em branco ou um subtítulo mudo no leitor de tela.
 * - **Item de lista é texto.** Um item com estilo de subtítulo vira texto normal, para não criar
 *   um subtítulo dentro da lista.
 */
export function prepararCorpo(corpo: Corpo | null | undefined): ItemPreparado[] {
  const usadas = new Set(IDS_DA_PAGINA);
  let temH2 = false;

  return (corpo ?? []).flatMap((item): ItemPreparado[] => {
    if (item._type !== 'block') return [item];

    const texto = textoDoBloco(item).trim();
    if (!texto) return [];
    if (item.listItem) return [{ ...item, style: 'normal' }];

    // O schema não tem h1, mas um documento vindo da API ou de uma importação pode ter.
    const estilo: string = item.style ?? 'normal';
    if (estilo !== 'h1' && estilo !== 'h2' && estilo !== 'h3') return [item];

    const nivel = estilo === 'h3' && temH2 ? 'h3' : 'h2';
    temH2 = true;

    const base = slugify(texto) || ANCORA_PADRAO;
    let ancora = base;
    for (let n = 2; usadas.has(ancora); n++) ancora = `${base}-${n}`;
    usadas.add(ancora);

    return [{ ...item, style: nivel, ancora }];
  });
}

/**
 * Endereço de um link externo, ou `null` se o esquema não é um dos aceitos pelo Studio (`http`,
 * `https` e `mailto`). O Studio já recusa os outros, mas um documento vindo da API não passa por
 * ele: um `javascript:` vira texto, nunca link.
 */
export function hrefDoLinkExterno(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const esquema = new URL(href).protocol.slice(0, -1);
    return ESQUEMAS_DO_LINK_EXTERNO.includes(esquema) ? href : null;
  } catch {
    return null;
  }
}

/**
 * Endereço de um link para outro post, montado pelo `urlDoPost`. `null` se o destino foi apagado
 * ou ainda não está no ar (a consulta devolve `post: null`): o texto aparece sem link.
 */
export function hrefDoLinkInterno(post: PostComRota | null | undefined): string | null {
  return post ? urlDoPost(post) : null;
}
