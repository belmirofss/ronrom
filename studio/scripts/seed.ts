// Popula o dataset development com o conteúdo de exemplo de seed/conteudo.ts: a taxonomia inicial
// (lib/taxonomia.ts), 12 posts, Configurações do site e Sobre mim. Idempotente: os `_id` são
// fixos (`seed-post-01`…) e tudo é gravado com createOrReplace, e as imagens, que o Sanity
// identifica pelo conteúdo, não duplicam ao enviar de novo. Com --reset, apaga antes os
// documentos `seed-*` (publicados e rascunhos), inclusive os que o seed não cria mais.
// Recusa qualquer dataset que não seja o development. Como rodar: studio/README.md#seed.
import { readFile } from 'node:fs/promises';

import { getCliClient } from 'sanity/cli';

import { DATASET_DO_SEED, FILTRO_DO_RESET, problemaNoDatasetDoSeed } from '../lib/seed';
import { documentosDaTaxonomia } from '../lib/taxonomia';
import { type Assets, documentosDoSeed, IMAGENS } from '../seed/conteudo';

// Mesma versão padrão do site (SANITY_API_VERSION no web/astro.config.mjs).
const API_VERSION = '2025-02-19';

const PASTA_DAS_IMAGENS = new URL('../seed/imagens/', import.meta.url);

type Cliente = ReturnType<typeof getCliClient>;

async function enviarImagens(client: Cliente): Promise<Assets> {
  const enviadas = await Promise.all(
    IMAGENS.map(async (nome) => {
      const arquivo = await readFile(new URL(`${nome}.jpg`, PASTA_DAS_IMAGENS));
      const asset = await client.assets.upload('image', arquivo, { filename: `seed-${nome}.jpg` });
      return [nome, asset._id] as const;
    }),
  );
  return Object.fromEntries(enviadas) as Assets;
}

async function apagarDocumentosDoSeed(client: Cliente) {
  const ids = await client.fetch<string[]>(`*[${FILTRO_DO_RESET}]._id`, {}, { perspective: 'raw' });
  if (ids.length === 0) return 0;

  // O destaque da home é uma referência forte: sem tirar, o Sanity não deixa apagar o post.
  const destaques = await client.fetch<string[]>(
    '*[_type == "configuracoes" && postEmDestaque._ref in $ids]._id',
    { ids },
    { perspective: 'raw' },
  );

  const transacao = client.transaction();
  for (const id of destaques) transacao.patch(id, (patch) => patch.unset(['postEmDestaque']));
  for (const id of ids) transacao.delete(id);
  await transacao.commit({ visibility: 'sync' });
  return ids.length;
}

async function seed() {
  const inicio = Date.now();

  // SANITY_DATASET só existe para a trava: qualquer valor que não seja o development aborta.
  const dataset = process.env.SANITY_DATASET || DATASET_DO_SEED;
  const problema = problemaNoDatasetDoSeed(dataset);
  if (problema) throw new Error(problema);

  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({ dataset });
  const destino = `${client.config().projectId}/${client.config().dataset}`;

  if (process.argv.includes('--reset')) {
    const apagados = await apagarDocumentosDoSeed(client);
    console.log(`--reset: ${apagados} documentos seed-* apagados em ${destino}.`);
  }

  const assets = await enviarImagens(client);
  const documentos = [...documentosDaTaxonomia(), ...documentosDoSeed(assets)];

  const transacao = client.transaction();
  for (const documento of documentos) transacao.createOrReplace(documento);
  await transacao.commit({ visibility: 'sync' });

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(
    `${documentos.length} documentos e ${IMAGENS.length} imagens gravados em ${destino} (${segundos} s).`,
  );
}

seed().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
