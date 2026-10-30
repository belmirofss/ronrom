import { defineConfig } from 'vitest/config';

// Só funções puras do Studio (slug, taxonomia, post, nota, ficha, corpo, vídeo, galeria,
// estrutura) e o conteúdo do seed de desenvolvimento. Schemas e
// telas não têm teste: o que o Sanity garante não é testado aqui (docs/testes.md).
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
  },
});
