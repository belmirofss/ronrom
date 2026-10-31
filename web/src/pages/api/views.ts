import type { APIRoute } from 'astro';
import { KV_REST_API_TOKEN, KV_REST_API_URL, VERCEL_ENV } from 'astro:env/server';
import { IDS_PUBLICADOS } from 'virtual:ronrom/ids-publicados';

import { redisDoUpstash, registrarVisualizacao, TAMANHO_MAXIMO } from '@/lib/views/registrar';

// Registra uma visualização de post (#56): o script do RegistroDeVisualizacao manda `{"id":"..."}`
// com sendBeacon depois de 5 s de leitura. Responde sempre 204 sem corpo, conte ou não, e nunca
// atrasa a página. As regras ficam em src/lib/views/registrar.ts; o resto em docs/visualizacoes.md.
export const prerender = false;

const redis =
  KV_REST_API_URL && KV_REST_API_TOKEN ? redisDoUpstash(KV_REST_API_URL, KV_REST_API_TOKEN) : null;

const vazio = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/** O IP de quem visita, que a Vercel passa no x-forwarded-for; só entra no hash, nunca em claro. */
function ipDe(lerClientAddress: () => string): string {
  try {
    return lerClientAddress();
  } catch {
    return '';
  }
}

export const POST: APIRoute = async (contexto) => {
  const { request } = contexto;
  if (Number(request.headers.get('content-length') ?? 0) > TAMANHO_MAXIMO) return vazio();

  try {
    await registrarVisualizacao(
      {
        corpo: await request.text(),
        userAgent: request.headers.get('user-agent'),
        ip: ipDe(() => contexto.clientAddress),
      },
      {
        ambiente: VERCEL_ENV,
        idsPublicados: IDS_PUBLICADOS,
        redis,
        segredo: KV_REST_API_TOKEN ?? '',
        agora: new Date(),
      },
    );
  } catch (erro) {
    // Redis fora do ar, cota estourada, timeout: a visualização se perde e a página nem percebe.
    console.error('[views] falha ao registrar a visualização', erro);
  }
  return vazio();
};
