import type { APIRoute } from 'astro';

import { COOKIE_DA_PREVIA, OPCOES_DO_COOKIE } from './sessao';

// /api/previa/desativar (#43), só no build da prévia: o `previewMode.disable` do Presentation.
// Apaga o cookie da sessão; a próxima página da prévia volta a pedir a entrada pelo Studio.
export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(COOKIE_DA_PREVIA, OPCOES_DO_COOKIE);
  return redirect('/', 307);
};
