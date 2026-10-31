import { describe, expect, it } from 'vitest';

import { numeroDaPagina } from './previa';

describe('numeroDaPagina', () => {
  it('usa o número do getStaticPaths quando ele existe', () => {
    expect(numeroDaPagina(3, undefined)).toBe(3);
    expect(numeroDaPagina(3, '7')).toBe(3);
  });

  it('lê o número do endereço quando roda sob demanda (prévia)', () => {
    expect(numeroDaPagina(undefined, '2')).toBe(2);
    expect(numeroDaPagina(undefined, '12')).toBe(12);
  });

  it.each([undefined, '', '1', '0', '02', '-2', '2.5', 'abc', '2a'])(
    'recusa o endereço /pagina/%j',
    (n) => {
      expect(numeroDaPagina(undefined, n)).toBeNull();
    },
  );
});
