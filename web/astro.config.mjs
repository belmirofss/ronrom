// @ts-check
import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';

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

// https://astro.build/config
export default defineConfig({
  site: urlDoSite,
  // Decidido na #1: URLs sem barra no final.
  trailingSlash: 'never',
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
        default: '2025-02-19',
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
    },
  },
});
