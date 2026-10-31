import type { APIRoute } from 'astro';
import { itemDoIndice } from '@/lib/indice-de-posts';
import { buscarIndiceDePosts } from '@/lib/sanity/conteudo';

// Dados dos cards de todos os posts publicados, do mais recente para o mais antigo, gerados no
// build (#57). A aba "Mais lidos" da home os cruza com o ranking da /api/mais-lidos pelo `id`.
// Formato: ItemDoIndice, em src/lib/mais-lidos.ts.
export const GET: APIRoute = async () =>
  Response.json((await buscarIndiceDePosts()).map(itemDoIndice));
