// @ts-check
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';

// Índice da busca (#54) gerado pelo Pagefind no fim do build, sem servidor. O que entra no índice,
// os filtros e os metadados: docs/busca.md.

/** Pasta do índice dentro da saída estática; é também o caminho público (`/pagefind/`). */
const PASTA = 'pagefind';

// Tipos dos arquivos do índice, para o `astro dev` servir o de um build anterior.
const TIPOS = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

/**
 * Lança erro se o Pagefind devolveu algum: índice incompleto não chega a produção.
 * @param {string} etapa
 * @param {{ errors: string[] }} resposta
 */
function conferir(etapa, resposta) {
  if (resposta.errors.length > 0) {
    throw new Error(`Pagefind (${etapa}): ${resposta.errors.join('; ')}`);
  }
}

/** @returns {import('astro').AstroIntegration} */
export function pagefindIntegracao() {
  /** @type {URL} */
  let pastaDoCliente;

  return {
    name: 'ronrom:pagefind',
    hooks: {
      'astro:config:done': ({ config }) => {
        pastaDoCliente = config.build.client;
      },

      // Roda antes do adapter da Vercel copiar o `dir` para .vercel/output/static: o índice sai nas
      // duas pastas (a do deploy e a do artifact do CI) sem cópia própria.
      'astro:build:done': async ({ dir, logger }) => {
        const saida = fileURLToPath(dir);
        const { index, errors } = await pagefind.createIndex();
        conferir('createIndex', { errors });
        if (!index) throw new Error('Pagefind (createIndex): índice não criado.');

        try {
          // Só as páginas com data-pagefind-body (as de post) entram; as outras são ignoradas.
          const indexado = await index.addDirectory({ path: saida });
          conferir('addDirectory', indexado);
          const pastaDoIndice = join(saida, PASTA);
          conferir('writeFiles', await index.writeFiles({ outputPath: pastaDoIndice }));
          // O `page_count` do addDirectory conta todo HTML lido; o da entrada, só os indexados.
          /** @type {{ languages: Record<string, { page_count: number }> }} */
          const entrada = JSON.parse(
            readFileSync(join(pastaDoIndice, 'pagefind-entry.json'), 'utf-8'),
          );
          const idiomas = Object.entries(entrada.languages);
          const posts = idiomas.reduce((soma, [, { page_count }]) => soma + page_count, 0);
          logger.info(
            `Índice da busca: ${posts} posts (${idiomas.map(([i]) => i).join(', ')}) ` +
              `de ${indexado.page_count} páginas lidas, em /${PASTA}/.`,
          );
        } finally {
          await pagefind.close();
        }
      },

      // No `astro dev` o índice não existe: serve o do último build, se houver, ou avisa.
      'astro:server:setup': ({ server, logger }) => {
        const pasta = join(fileURLToPath(pastaDoCliente), PASTA);
        if (!existsSync(pasta)) {
          logger.warn(
            `A busca não funciona no dev até haver um build: o índice só existe depois do ` +
              `\`pnpm build\` (${pasta}).`,
          );
        } else {
          logger.info(`Busca no dev com o índice do último build (${pasta}).`);
        }

        server.middlewares.use(`/${PASTA}`, (req, res, next) => {
          const caminho = normalize(
            join(pasta, decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')),
          );
          if (!caminho.startsWith(pasta + sep) || !existsSync(caminho)) return next();
          if (!statSync(caminho).isFile()) return next();
          res.setHeader(
            'Content-Type',
            TIPOS[/** @type {keyof typeof TIPOS} */ (extname(caminho))] ??
              'application/octet-stream',
          );
          createReadStream(caminho).pipe(res);
        });
      },
    },
  };
}
