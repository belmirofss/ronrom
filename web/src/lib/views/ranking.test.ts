import { describe, expect, it } from 'vitest';

import {
  buscarMaisLidos,
  CACHE_DO_RANKING,
  FOLGA,
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  lerLimite,
  lerRanking,
} from './ranking';
import { CHAVE_DO_RANKING, type Comando } from './registrar';

// Redis em memória, só com o ZREVRANGE … WITHSCORES que a rota usa.
function redisFalso(ranking: Record<string, number>) {
  const comandos: Comando[] = [];
  return {
    comandos,
    async executar(comando: Comando) {
      comandos.push(comando);
      const [nome, , inicio, fim] = comando;
      if (nome !== 'ZREVRANGE') throw new Error(`Comando inesperado: ${nome}`);
      return Object.entries(ranking)
        .sort(([, a], [, b]) => b - a)
        .slice(Number(inicio), Number(fim) + 1)
        .flatMap(([id, views]) => [id, String(views)]);
    },
  };
}

const parametros = (query: string) => new URLSearchParams(query);

describe('lerLimite', () => {
  it('usa 10 sem parâmetro', () => {
    expect(lerLimite(parametros(''))).toBe(LIMITE_PADRAO);
    expect(LIMITE_PADRAO).toBe(10);
  });

  it.each([
    ['limite=1', 1],
    ['limite=10', 10],
    [`limite=${LIMITE_MAXIMO}`, LIMITE_MAXIMO],
  ])('aceita %s', (query, limite) => {
    expect(lerLimite(parametros(query))).toBe(limite);
  });

  it.each([
    'limite=0',
    `limite=${LIMITE_MAXIMO + 1}`,
    'limite=-1',
    'limite=2.5',
    'limite=1e1',
    'limite=',
    'limite=dez',
    'limite=10&limite=5',
    'limite=10&x=123',
    'cache=quebrado',
  ])('recusa %s', (query) => {
    expect(lerLimite(parametros(query))).toBeNull();
  });
});

describe('lerRanking', () => {
  it('lê a lista plana do WITHSCORES como [{ id, views }]', () => {
    expect(lerRanking(['post-a', '12', 'post-b', '3'])).toEqual([
      { id: 'post-a', views: 12 },
      { id: 'post-b', views: 3 },
    ]);
  });

  it('lê a lista vazia de um ranking sem nada', () => {
    expect(lerRanking([])).toEqual([]);
  });

  it.each([
    ['null', null],
    ['ímpar', ['post-a']],
    ['score que não é número', ['post-a', 'muitos']],
    ['id que não é texto', [42, '1']],
  ])('lança erro com formato inesperado: %s', (_caso, resultado) => {
    expect(() => lerRanking(resultado)).toThrow();
  });
});

describe('buscarMaisLidos', () => {
  const idsPublicados = new Set(['post-a', 'post-b', 'post-c']);

  it('lê o topo de todo o tempo com um comando só, do mais para o menos lido', async () => {
    const redis = redisFalso({ 'post-b': 3, 'post-a': 12, 'post-c': 1 });
    expect(await buscarMaisLidos(10, { redis, idsPublicados })).toEqual([
      { id: 'post-a', views: 12 },
      { id: 'post-b', views: 3 },
      { id: 'post-c', views: 1 },
    ]);
    expect(redis.comandos).toEqual([
      ['ZREVRANGE', CHAVE_DO_RANKING, 0, 10 + FOLGA - 1, 'WITHSCORES'],
    ]);
  });

  it('descarta posts que não estão mais publicados e completa com os seguintes', async () => {
    const redis = redisFalso({ 'post-apagado': 50, 'post-a': 12, 'post-b': 3, 'post-c': 1 });
    expect(await buscarMaisLidos(2, { redis, idsPublicados })).toEqual([
      { id: 'post-a', views: 12 },
      { id: 'post-b', views: 3 },
    ]);
  });

  it('sem o Redis configurado, devolve a lista vazia', async () => {
    expect(await buscarMaisLidos(10, { redis: null, idsPublicados })).toEqual([]);
  });

  it('deixa o erro do Redis subir para a rota', async () => {
    const redis = {
      executar: async () => {
        throw new Error('Upstash 500');
      },
    };
    await expect(buscarMaisLidos(10, { redis, idsPublicados })).rejects.toThrow('Upstash 500');
  });
});

describe('CACHE_DO_RANKING', () => {
  // 1.000 aberturas da home por dia viram no máximo 24 leituras do Redis (critério da #57).
  it('guarda no CDN por uma hora e serve a cópia antiga por um dia enquanto revalida', () => {
    expect(CACHE_DO_RANKING).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
  });
});
