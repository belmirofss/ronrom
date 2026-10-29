/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// O getViteConfig carrega o astro.config.mjs: os testes enxergam o alias `@/`, os módulos
// virtuais (astro:env, astro:assets) e podem renderizar componentes com a Container API.
// O que testar e como: docs/testes.md.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // O build da Vercel roda em UTC. Fixar o fuso aqui faz uma data formatada sem
    // `timeZone: 'America/Sao_Paulo'` quebrar o teste em qualquer máquina, não só no CI.
    env: { TZ: 'UTC' },
  },
});
