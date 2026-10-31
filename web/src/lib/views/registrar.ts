import { isbot } from 'isbot';

// Regras do contador de visualizações (#56), separadas da rota /api/views para serem testadas sem
// Redis nem Vercel. Como o contador funciona, o custo e como conferir: docs/visualizacoes.md.

/** Ranking de todo o tempo (decidido na #1): um sorted set com o `_id` do post e o total. */
export const CHAVE_DO_RANKING = 'views:all';

/** Por quanto tempo a mesma pessoa no mesmo post não conta de novo. */
export const JANELA_EM_SEGUNDOS = 30 * 60;

/** O corpo é só `{"id":"..."}`; o resto é descartado sem ler. */
export const TAMANHO_MAXIMO = 256;

/** O que aconteceu com a visualização; só aparece no log e nos testes, a resposta é sempre 204. */
export type Resultado =
  | 'contada'
  | 'repetida'
  | 'fora-de-producao'
  | 'sem-user-agent'
  | 'bot'
  | 'id-invalido'
  | 'sem-redis';

/** Um comando do Redis, como a API REST do Upstash recebe: `['SET', 'chave', '1']`. */
export type Comando = (string | number)[];

export interface Redis {
  executar(comando: Comando): Promise<unknown>;
}

/** O `id` de `{"id":"..."}`, ou `null` se o corpo não for isso. */
export function lerId(corpo: string): string | null {
  if (corpo.length > TAMANHO_MAXIMO) return null;
  try {
    const dados: unknown = JSON.parse(corpo);
    if (typeof dados !== 'object' || dados === null || !('id' in dados)) return null;
    return typeof dados.id === 'string' && dados.id !== '' ? dados.id : null;
  } catch {
    return null;
  }
}

/** O dia em São Paulo (AAAA-MM-DD), que troca o sal da chave de anti-duplicação. */
function diaEmSaoPaulo(agora: Date): string {
  return agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

/**
 * `seen:{sha256(ip|ua|id|sal)}`, com o sal trocando todo dia. O IP nunca é guardado em claro, e o
 * segredo no sal impede achar o IP testando todos os endereços contra o hash.
 */
export async function chaveDeVisto(
  { ip, userAgent, id }: { ip: string; userAgent: string; id: string },
  segredo: string,
  agora: Date,
): Promise<string> {
  const sal = `${segredo}:${diaEmSaoPaulo(agora)}`;
  const bytes = new TextEncoder().encode([ip, userAgent, id, sal].join('|'));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return `seen:${Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export interface Visualizacao {
  /** O corpo da requisição, ainda em texto. */
  corpo: string;
  userAgent: string | null;
  ip: string;
}

export interface Contexto {
  /** O `VERCEL_ENV` do deploy: só `production` conta (previews, E2E e local, não). */
  ambiente: string | undefined;
  idsPublicados: ReadonlySet<string>;
  /** `null` quando o Upstash não está configurado. */
  redis: Redis | null;
  segredo: string;
  agora: Date;
}

/**
 * Conta a visualização se ela for nova: no máximo dois comandos, `SET seen:… NX EX` e, se a chave
 * não existia, `ZINCRBY views:all 1 id`. Erros do Redis sobem para a rota, que os registra no log.
 */
export async function registrarVisualizacao(
  { corpo, userAgent, ip }: Visualizacao,
  { ambiente, idsPublicados, redis, segredo, agora }: Contexto,
): Promise<Resultado> {
  if (ambiente !== 'production') return 'fora-de-producao';
  if (!userAgent) return 'sem-user-agent';
  if (isbot(userAgent)) return 'bot';

  const id = lerId(corpo);
  if (!id || !idsPublicados.has(id)) return 'id-invalido';
  if (!redis) return 'sem-redis';

  const chave = await chaveDeVisto({ ip, userAgent, id }, segredo, agora);
  const nova = await redis.executar(['SET', chave, 1, 'NX', 'EX', JANELA_EM_SEGUNDOS]);
  if (nova !== 'OK') return 'repetida';

  await redis.executar(['ZINCRBY', CHAVE_DO_RANKING, 1, id]);
  return 'contada';
}

/**
 * Cliente mínimo da API REST do Upstash: um comando por requisição, sem o @upstash/redis.
 * https://upstash.com/docs/redis/features/restapi
 */
export function redisDoUpstash(url: string, token: string, buscar = fetch): Redis {
  return {
    async executar(comando) {
      const resposta = await buscar(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(comando),
      });
      const dados = (await resposta.json()) as { result?: unknown; error?: string };
      if (!resposta.ok || dados.error) {
        throw new Error(`Upstash ${resposta.status}: ${dados.error ?? 'erro desconhecido'}`);
      }
      return dados.result;
    },
  };
}
