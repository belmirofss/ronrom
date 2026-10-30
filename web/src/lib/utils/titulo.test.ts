import { describe, expect, it } from 'vitest';
import { tituloDaPagina } from '@/lib/utils/titulo';

describe('tituloDaPagina', () => {
  it('junta o título da página e o nome do site', () => {
    expect(tituloDaPagina('Sobre')).toBe('Sobre · Ronrom');
  });

  it('usa o nome do site e a tagline sem título, como na home', () => {
    expect(tituloDaPagina()).toBe('Ronrom · Reviews e pensamentos');
    expect(tituloDaPagina('')).toBe('Ronrom · Reviews e pensamentos');
  });
});
