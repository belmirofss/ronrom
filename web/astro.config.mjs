// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// O astro.config roda antes do astro:env, então a URL base é lida direto do .env / ambiente.
// O schema tipado das variáveis fica na #8 (INF-05).
const { SITE_URL } = loadEnv(process.env['NODE_ENV'] ?? 'production', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  site: SITE_URL || 'https://ronrom-chi.vercel.app',
  // Decidido na #1: URLs sem barra no final.
  trailingSlash: 'never',
});
