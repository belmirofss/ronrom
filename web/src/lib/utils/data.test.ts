import { describe, expect, it } from 'vitest';
import { formatarData, isoNoFuso } from '@/lib/utils/data';

describe('formatarData', () => {
  it('escreve o mês por extenso e em minúsculas', () => {
    expect(formatarData('2026-03-14T12:00:00-03:00')).toBe('14 de março de 2026');
  });

  it('não vira o dia seguinte às 23h30 de Brasília', () => {
    expect(formatarData('2026-03-14T23:30:00-03:00')).toBe('14 de março de 2026');
  });

  it('dá o mesmo dia para o mesmo instante escrito em UTC', () => {
    expect(formatarData('2026-03-15T02:30:00Z')).toBe('14 de março de 2026');
    expect(formatarData('2026-03-15T02:30:00.000Z')).toBe('14 de março de 2026');
  });

  it('não vira o ano às 23h30 de 31 de dezembro', () => {
    expect(formatarData('2026-12-31T23:30:00-03:00')).toBe('31 de dezembro de 2026');
  });

  it('lança erro com data inválida', () => {
    expect(() => formatarData('')).toThrow('Data inválida');
    expect(() => formatarData('ontem')).toThrow('Data inválida');
  });
});

describe('isoNoFuso', () => {
  it('escreve o instante em UTC no fuso de Brasília, com o deslocamento', () => {
    expect(isoNoFuso('2026-03-15T02:30:00Z')).toBe('2026-03-14T23:30:00-03:00');
    expect(isoNoFuso('2026-03-15T02:30:00.000Z')).toBe('2026-03-14T23:30:00-03:00');
  });

  it('mantém uma data que já vem em -03:00', () => {
    expect(isoNoFuso('2026-12-31T23:30:00-03:00')).toBe('2026-12-31T23:30:00-03:00');
  });

  it('escreve meia-noite como 00, não 24', () => {
    expect(isoNoFuso('2026-03-14T03:00:00Z')).toBe('2026-03-14T00:00:00-03:00');
  });

  it('lança erro com data inválida', () => {
    expect(() => isoNoFuso('')).toThrow('Data inválida');
    expect(() => isoNoFuso('ontem')).toThrow('Data inválida');
  });
});
