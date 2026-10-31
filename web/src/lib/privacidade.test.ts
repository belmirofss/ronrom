import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canaisDeContato,
  controladora,
  DESCRICAO_DA_PRIVACIDADE,
  PRIVACIDADE_ATUALIZADA_EM,
  SERVICOS_DE_TERCEIROS,
  seoDaPrivacidade,
} from '@/lib/privacidade';
import { LIMITE_DA_DESCRICAO } from '@/lib/seo';
import type {
  CONSULTA_DAS_CONFIGURACOES_RESULT,
  CONSULTA_DO_SOBRE_RESULT,
} from '@/lib/sanity/tipos.gerados';

// As origens de terceiros liberadas nas duas CSPs do vercel.json (#41), menos o próprio site.
function origensDaCsp(): Set<string> {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf-8'));
  const politicas: string[] = vercel.headers.flatMap(
    ({ headers }: { headers: { key: string; value: string }[] }) =>
      headers.filter(({ key }) => key.startsWith('Content-Security-Policy')).map((h) => h.value),
  );
  expect(politicas.length).toBeGreaterThan(0);
  return new Set(
    politicas
      .flatMap((politica) => politica.split(';'))
      // frame-ancestors diz quem pode emoldurar o site, não um serviço que o site carrega.
      .filter((diretiva) => !diretiva.trim().startsWith('frame-ancestors'))
      .flatMap((diretiva) => diretiva.match(/https:\/\/[^\s;]+/g) ?? []),
  );
}

describe('SERVICOS_DE_TERCEIROS', () => {
  it('lista toda origem de terceiro que a CSP libera', () => {
    const listadas = new Set(SERVICOS_DE_TERCEIROS.flatMap(({ origens }) => origens));
    const faltando = [...origensDaCsp()].filter((origem) => !listadas.has(origem));
    expect(faltando).toEqual([]);
  });

  it('não lista origem que a CSP bloquearia', () => {
    const csp = origensDaCsp();
    const sobrando = SERVICOS_DE_TERCEIROS.flatMap(({ origens }) => origens).filter(
      (origem) => !csp.has(origem),
    );
    expect(sobrando).toEqual([]);
  });

  it('dá a cada serviço uma política em https', () => {
    for (const { politica } of SERVICOS_DE_TERCEIROS) {
      expect(new URL(politica).protocol).toBe('https:');
    }
  });
});

describe('controladora', () => {
  it('usa o nome do Sobre', () => {
    expect(controladora({ nome: ' Ana Ronrom ' } as CONSULTA_DO_SOBRE_RESULT)).toBe('Ana Ronrom');
  });

  it('sem o Sobre (ou sem nome), não quebra a página', () => {
    expect(controladora(null)).toBe('a autora do Ronrom');
    expect(controladora({ nome: '  ' } as CONSULTA_DO_SOBRE_RESULT)).toBe('a autora do Ronrom');
  });
});

describe('canaisDeContato', () => {
  const comRedes = (redes: unknown) => ({ redes }) as CONSULTA_DAS_CONFIGURACOES_RESULT;

  it('usa as redes de Configurações do site, com o nome de cada uma', () => {
    const redes = [
      { rede: 'instagram', url: 'https://www.instagram.com/ronrom.blog' },
      { rede: 'outra', url: 'https://ronrom.social/@ana' },
    ];
    expect(canaisDeContato(comRedes(redes))).toEqual([
      { nome: 'Instagram', url: 'https://www.instagram.com/ronrom.blog' },
      { nome: 'outra rede', url: 'https://ronrom.social/@ana' },
    ]);
  });

  it('sem redes (ou sem link), fica vazio e a página manda para o Sobre', () => {
    expect(canaisDeContato(null)).toEqual([]);
    expect(canaisDeContato(comRedes(null))).toEqual([]);
    expect(canaisDeContato(comRedes([{ rede: 'tiktok', url: null }]))).toEqual([]);
  });
});

describe('seoDaPrivacidade', () => {
  it('tem description própria, dentro do limite, e é indexável', () => {
    const seo = seoDaPrivacidade();
    expect(seo.description).toBe(DESCRICAO_DA_PRIVACIDADE);
    expect(seo.description.length).toBeLessThanOrEqual(LIMITE_DA_DESCRICAO);
    expect(seo.canonical).toBe('/privacidade');
    expect(seo.noindex).toBeUndefined();
  });

  it('tem a data da última atualização válida', () => {
    expect(Number.isNaN(Date.parse(PRIVACIDADE_ATUALIZADA_EM))).toBe(false);
  });
});
