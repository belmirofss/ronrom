import { NOME_DO_SITE } from '@/lib/utils/site';

export function tituloDaPagina(titulo?: string): string {
  return titulo ? `${titulo} · ${NOME_DO_SITE}` : NOME_DO_SITE;
}
