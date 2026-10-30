// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // tipos.gerados.d.ts sai do `pnpm typegen` (web/src/lib/sanity/README.md): não se edita à mão.
  globalIgnores([
    '**/dist/',
    '**/.astro/',
    '**/.sanity/',
    '**/.vercel/',
    'web/src/lib/sanity/tipos.gerados.d.ts',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  // Regras de acessibilidade do jsx-a11y adaptadas para componentes .astro.
  astro.configs['jsx-a11y-recommended'],
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
