import { CHAVE_DO_RANKING, type Redis } from './registrar';

// Regras da rota /api/mais-lidos (#57), separadas para serem testadas sem Redis nem Vercel. A rota
// responde do CDN da Vercel por uma hora, então o Redis recebe no máximo uma leitura por hora para
// cada `limite`. Como o ranking é contado e conferido: docs/visualizacoes.md.

/** Quantos posts a aba "Mais lidos" mostra (`?limite=10`). */
export const LIMITE_PADRAO = 10;

/** O maior `limite` aceito: um pedido maior não chega ao Redis. */
export const LIMITE_MAXIMO = 20;

/**
 * Quantos posts a mais a rota lê além do `limite`, para ainda devolver `limite` posts quando
 * alguns do topo foram despublicados. Continua sendo um comando só.
 */
export const FOLGA = 10;

/** Uma hora no CDN e, depois, mais um dia servindo a cópia antiga enquanto a nova é buscada. */
export const CACHE_DO_RANKING = 'public, s-maxage=3600, stale-while-revalidate=86400';

/** Um post do ranking: o `_id` e o total de visualizações de todo o tempo. */
export interface Lido {
  id: string;
  views: number;
}

const INTEIRO = /^\d{1,3}$/;

/**
 * O `limite` da query string, `LIMITE_PADRAO` sem ele, ou `null` se o pedido não for só
 * `?limite=N` com N de 1 a `LIMITE_MAXIMO`. Qualquer outro parâmetro também dá `null`: cada query
 * string diferente é outra entrada no cache do CDN, e um `?x=123` mudando a cada vez faria toda
 * requisição chegar ao Redis.
 */
export function lerLimite(parametros: URLSearchParams): number | null {
  const chaves = [...parametros.keys()];
  if (chaves.some((chave) => chave !== 'limite') || chaves.length > 1) return null;

  const valor = parametros.get('limite');
  if (valor === null) return LIMITE_PADRAO;
  if (!INTEIRO.test(valor)) return null;
  const limite = Number(valor);
  return limite >= 1 && limite <= LIMITE_MAXIMO ? limite : null;
}

/**
 * A resposta do `ZREVRANGE … WITHSCORES` pela API REST do Upstash, uma lista plana
 * `["id", "12", "outro-id", "3"]`, como `[{ id, views }]`. Lança erro em qualquer outro formato.
 */
export function lerRanking(resultado: unknown): Lido[] {
  if (!Array.isArray(resultado) || resultado.length % 2 !== 0) {
    throw new Error(`Ranking em formato inesperado: ${JSON.stringify(resultado)}`);
  }
  const lidos: Lido[] = [];
  for (let i = 0; i < resultado.length; i += 2) {
    const [id, views] = [resultado[i], Number(resultado[i + 1])];
    if (typeof id !== 'string' || !Number.isFinite(views)) {
      throw new Error(`Item do ranking inválido: ${JSON.stringify([id, resultado[i + 1]])}`);
    }
    lidos.push({ id, views });
  }
  return lidos;
}

/**
 * Os `limite` posts mais lidos de todo o tempo (decidido na #1), do mais para o menos lido, só
 * entre os publicados neste deploy. Um comando: `ZREVRANGE views:all 0 N WITHSCORES`. Sem o Redis
 * configurado, a lista vazia, e o "Mais lidos" mostra os mais recentes.
 */
export async function buscarMaisLidos(
  limite: number,
  { redis, idsPublicados }: { redis: Redis | null; idsPublicados: ReadonlySet<string> },
): Promise<Lido[]> {
  if (!redis) return [];
  const resultado = await redis.executar([
    'ZREVRANGE',
    CHAVE_DO_RANKING,
    0,
    limite + FOLGA - 1,
    'WITHSCORES',
  ]);
  return lerRanking(resultado)
    .filter(({ id, views }) => views > 0 && idsPublicados.has(id))
    .slice(0, limite);
}
