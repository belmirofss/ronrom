import type { APIRoute } from 'astro';
import { canonicalUrl } from '@/lib/rotas';
import { robotsTxt, SITE_INDEXAVEL } from '@/lib/seo';

// Prerenderizado: o conteúdo depende só do VERCEL_ENV do build (#52, docs/seo-urls.md#indexação).
export const GET: APIRoute = () =>
  new Response(robotsTxt(SITE_INDEXAVEL, canonicalUrl('/sitemap-index.xml')), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
