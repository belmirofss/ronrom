import type { APIRoute } from 'astro';
import { SANITY_API_READ_TOKEN } from 'astro:env/server';

import { validarUrlDaPrevia } from '@/lib/sanity/conteudo';

import {
  COOKIE_DA_PREVIA,
  criarSessao,
  destinoDaPrevia,
  DURACAO_DA_SESSAO,
  OPCOES_DO_COOKIE,
} from './sessao';

// /api/previa/ativar (#43), só no build da prévia: o `previewMode.enable` do Presentation. O
// Studio grava um segredo temporário no dataset e abre esta rota com ele na URL; conferido o
// segredo, a rota grava o cookie da sessão e leva ao caminho que o Studio pediu.
export const prerender = false;

// Segredo errado, vencido ou que não deu para conferir (token recusado, Sanity fora do ar): fica
// fechado. O motivo vai para o log da função.
async function conferir(url: string) {
  try {
    return await validarUrlDaPrevia(url);
  } catch (erro) {
    console.error('Não deu para conferir o segredo da prévia:', erro);
    return { isValid: false, redirectTo: undefined };
  }
}

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const { isValid, redirectTo } = await conferir(request.url);
  if (!isValid || !SANITY_API_READ_TOKEN) {
    return new Response('Link da prévia inválido ou vencido. Abra a prévia pelo Studio.', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  cookies.set(COOKIE_DA_PREVIA, criarSessao(SANITY_API_READ_TOKEN), {
    ...OPCOES_DO_COOKIE,
    maxAge: DURACAO_DA_SESSAO / 1000,
  });
  return redirect(destinoDaPrevia(redirectTo), 307);
};
