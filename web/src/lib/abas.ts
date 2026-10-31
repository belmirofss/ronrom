// Teclado das abas (Abas.astro), no padrão WAI-ARIA Tabs com ativação automática: a aba que
// recebe o foco já fica selecionada. https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

/**
 * O índice da aba que recebe o foco quando `tecla` é pressionada na aba `atual`, numa lista de
 * `total` abas, ou `null` se a tecla não move o foco. ←/→ dão a volta nas pontas; Home e End vão
 * para a primeira e a última.
 */
export function abaDaTecla(tecla: string, atual: number, total: number): number | null {
  if (total < 1) return null;
  switch (tecla) {
    case 'ArrowLeft':
      return (atual - 1 + total) % total;
    case 'ArrowRight':
      return (atual + 1) % total;
    case 'Home':
      return 0;
    case 'End':
      return total - 1;
    default:
      return null;
  }
}
