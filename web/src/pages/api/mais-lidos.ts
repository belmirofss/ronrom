import type { APIRoute } from 'astro';
import { KV_REST_API_TOKEN, KV_REST_API_URL } from 'astro:env/server';
import { IDS_PUBLICADOS } from 'virtual:ronrom/ids-publicados';

import { buscarMaisLidos, CACHE_DO_RANKING, LIMITE_MAXIMO, lerLimite } from '@/lib/views/ranking';
import { redisDoUpstash } from '@/lib/views/registrar';

// O ranking do "Mais lidos" (#57): `GET /api/mais-lidos?limite=10` responde `[{ id, views }]`, do
// mais para o menos lido. A resposta fica uma hora no CDN da Vercel, então o Redis recebe no
// máximo uma leitura por hora, não uma por visita à home. As regras ficam em
// src/lib/views/ranking.ts; o resto em docs/visualizacoes.md.
export const prerender = false;

const redis =
  KV_REST_API_URL && KV_REST_API_TOKEN ? redisDoUpstash(KV_REST_API_URL, KV_REST_API_TOKEN) : null;

export const GET: APIRoute = async ({ url }) => {
  const limite = lerLimite(url.searchParams);
  if (limite === null) {
    return Response.json(
      { erro: `Use só ?limite=N, com N de 1 a ${LIMITE_MAXIMO}.` },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const lidos = await buscarMaisLidos(limite, { redis, idsPublicados: IDS_PUBLICADOS });
    return Response.json(lidos, { headers: { 'Cache-Control': CACHE_DO_RANKING } });
  } catch (erro) {
    // Redis fora do ar ou cota estourada: a aba mostra o estado de erro, e o 503 não vai para o CDN.
    console.error('[mais-lidos] falha ao ler o ranking', erro);
    return Response.json(
      { erro: 'Ranking indisponível.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
