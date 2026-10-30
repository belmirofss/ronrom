import { NOME_DO_SITE, TAGLINE } from '@/lib/utils/site';

// "{título} · Ronrom"; sem título (a home), "Ronrom · {tagline}".
export function tituloDaPagina(titulo?: string): string {
  return titulo ? `${titulo} · ${NOME_DO_SITE}` : `${NOME_DO_SITE} · ${TAGLINE}`;
}
