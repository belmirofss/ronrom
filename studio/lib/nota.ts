// Regras da nota da review, de meio a 5 corações em passos de meio (#1). Usadas pelo schema do
// post, pelo input de corações e pelo preview da lista de posts.

export const NOTA_MAXIMA = 5;

// 0.5, 1, 1.5 … 5: os dez valores que a autora pode escolher.
export const NOTAS = Array.from({ length: NOTA_MAXIMA * 2 }, (_, i) => (i + 1) / 2);

export const ERRO_SEM_NOTA = 'Dê uma nota de meio a 5 corações.';

export function notaValida(nota: unknown): nota is number {
  return typeof nota === 'number' && NOTAS.includes(nota);
}

// 0.5 → "meio coração", 1 → "1 coração", 1.5 → "1 coração e meio", 4 → "4 corações".
export function rotuloDaNota(nota: number) {
  const inteiros = Math.floor(nota);
  if (inteiros === 0) return 'meio coração';
  const coracoes = `${inteiros} ${inteiros === 1 ? 'coração' : 'corações'}`;
  return Number.isInteger(nota) ? coracoes : `${coracoes} e meio`;
}

export type Preenchimento = 'cheio' | 'meio' | 'vazio';

// Como desenhar cada um dos 5 corações. Nota ausente ou inválida desenha todos vazios.
export function coracoesDaNota(nota: number | undefined): Preenchimento[] {
  const valida = notaValida(nota) ? nota : 0;
  return Array.from({ length: NOTA_MAXIMA }, (_, i) =>
    valida >= i + 1 ? 'cheio' : valida === i + 0.5 ? 'meio' : 'vazio',
  );
}

// Mensagem de erro do campo, ou `undefined` quando a nota está certa para o tipo do post.
export function problemaNaNota(tipo: unknown, nota: number | undefined) {
  if (tipo !== 'review') {
    return nota === undefined
      ? undefined
      : 'Só review tem nota. Clique em "Limpar" para tirar a nota deste post.';
  }
  if (nota === undefined) return ERRO_SEM_NOTA;
  return notaValida(nota) ? undefined : `${ERRO_SEM_NOTA} Use passos de meio coração.`;
}
