// Nota da review em corações: de meio a 5, em passos de meio (#1). Usada pelo `Coracoes.astro` e
// pelo `reviewRating` do JSON-LD (#51), para a nota mostrada e a do markup serem sempre a mesma.
// As mesmas regras valem no Studio (studio/lib/nota.ts), que não deixa publicar nota fora delas.

export const NOTA_MINIMA = 0.5;
export const NOTA_MAXIMA = 5;

export type Preenchimento = 'cheio' | 'meio' | 'vazio';

const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** A própria nota, se for uma das dez válidas (0,5 a 5 em passos de 0,5). Senão, lança erro. */
export function validarNota(nota: number | null | undefined): number {
  if (
    typeof nota !== 'number' ||
    !Number.isInteger(nota * 2) ||
    nota < NOTA_MINIMA ||
    nota > NOTA_MAXIMA
  ) {
    // Derruba o build: review com nota errada não chega a produção.
    throw new Error(`Nota inválida: ${nota} (precisa ser de 0.5 a 5, em passos de 0.5).`);
  }
  return nota;
}

/** Os 5 corações da nota, da esquerda para a direita: 4.5 → 4 cheios e 1 meio. */
export function coracoesDaNota(nota: number | null | undefined): Preenchimento[] {
  const valida = validarNota(nota);
  return Array.from({ length: NOTA_MAXIMA }, (_, i) =>
    valida >= i + 1 ? 'cheio' : valida === i + 0.5 ? 'meio' : 'vazio',
  );
}

/** O nome acessível da nota, com vírgula decimal: "Nota: 4,5 de 5 corações". */
export function rotuloDaNota(nota: number | null | undefined): string {
  return `Nota: ${NUMERO.format(validarNota(nota))} de ${NOTA_MAXIMA} corações`;
}
