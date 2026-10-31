// Revisão das categorias da #142 num dataset: grava as categorias de lib/taxonomia.ts (cria
// Documentários, renomeia Lugares para "Outros lugares" e reordena) e apaga as de
// CATEGORIAS_REMOVIDAS (Comidas). Tudo numa transação só. Recusa gravar enquanto algum documento,
// publicado, rascunho ou versão, apontar para uma categoria removida: mude a categoria desses posts
// antes. Sem --gravar, só mostra o que faria. Rodar de novo não muda nada. Como rodar:
// studio/README.md#revisão-das-categorias.
import { getCliClient } from 'sanity/cli';

import { CATEGORIAS_REMOVIDAS, documentosDaTaxonomia } from '../lib/taxonomia';

const DATASETS = ['development', 'production'];

// Mesma versão padrão do site (SANITY_API_VERSION no web/astro.config.mjs).
const API_VERSION = '2025-02-19';

async function revisarCategorias() {
  // O dataset é sempre explícito, para ninguém gravar em production sem querer.
  const dataset = process.argv[process.argv.indexOf('--dataset') + 1];
  if (!process.argv.includes('--dataset') || !dataset || !DATASETS.includes(dataset)) {
    throw new Error(`Informe o dataset: --dataset ${DATASETS.join(' ou --dataset ')}.`);
  }
  const gravar = process.argv.includes('--gravar');

  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({ dataset });
  const destino = `${client.config().projectId}/${dataset}`;
  const removidas = CATEGORIAS_REMOVIDAS.map(({ _id }) => _id);

  // `raw` enxerga os rascunhos e as versões de lançamento, que também apontam para a categoria.
  const { existentes, referencias } = await client.fetch<{
    existentes: string[];
    referencias: { _id: string; titulo?: string }[];
  }>(
    `{
      "existentes": *[_id in $ids]._id,
      "referencias": *[references($removidas)]{ _id, titulo }
    }`,
    { removidas, ids: removidas.flatMap((id) => [id, `drafts.${id}`]) },
    { perspective: 'raw' },
  );
  if (referencias.length > 0) {
    const lista = referencias.map(({ _id, titulo }) => `- ${_id}${titulo ? ` (${titulo})` : ''}`);
    throw new Error(
      `${destino}: ainda apontam para ${removidas.join(', ')}:\n${lista.join('\n')}\nMude a categoria desses posts antes (no development, rode o pnpm seed).`,
    );
  }

  const categorias = documentosDaTaxonomia().filter(({ _type }) => _type === 'categoria');

  console.log(`${destino}:`);
  console.log(`Categorias a gravar: ${categorias.map(({ _id }) => _id).join(', ')}.`);
  console.log(`Categorias a apagar: ${existentes.join(', ') || 'nenhuma'}.`);
  if (!gravar) {
    console.log('Nada foi gravado. Para gravar, rode de novo com --gravar.');
    return;
  }

  const transacao = client.transaction();
  for (const documento of categorias) transacao.createOrReplace(documento);
  for (const id of existentes) transacao.delete(id);
  await transacao.commit({ visibility: 'sync' });
  console.log(`Gravado em ${destino}.`);
}

revisarCategorias().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
