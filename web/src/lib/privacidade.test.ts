import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  controladora,
  DESCRICAO_DA_PRIVACIDADE,
  PRIVACIDADE_ATUALIZADA_EM,
  SERVICOS_DE_TERCEIROS,
  seoDaPrivacidade,
} from '@/lib/privacidade';
import { LIMITE_DA_DESCRICAO } from '@/lib/seo';
import type { CONSULTA_DO_SOBRE_RESULT } from '@/lib/sanity/tipos.gerados';

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
  const sobre = { nome: ' Ana Ronrom ', email: 'contato@example.com' } as CONSULTA_DO_SOBRE_RESULT;

  it('usa o nome e o e-mail do Sobre', () => {
    expect(controladora(sobre)).toEqual({ nome: 'Ana Ronrom', email: 'contato@example.com' });
  });

  it('sem o Sobre (ou sem e-mail), não quebra a página', () => {
    expect(controladora(null)).toEqual({ nome: 'a autora do Ronrom', email: null });
    expect(controladora({ ...sobre, email: '  ' } as CONSULTA_DO_SOBRE_RESULT).email).toBeNull();
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
