import { URL_DA_PREVIA_PADRAO } from './lib/previa';

// O Sanity só expõe ao Studio as variáveis com prefixo SANITY_STUDIO_, lidas de studio/.env*.
// Cada uma precisa aparecer escrita por extenso (process.env.NOME): o build substitui o texto
// literal, então um acesso dinâmico como process.env[nome] chegaria vazio no navegador.

function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(`Defina ${nome} em studio/.env (veja studio/.env.example).`);
  }
  return valor;
}

export const projectId = obrigatoria(
  'SANITY_STUDIO_PROJECT_ID',
  process.env.SANITY_STUDIO_PROJECT_ID,
);

export const dataset = obrigatoria('SANITY_STUDIO_DATASET', process.env.SANITY_STUDIO_DATASET);

// Versão da API nas consultas do Studio: a mesma do site (SANITY_API_VERSION no
// web/astro.config.mjs).
export const API_VERSION = '2025-02-19';

// Endereço da prévia de rascunhos que o Presentation abre (#43). Padrão: o projeto ronrom-previa da
// Vercel. Para usar o site local (`pnpm dev` com a prévia ligada), ponha
// SANITY_STUDIO_PREVIEW_URL=http://localhost:4321 no studio/.env.
export const URL_DA_PREVIA = process.env.SANITY_STUDIO_PREVIEW_URL || URL_DA_PREVIA_PADRAO;
