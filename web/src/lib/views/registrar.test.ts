import { describe, expect, it, vi } from 'vitest';

import {
  CHAVE_DO_RANKING,
  chaveDeVisto,
  type Comando,
  type Contexto,
  JANELA_EM_SEGUNDOS,
  lerId,
  redisDoUpstash,
  registrarVisualizacao,
  type Visualizacao,
} from './registrar';

const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Redis em memória, só com o que a rota usa: SET NX EX e ZINCRBY.
function redisFalso() {
  const chaves = new Set<string>();
  const ranking = new Map<string, number>();
  const comandos: Comando[] = [];
  return {
    chaves,
    ranking,
    comandos,
    async executar(comando: Comando) {
      comandos.push(comando);
      const [nome, chave, valor, membro] = comando.map(String);
      if (nome === 'SET') {
        if (chaves.has(chave ?? '')) return null;
        chaves.add(chave ?? '');
        return 'OK';
      }
      if (nome === 'ZINCRBY') {
        const total = (ranking.get(membro ?? '') ?? 0) + Number(valor);
        ranking.set(membro ?? '', total);
        return String(total);
      }
      throw new Error(`Comando inesperado: ${nome}`);
    },
  };
}

const visita = (mudancas: Partial<Visualizacao> = {}): Visualizacao => ({
  corpo: JSON.stringify({ id: 'post-dias-perfeitos' }),
  userAgent: NAVEGADOR,
  ip: '200.100.50.25',
  ...mudancas,
});

const contexto = (mudancas: Partial<Contexto> = {}): Contexto => ({
  ambiente: 'production',
  idsPublicados: new Set(['post-dias-perfeitos', 'post-mirante']),
  redis: redisFalso(),
  segredo: 'segredo-de-teste',
  agora: new Date('2026-10-31T15:00:00Z'),
  ...mudancas,
});

describe('lerId', () => {
  it('lê o id de {"id": "..."}', () => {
    expect(lerId('{"id":"post-mirante"}')).toBe('post-mirante');
  });

  it.each([
    ['texto que não é JSON', 'post-mirante'],
    ['JSON sem id', '{"slug":"mirante"}'],
    ['id que não é texto', '{"id":42}'],
    ['id vazio', '{"id":""}'],
    ['null', 'null'],
    ['corpo grande demais', JSON.stringify({ id: 'x'.repeat(300) })],
  ])('devolve null para %s', (_caso, corpo) => {
    expect(lerId(corpo)).toBeNull();
  });
});

describe('chaveDeVisto', () => {
  const dados = { ip: '200.100.50.25', userAgent: NAVEGADOR, id: 'post-mirante' };
  const agora = new Date('2026-10-31T15:00:00Z');

  it('é seen: mais um sha256 em hexadecimal, sem o IP em claro', async () => {
    const chave = await chaveDeVisto(dados, 'segredo', agora);
    expect(chave).toMatch(/^seen:[0-9a-f]{64}$/);
    expect(chave).not.toContain('200.100');
  });

  it('é a mesma no mesmo dia de São Paulo e muda no dia seguinte', async () => {
    const manha = await chaveDeVisto(dados, 'segredo', new Date('2026-10-31T10:00:00-03:00'));
    const noite = await chaveDeVisto(dados, 'segredo', new Date('2026-10-31T23:59:00-03:00'));
    const amanha = await chaveDeVisto(dados, 'segredo', new Date('2026-11-01T00:01:00-03:00'));
    expect(noite).toBe(manha);
    expect(amanha).not.toBe(manha);
  });

  it('muda com o IP, o navegador, o post e o segredo', async () => {
    const base = await chaveDeVisto(dados, 'segredo', agora);
    const variacoes = await Promise.all([
      chaveDeVisto({ ...dados, ip: '200.100.50.26' }, 'segredo', agora),
      chaveDeVisto({ ...dados, userAgent: `${NAVEGADOR} Edg/141` }, 'segredo', agora),
      chaveDeVisto({ ...dados, id: 'post-dias-perfeitos' }, 'segredo', agora),
      chaveDeVisto(dados, 'outro-segredo', agora),
    ]);
    for (const chave of variacoes) expect(chave).not.toBe(base);
  });
});

describe('registrarVisualizacao', () => {
  it('conta uma visualização nova com dois comandos: SET NX EX e ZINCRBY', async () => {
    const redis = redisFalso();
    expect(await registrarVisualizacao(visita(), contexto({ redis }))).toBe('contada');
    expect(redis.comandos).toEqual([
      ['SET', expect.stringMatching(/^seen:/), 1, 'NX', 'EX', JANELA_EM_SEGUNDOS],
      ['ZINCRBY', CHAVE_DO_RANKING, 1, 'post-dias-perfeitos'],
    ]);
    expect(redis.ranking.get('post-dias-perfeitos')).toBe(1);
  });

  it('não conta de novo quem já viu o post (recarregar a página): um comando só', async () => {
    const redis = redisFalso();
    await registrarVisualizacao(visita(), contexto({ redis }));
    expect(await registrarVisualizacao(visita(), contexto({ redis }))).toBe('repetida');
    expect(redis.comandos).toHaveLength(3);
    expect(redis.ranking.get('post-dias-perfeitos')).toBe(1);
  });

  it('conta outra pessoa e outro post', async () => {
    const redis = redisFalso();
    await registrarVisualizacao(visita(), contexto({ redis }));
    await registrarVisualizacao(visita({ ip: '177.1.2.3' }), contexto({ redis }));
    await registrarVisualizacao(visita({ corpo: '{"id":"post-mirante"}' }), contexto({ redis }));
    expect(redis.ranking).toEqual(
      new Map([
        ['post-dias-perfeitos', 2],
        ['post-mirante', 1],
      ]),
    );
  });

  it.each([
    ['preview', 'fora-de-producao', visita(), { ambiente: 'preview' }],
    ['fora da Vercel', 'fora-de-producao', visita(), { ambiente: undefined }],
    ['sem user agent', 'sem-user-agent', visita({ userAgent: null }), {}],
    ['user agent vazio', 'sem-user-agent', visita({ userAgent: '' }), {}],
    ['bot', 'bot', visita({ userAgent: GOOGLEBOT }), {}],
    ['curl', 'bot', visita({ userAgent: 'curl/8.9.1' }), {}],
    ['id que não está publicado', 'id-invalido', visita({ corpo: '{"id":"drafts.x"}' }), {}],
    ['corpo inválido', 'id-invalido', visita({ corpo: 'oi' }), {}],
  ] as const)('não grava nada: %s', async (_caso, resultado, dados, mudancas) => {
    const redis = redisFalso();
    expect(await registrarVisualizacao(dados, contexto({ redis, ...mudancas }))).toBe(resultado);
    expect(redis.comandos).toEqual([]);
  });

  it('sem o Redis configurado, não falha', async () => {
    expect(await registrarVisualizacao(visita(), contexto({ redis: null }))).toBe('sem-redis');
  });
});

describe('redisDoUpstash', () => {
  it('manda o comando em JSON com o token e devolve o result', async () => {
    const buscar = vi.fn(async () => Response.json({ result: 'OK' }));
    const redis = redisDoUpstash('https://exemplo.upstash.io', 'token', buscar);

    expect(await redis.executar(['SET', 'a', 1, 'NX'])).toBe('OK');
    expect(buscar).toHaveBeenCalledWith('https://exemplo.upstash.io', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      body: '["SET","a",1,"NX"]',
    });
  });

  it('lança o erro do Upstash, que a rota registra no log', async () => {
    const buscar = vi.fn(async () => Response.json({ error: 'WRONGPASS' }, { status: 401 }));
    const redis = redisDoUpstash('https://exemplo.upstash.io', 'token', buscar);
    await expect(redis.executar(['GET', 'a'])).rejects.toThrow('Upstash 401: WRONGPASS');
  });
});
