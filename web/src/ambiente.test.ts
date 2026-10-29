import { describe, expect, it } from 'vitest';

// Guarda do vitest.config.ts: se o fuso dos testes deixar de ser UTC, os testes de data da
// #34 passariam numa máquina em Brasília mesmo com a formatação errada.
describe('ambiente de teste', () => {
  it('roda em UTC, como o build da Vercel', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
    expect(new Date('2026-03-14T23:30:00-03:00').getDate()).toBe(15);
  });
});
