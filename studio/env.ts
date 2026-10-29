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
