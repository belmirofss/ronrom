import type { AstroGlobal } from 'astro';
import { PUBLIC_SANITY_VISUAL_EDITING_ENABLED } from 'astro:env/server';

// As páginas com parâmetro são geradas no build pelo `getStaticPaths`. Na prévia de rascunhos
// (#43, docs/adr/0006), o site roda sob demanda: o `getStaticPaths` não roda, o endereço pode não
// existir e as props dele não chegam. Estas funções cobrem os dois casos.

/** Se este build é o da prévia de rascunhos (projeto ronrom-previa da Vercel). */
export const PREVIA = PUBLIC_SANITY_VISUAL_EDITING_ENABLED;

/**
 * Endereço sem conteúdo. No build estático, o `getStaticPaths` só gera endereços que existem, então
 * é um erro (o build quebra). Na prévia, é um endereço digitado ou desatualizado: a página 404.
 */
export function naoEncontrada(
  Astro: Pick<AstroGlobal, 'rewrite'>,
  mensagem: string,
): Promise<Response> {
  if (!PREVIA) throw new Error(mensagem);
  return Astro.rewrite('/404');
}

/**
 * O número da página de uma listagem: o do `getStaticPaths` (`props.pagina`) ou, na prévia, o do
 * endereço (`/pagina/[n]`). `null` se o endereço não é uma página extra válida (de 2 em diante).
 */
export function numeroDaPagina(pagina: number | undefined, n: string | undefined): number | null {
  if (pagina !== undefined) return pagina;
  if (!n || !/^[1-9]\d*$/.test(n)) return null;
  const numero = Number(n);
  return numero >= 2 ? numero : null;
}
