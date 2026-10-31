import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerRelatorioDaCsp } from '@/lib/csp';

describe('lerRelatorioDaCsp', () => {
  it('lê o formato do report-uri (Firefox e Safari)', () => {
    const corpo = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://ronrom.blog/sobre',
        'blocked-uri': 'https://exemplo.com/x.js',
        'violated-directive': 'script-src-elem',
        'effective-directive': 'script-src-elem',
        disposition: 'report',
        'source-file': 'https://ronrom.blog/_astro/a.js',
        'line-number': 3,
      },
    });
    expect(lerRelatorioDaCsp(corpo)).toEqual([
      {
        pagina: 'https://ronrom.blog/sobre',
        bloqueado: 'https://exemplo.com/x.js',
        diretiva: 'script-src-elem',
        modo: 'report',
        arquivo: 'https://ronrom.blog/_astro/a.js',
        linha: 3,
      },
    ]);
  });

  it('lê o formato da Reporting API (Chrome) e ignora outros tipos de relatório', () => {
    const corpo = JSON.stringify([
      {
        type: 'csp-violation',
        body: {
          documentURL: 'https://ronrom.blog/',
          blockedURL: 'inline',
          effectiveDirective: 'script-src-elem',
          disposition: 'report',
        },
      },
      { type: 'deprecation', body: { id: 'x' } },
    ]);
    expect(lerRelatorioDaCsp(corpo)).toEqual([
      {
        pagina: 'https://ronrom.blog/',
        bloqueado: 'inline',
        diretiva: 'script-src-elem',
        modo: 'report',
      },
    ]);
  });

  it.each(['', 'não é json', '{}', '[1, null]', '{"csp-report": "x"}'])(
    'devolve lista vazia para %j',
    (corpo) => {
      expect(lerRelatorioDaCsp(corpo)).toEqual([]);
    },
  );

  it('corta textos longos e limita as violações por pedido', () => {
    const corpo = JSON.stringify(
      Array.from({ length: 50 }, () => ({
        type: 'csp-violation',
        body: { documentURL: 'a'.repeat(2000), blockedURL: 'b', effectiveDirective: 'c' },
      })),
    );
    const violacoes = lerRelatorioDaCsp(corpo);
    expect(violacoes).toHaveLength(20);
    expect(violacoes[0]?.pagina).toHaveLength(500);
  });
});

// A política está duas vezes no vercel.json (previews e produção), que não aceita variável nem
// comentário. O teste garante que as duas cópias só diferem no frame-ancestors.
describe('CSP do vercel.json', () => {
  interface Regra {
    source: string;
    has?: { type: string; value: string }[];
    headers: { key: string; value: string }[];
  }
  const { headers: regras } = JSON.parse(
    readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
  ) as { headers: Regra[] };

  const csps = regras.flatMap((regra) =>
    regra.headers
      .filter((h) => h.key.startsWith('Content-Security-Policy'))
      .map((h) => ({ regra, chave: h.key, diretivas: h.value.split('; ') })),
  );
  const [previews, producao] = csps;
  const semFrameAncestors = (diretivas: string[]) =>
    diretivas.filter((d) => !d.startsWith('frame-ancestors '));

  it('tem uma política para os previews e outra, por host, para a produção', () => {
    expect(csps).toHaveLength(2);
    expect(previews?.regra.has).toBeUndefined();
    expect(producao?.regra.has?.[0]?.type).toBe('host');
    expect(producao?.chave).toBe(previews?.chave);
  });

  it('as duas só diferem no frame-ancestors', () => {
    expect(semFrameAncestors(producao?.diretivas ?? [])).toEqual(
      semFrameAncestors(previews?.diretivas ?? []),
    );
    expect(producao?.diretivas).toContain("frame-ancestors 'none'");
    expect(previews?.diretivas).toContain(
      "frame-ancestors 'self' https://ronrom.sanity.studio http://localhost:3333",
    );
  });

  it('a regra de produção casa com os domínios de produção e não com os previews', () => {
    const host = new RegExp(producao?.regra.has?.[0]?.value ?? '$^');
    expect(host.test('ronrom-blog.vercel.app')).toBe(true);
    expect(host.test('ronrom.blog')).toBe(true);
    expect(host.test('www.ronrom.blog')).toBe(true);
    expect(host.test('ronrom-blog-git-feat-x-belmirofss.vercel.app')).toBe(false);
    expect(host.test('ronrom-blog.vercel.app.exemplo.com')).toBe(false);
    expect(host.test('ronrom.blog.exemplo.com')).toBe(false);
  });
});
