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
  // O site lê o conteúdo só pelas funções de web/src/lib/sanity/conteudo.ts (#33): nada fora da
  // pasta fala com o Sanity ou com as fixtures direto.
  {
    files: ['web/src/**/*.{ts,astro}'],
    ignores: ['web/src/lib/sanity/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@sanity/client', message: 'Use as funções de @/lib/sanity/conteudo.' },
            { name: 'groq-js', message: 'Use as funções de @/lib/sanity/conteudo.' },
          ],
          patterns: [
            {
              regex: 'sanity/(cliente|fixtures)(\\.ts)?(/|$)',
              message: 'Use as funções de @/lib/sanity/conteudo.',
            },
          ],
        },
      ],
    },
  },
  // Caminhos de post, categoria, formato, tag e paginação só saem de web/src/lib/rotas.ts
  // (docs/seo-urls.md#helpers-de-rota). Pega `/reviews/${...}` e '/pensamentos/' + slug, por exemplo.
  {
    files: ['web/src/**/*.{ts,astro}'],
    // O redirects.ts roda no astro.config, antes do astro:env que o rotas.ts lê, e monta os
    // mesmos caminhos das listagens.
    ignores: ['web/src/lib/rotas.ts', 'web/src/lib/redirects.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'TemplateLiteral > TemplateElement[value.raw=/^\\/(reviews|pensamentos)\\/|\\/pagina\\/$/]',
          message: 'Monte a URL com os helpers de @/lib/rotas.',
        },
        {
          selector:
            "BinaryExpression[operator='+'] > Literal[value=/^\\/(reviews|pensamentos)\\/|\\/pagina\\/$/]",
          message: 'Monte a URL com os helpers de @/lib/rotas.',
        },
      ],
    },
  },
  // Configurações CommonJS de ferramentas (o lighthouserc.cjs, que o Lighthouse CI carrega com
  // `require`).
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
