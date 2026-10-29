// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['**/dist/', '**/.astro/', '**/.sanity/', '**/.vercel/']),
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
