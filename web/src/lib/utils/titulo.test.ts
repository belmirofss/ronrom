import { describe, expect, it } from 'vitest';
import { tituloDaPagina } from '@/lib/utils/titulo';

describe('tituloDaPagina', () => {
  it('junta o título da página e o nome do site', () => {
    expect(tituloDaPagina('Sobre')).toBe('Sobre · Ronrom');
  });

  it('usa só o nome do site sem título', () => {
    expect(tituloDaPagina()).toBe('Ronrom');
    expect(tituloDaPagina('')).toBe('Ronrom');
  });
});
