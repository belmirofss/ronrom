const FUSO = 'America/Sao_Paulo';

// O build da Vercel roda em UTC: sem o fuso fixo, um post publicado às 23h em Brasília
// apareceria com a data do dia seguinte.
const FORMATO = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: FUSO,
});

/** Data por extenso no fuso de Brasília: `"14 de março de 2026"`. Lança erro com data inválida. */
export function formatarData(iso: string): string {
  return FORMATO.format(lerData(iso));
}

// As partes de data e hora no fuso de Brasília, com o deslocamento ("GMT-03:00").
const PARTES = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
});

/**
 * ISO 8601 no fuso de Brasília, com o deslocamento: `"2026-03-14T23:30:00-03:00"`. O Sanity guarda
 * as datas em UTC (`"2026-03-15T02:30:00Z"`); o JSON-LD (#50) publica no fuso do site. Lança erro
 * com data inválida.
 */
export function isoNoFuso(iso: string): string {
  const partes = Object.fromEntries(
    PARTES.formatToParts(lerData(iso)).map(({ type, value }) => [type, value]),
  );
  // "GMT" sozinho é o deslocamento zero.
  const deslocamento = partes['timeZoneName']?.replace('GMT', '') || '+00:00';
  const { year, month, day, hour, minute, second } = partes;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${deslocamento}`;
}

function lerData(iso: string): Date {
  const data = new Date(iso);
  if (!iso || Number.isNaN(data.getTime())) {
    throw new Error(`Data inválida: "${iso}".`);
  }
  return data;
}
