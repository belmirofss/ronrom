// Cria ou atualiza as categorias e os formatos iniciais (studio/lib/taxonomia.ts) num dataset.
// Idempotente: cada documento tem `_id` fixo e é gravado com createOrReplace, então rodar de
// novo não duplica nada. Mas sobrescreve nome, descrição e ordem que tenham sido editados no
// Studio nesses oito documentos. Como rodar: studio/README.md#taxonomia-inicial.
import { getCliClient } from 'sanity/cli';

import { CATEGORIAS, documentosDaTaxonomia, FORMATOS } from '../lib/taxonomia';

const DATASETS = ['development', 'production'];

// Mesma versão padrão do site (SANITY_API_VERSION no web/astro.config.mjs).
const API_VERSION = '2025-02-19';

async function criarTaxonomia() {
  // O dataset é sempre explícito, para ninguém gravar em production sem querer.
  const dataset = process.argv[process.argv.indexOf('--dataset') + 1];
  if (!process.argv.includes('--dataset') || !dataset || !DATASETS.includes(dataset)) {
    throw new Error(`Informe o dataset: --dataset ${DATASETS.join(' ou --dataset ')}.`);
  }

  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({ dataset });
  const transacao = client.transaction();

  for (const documento of documentosDaTaxonomia()) {
    transacao.createOrReplace(documento);
  }

  await transacao.commit();
  console.log(
    `${CATEGORIAS.length} categorias e ${FORMATOS.length} formatos gravados em ${client.config().projectId}/${dataset}.`,
  );
}

criarTaxonomia().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
