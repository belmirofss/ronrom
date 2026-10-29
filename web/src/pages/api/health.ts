import type { APIRoute } from 'astro';
import { VERCEL_GIT_COMMIT_SHA } from 'astro:env/server';

// Rota de fumaça: confirma que as Vercel Functions estão no ar e qual commit está publicado.
// Roda sob demanda (o resto do site é estático); veja docs/ambientes.md.
export const prerender = false;

export const GET: APIRoute = () =>
  Response.json(
    { ok: true, commit: VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
