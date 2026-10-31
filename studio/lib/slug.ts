// Regras de slug da política de URLs (docs/seo-urls.md#slugs). Usado pelos schemas de
// categoria, formato e post, e pelo script da taxonomia inicial.

// Minúsculas, números e hífens simples, sem hífen no começo nem no fim.
export const FORMATO_DO_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Limite padrão do campo slug do Sanity.
export const TAMANHO_MAXIMO_DO_SLUG = 96;

// `/reviews/pagina/2` precisa significar sempre "página 2 das reviews".
export const SLUGS_RESERVADOS: readonly string[] = ['pagina'];

// "Restaurantes e cafés" → "restaurantes-e-cafes". Não remove palavras como "e" ou "de".
export function slugify(texto: string): string {
  return (
    texto
      // NFD separa a letra do acento (é → e + ´) e da cedilha (ç → c + ¸).
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, TAMANHO_MAXIMO_DO_SLUG)
      // O corte pode parar logo depois de um hífen.
      .replace(/-+$/, '')
  );
}

// Mensagem de erro para mostrar no Studio, ou `undefined` quando o slug é válido.
export function problemaNoSlug(slug: string): string | undefined {
  if (!FORMATO_DO_SLUG.test(slug)) {
    return 'Use só letras minúsculas sem acento, números e hífens, sem hífen no começo nem no fim. Clique em "Gerar" para criar automaticamente.';
  }
  if (slug.length > TAMANHO_MAXIMO_DO_SLUG) {
    return `Use no máximo ${TAMANHO_MAXIMO_DO_SLUG} caracteres.`;
  }
  if (SLUGS_RESERVADOS.includes(slug)) {
    return `"${slug}" é reservado para a paginação do site. Escolha outro.`;
  }
  return undefined;
}
