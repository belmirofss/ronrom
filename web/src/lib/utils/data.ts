// O build da Vercel roda em UTC: sem o fuso fixo, um post publicado às 23h em Brasília
// apareceria com a data do dia seguinte.
const FORMATO = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'America/Sao_Paulo',
});

/** Data por extenso no fuso de Brasília: `"14 de março de 2026"`. Lança erro com data inválida. */
export function formatarData(iso: string): string {
  const data = new Date(iso);
  if (!iso || Number.isNaN(data.getTime())) {
    throw new Error(`Data inválida: "${iso}".`);
  }
  return FORMATO.format(data);
}
