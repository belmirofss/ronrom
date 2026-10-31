import { describe, expect, it } from 'vitest';
import { abaDaTecla } from '@/lib/abas';

describe('abaDaTecla', () => {
  it('anda uma aba com as setas', () => {
    expect(abaDaTecla('ArrowRight', 0, 3)).toBe(1);
    expect(abaDaTecla('ArrowLeft', 2, 3)).toBe(1);
  });

  it('dá a volta nas pontas', () => {
    expect(abaDaTecla('ArrowRight', 2, 3)).toBe(0);
    expect(abaDaTecla('ArrowLeft', 0, 3)).toBe(2);
  });

  it('vai para a primeira com Home e para a última com End', () => {
    expect(abaDaTecla('Home', 2, 3)).toBe(0);
    expect(abaDaTecla('End', 0, 3)).toBe(2);
  });

  it('fica na mesma aba quando só existe uma', () => {
    expect(abaDaTecla('ArrowRight', 0, 1)).toBe(0);
    expect(abaDaTecla('ArrowLeft', 0, 1)).toBe(0);
  });

  it('ignora as outras teclas', () => {
    expect(abaDaTecla('ArrowDown', 0, 2)).toBeNull();
    expect(abaDaTecla('Enter', 0, 2)).toBeNull();
    expect(abaDaTecla('a', 0, 2)).toBeNull();
  });

  it('não move o foco sem aba', () => {
    expect(abaDaTecla('ArrowRight', 0, 0)).toBeNull();
  });
});
