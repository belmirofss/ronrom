/** Velocidade de leitura usada no "X min de leitura". */
export const PALAVRAS_POR_MINUTO = 200;

/**
 * O mínimo que o tempo de leitura lê do Portable Text: blocos de texto têm `children` com
 * `text`. Imagens, galerias, vídeos e citações em destaque não têm, e não contam.
 */
interface BlocoDoPortableText {
  _type: string;
  children?: readonly { text?: string | null | undefined }[] | null | undefined;
}

// Palavra é um pedaço entre espaços com pelo menos uma letra ou número: "—" e "..." soltos não
// contam, "R$ 10" conta duas.
const TEM_LETRA_OU_NUMERO = /[\p{L}\p{N}]/u;

function palavrasDoBloco(bloco: BlocoDoPortableText): number {
  if (bloco._type !== 'block' || !bloco.children) return 0;
  // Os spans de um bloco são pedaços da mesma linha ("neg" em negrito + "rito"): juntam sem espaço.
  const texto = bloco.children.map((span) => span.text ?? '').join('');
  return texto.split(/\s+/).filter((pedaco) => TEM_LETRA_OU_NUMERO.test(pedaco)).length;
}

/**
 * "X min de leitura" do texto de um post, a 200 palavras por minuto, arredondando para cima e com
 * mínimo de 1. Conta parágrafos, subtítulos, listas e citações; legendas e `alt` ficam de fora.
 */
export function tempoDeLeitura(
  portableText: readonly BlocoDoPortableText[] | null | undefined,
): string {
  const palavras = (portableText ?? []).reduce((total, bloco) => total + palavrasDoBloco(bloco), 0);
  const minutos = Math.max(1, Math.ceil(palavras / PALAVRAS_POR_MINUTO));
  return `${minutos} min de leitura`;
}
