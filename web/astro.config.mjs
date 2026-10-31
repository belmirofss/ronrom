// @ts-check
import { readdirSync } from 'node:fs';

import vercel from '@astrojs/vercel';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';
import { redirects } from './redirects.mjs';
import { caminhosDasPaginas, conferirRedirects, montarRedirects } from './src/lib/redirects.ts';
import { definirFonte, VERSAO_PADRAO_DA_API } from './src/lib/sanity/fonte.ts';
import { buscarDadosDosRedirects } from './src/lib/sanity/redirects.ts';

// O astro.config roda antes do astro:env, então o que decide a configuração é lido direto do
// .env / ambiente. As variáveis, onde vivem e quem é dona: docs/ambientes.md.
const env = loadEnv(process.env['NODE_ENV'] ?? 'production', process.cwd(), '');

const URL_PADRAO = 'https://ronrom-blog.vercel.app';

// VERCEL_ENV só existe nos builds da Vercel: production, preview ou development.
const ehProducao = env['VERCEL_ENV'] === 'production';

// Nos previews, sem SITE_URL, a URL base é a do próprio deploy (VERCEL_URL vem sem protocolo).
const urlDoPreview =
  env['VERCEL_ENV'] === 'preview' && env['VERCEL_URL'] ? `https://${env['VERCEL_URL']}` : undefined;

const urlDoSite = env['SITE_URL'] || urlDoPreview || URL_PADRAO;

// O conteúdo de produção nunca sai das fixtures. Fora dela, a #33 (WEB-03) cai nas fixtures
// quando o Sanity não está configurado, para o CI e o dev rodarem sem acesso ao CMS.
if (ehProducao && env['SANITY_FIXTURES'] === 'true') {
  throw new Error('SANITY_FIXTURES=true não é permitido em produção (VERCEL_ENV=production).');
}

// A mesma fonte do conteúdo que o site usa (src/lib/sanity/config.ts), para os redirects (#53).
// Variável vazia conta como ausente, como no astro:env.
const fonteDoConteudo = definirFonte({
  SANITY_FIXTURES: env['SANITY_FIXTURES'] === 'true',
  SANITY_PROJECT_ID: env['SANITY_PROJECT_ID'] || undefined,
  SANITY_DATASET: env['SANITY_DATASET'] || undefined,
  SANITY_API_VERSION: env['SANITY_API_VERSION'] || VERSAO_PADRAO_DA_API,
});

/** @type {Record<string, import('./src/lib/redirects.ts').Redirect>} */
let redirectsDoBuild = {};
// Páginas sem parâmetro (/sobre), dos arquivos: o Astro nem gera a que um redirect esconde.
const paginasSemParametro = caminhosDasPaginas(
  readdirSync(new URL('./src/pages', import.meta.url), { recursive: true, encoding: 'utf8' }).map(
    (arquivo) => arquivo.replaceAll('\\', '/'),
  ),
);

// https://astro.build/config
export default defineConfig({
  site: urlDoSite,
  // Decidido na #1: URLs sem barra no final. Política completa: docs/seo-urls.md.
  trailingSlash: 'never',
  build: {
    // /sobre vira sobre/index.html e a Vercel serve em /sobre; a variante com barra recebe 308
    // pelo trailingSlash: false do vercel.json. É o formato que o @astrojs/vercel impõe (#9).
    format: 'directory',
  },
  // Redirects fixos (#41); o adapter da Vercel os transforma em rotas. Lista e regras: redirects.mjs.
  // No build, a integração ronrom:redirects junta a eles os dos slugs antigos dos posts (#53).
  redirects,
  vite: {
    build: {
      // O Astro põe inline, dentro do HTML, todo script menor que 4 kB. A CSP (#41) só libera
      // script-src 'self', sem 'unsafe-inline', então JS sempre vai para um arquivo em /_astro.
      // O resto (CSS, imagens) segue a regra padrão. Detalhes: docs/cabecalhos.md#csp.
      assetsInlineLimit: (arquivo) => (arquivo.endsWith('.js') ? false : undefined),
    },
  },
  // DM Sans servida pelo próprio site (#14): os woff2 vêm do @fontsource/dm-sans instalado (só o
  // subset latin), sem buscar nada na rede no build e sem requisição a terceiros no navegador.
  // O Astro gera o @font-face com font-display: swap e uma fonte de fallback com métricas
  // ajustadas (size-adjust, ascent-override etc.), para a troca de fonte não gerar CLS.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'DM Sans',
      cssVariable: '--fonte-dm-sans',
      // A partir da família genérica, o Astro escolhe uma fonte local (Arial) e ajusta as métricas.
      fallbacks: ['sans-serif'],
      display: 'swap',
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2'],
          },
          {
            weight: 500,
            style: 'normal',
            src: ['@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2'],
          },
          {
            weight: 700,
            style: 'normal',
            src: ['@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2'],
          },
        ],
      },
    },
  ],
  integrations: [
    // Redirects 301 dos endereços antigos dos posts (#53), só no `astro build`: busca no Sanity (ou
    // nas fixtures) os `slugsAnteriores`, junta com os fixos e, no fim, confere que todo destino
    // é uma página gerada. Cadeias são encurtadas; loop, destino inexistente ou redirect por cima
    // de uma página derrubam o build.
    // Regras: docs/cabecalhos.md#redirects.
    {
      name: 'ronrom:redirects',
      hooks: {
        'astro:config:setup': async ({ command, updateConfig, logger }) => {
          if (command !== 'build') return;
          const { redirects: todos, avisos } = montarRedirects({
            fixos: redirects,
            paginas: paginasSemParametro,
            ...(await buscarDadosDosRedirects(fonteDoConteudo)),
          });
          for (const aviso of avisos) logger.warn(aviso);
          logger.info(`${Object.keys(todos).length} redirect(s), fixos e de posts.`);
          redirectsDoBuild = todos;
          updateConfig({ redirects: todos });
        },
        'astro:build:done': ({ pages }) => {
          // `pathname` vem sem a barra inicial e, no build.format directory, com a barra final.
          const geradas = pages.map(({ pathname }) => `/${pathname.replace(/\/$/, '')}`);
          conferirRedirects(redirectsDoBuild, geradas);
        },
      },
    },
    // Vitrine dos componentes (#35) em /vitrine e do texto do post (#39) em /vitrine/corpo, só no
    // `astro dev`: as rotas não existem no build, então não chegam a produção, ao sitemap nem à
    // busca. Os arquivos ficam fora de src/pages.
    {
      name: 'ronrom:vitrine',
      hooks: {
        'astro:config:setup': ({ command, injectRoute }) => {
          if (command !== 'dev') return;
          injectRoute({
            pattern: '/vitrine',
            entrypoint: new URL('./src/vitrine/Componentes.astro', import.meta.url),
          });
          injectRoute({
            pattern: '/vitrine/corpo',
            entrypoint: new URL('./src/vitrine/Corpo.astro', import.meta.url),
          });
        },
      },
    },
  ],
  // Saída estática (o padrão do Astro): só as rotas com `export const prerender = false` viram
  // Vercel Function. Decisão no docs/adr/0001; como criar uma rota sob demanda: docs/ambientes.md.
  adapter: vercel({
    // As imagens vêm do CDN do Sanity, que já redimensiona. O otimizador da Vercel só gastaria
    // a cota de transformações do Hobby.
    imageService: false,
    // O analytics é o Umami (#58), sem cookies; o Web Analytics da Vercel fica desligado.
    webAnalytics: { enabled: false },
  }),
  env: {
    // Valida também os segredos (formato), não só as variáveis públicas.
    validateSecrets: true,
    // O Astro valida o schema quando um módulo importa astro:env/client ou astro:env/server.
    // O LayoutBase importa @/lib/utils/site, que lê o SITE_URL, então todo build valida.
    // Variável vazia conta como ausente. Toda variável nova entra também no web/.env.example.
    schema: {
      // Em produção é obrigatória; fora dela, o padrão é a URL já resolvida acima.
      SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        url: true,
        ...(ehProducao ? {} : { optional: true, default: urlDoSite }),
      }),
      // Link "Área da autora" do rodapé (#15): o Studio publicado pelo Sanity (#12).
      STUDIO_URL: envField.string({
        context: 'server',
        access: 'public',
        url: true,
        optional: true,
        default: 'https://ronrom.sanity.studio',
      }),

      // Obrigatórias em produção. Fora dela, sem as duas, o site usa as fixtures.
      SANITY_PROJECT_ID: envField.string({
        context: 'server',
        access: 'public',
        optional: !ehProducao,
      }),
      SANITY_DATASET: envField.enum({
        context: 'server',
        access: 'public',
        values: ['production', 'development'],
        optional: !ehProducao,
      }),
      SANITY_API_VERSION: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
        default: VERSAO_PADRAO_DA_API,
      }),
      // Força as fixtures mesmo com o Sanity configurado. Proibido em produção (acima).
      SANITY_FIXTURES: envField.boolean({
        context: 'server',
        access: 'public',
        optional: true,
        default: false,
      }),
      // Token viewer: só para o preview de rascunhos (#43). Sem ele, só o conteúdo publicado.
      SANITY_API_READ_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // Contador de visualizações (#56): Upstash Redis instalado pelo Marketplace da Vercel.
      // Nomes que o @upstash/redis lê no Redis.fromEnv(); conferir na Vercel ao provisionar.
      KV_REST_API_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        url: true,
      }),
      KV_REST_API_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // Variável de sistema da Vercel (sem cadastro): o commit do deploy, lido pelo /api/health.
      // Pública, então entra fixa no build, que é justamente o commit que está no ar.
      VERCEL_GIT_COMMIT_SHA: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
    },
  },
});
