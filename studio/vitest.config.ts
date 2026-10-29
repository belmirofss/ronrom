import { defineConfig } from 'vitest/config';

// Só funções puras do Studio (slug, taxonomia, post, nota, ficha, corpo, estrutura). Schemas e
// telas não têm teste: o que o Sanity garante não é testado aqui (docs/testes.md).
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
  },
});
