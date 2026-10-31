import type { APIRoute } from 'astro';
import { lerRelatorioDaCsp, TAMANHO_MAXIMO } from '@/lib/csp';

// Recebe os relatórios da CSP (#41) e os escreve no log da função (Vercel → Logs), um por linha.
// Não guarda nada: serve para ver o que a política, em modo enforce, bloqueou de verdade
// (docs/cabecalhos.md). Sob demanda, como o /api/health.
export const prerender = false;

const vazio = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request }) => {
  const tamanho = Number(request.headers.get('content-length') ?? 0);
  if (tamanho > TAMANHO_MAXIMO) return vazio();

  const corpo = await request.text();
  if (corpo.length > TAMANHO_MAXIMO) return vazio();

  for (const violacao of lerRelatorioDaCsp(corpo)) {
    console.warn(`[csp] ${JSON.stringify(violacao)}`);
  }
  return vazio();
};
