// Junta Artigos, Textos e Opiniões em "Textos e opiniões" (#143) num dataset: grava o nome, a
// descrição e a ordem novos dos formatos (lib/taxonomia.ts), passa os posts de Artigos e Opiniões
// para o formato `textos`, guardando o caminho antigo em `slugsAnteriores` para o build gerar o
// redirect 301, e apaga os dois formatos. Tudo numa transação só. Sem --gravar, só mostra o que
// faria. Rodar de novo não muda nada. Como rodar: studio/README.md#unificação-dos-formatos.
import { getCliClient } from 'sanity/cli';

import { documentosDaTaxonomia, FORMATOS_UNIFICADOS } from '../lib/taxonomia';
import { type PostParaUnificar, planoDaUnificacao } from '../lib/unificar-formatos';

const DATASETS = ['development', 'production'];

// Mesma versão padrão do site (SANITY_API_VERSION no web/astro.config.mjs).
const API_VERSION = '2025-02-19';

async function unificarFormatos() {
  // O dataset é sempre explícito, para ninguém gravar em production sem querer.
  const dataset = process.argv[process.argv.indexOf('--dataset') + 1];
  if (!process.argv.includes('--dataset') || !dataset || !DATASETS.includes(dataset)) {
    throw new Error(`Informe o dataset: --dataset ${DATASETS.join(' ou --dataset ')}.`);
  }
  const gravar = process.argv.includes('--gravar');

  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({ dataset });
  const destino = `${client.config().projectId}/${dataset}`;
  const removidos = FORMATOS_UNIFICADOS.removidos.map(({ _id }) => _id);

  // `raw` enxerga os rascunhos e as versões de lançamento, que também apontam para o formato.
  const { posts, formatos, outros } = await client.fetch<{
    posts: PostParaUnificar[];
    formatos: { _id: string; slug: string }[];
    outros: string[];
  }>(
    `{
      "posts": *[_type == "post"]{
        _id, tipo, "slug": slug.current, "formato": formato._ref, slugsAnteriores
      },
      "formatos": *[_type == "formato" && !(_id in path("drafts.**"))]{ _id, "slug": slug.current },
      "outros": *[_type != "post" && references($removidos)]._id
    }`,
    { removidos },
    { perspective: 'raw' },
  );
  if (outros.length > 0) {
    throw new Error(
      `Além dos posts, ${outros.join(', ')} apontam para os formatos removidos. Tire a referência antes.`,
    );
  }

  const plano = planoDaUnificacao(posts, new Map(formatos.map(({ _id, slug }) => [_id, slug])));
  const taxonomia = documentosDaTaxonomia().filter(({ _type }) => _type === 'formato');
  const apagar = formatos.map(({ _id }) => _id).filter((id) => removidos.includes(id));

  console.log(`${destino}: ${plano.length} post(s) a mudar.`);
  for (const { _id, set } of plano) console.log(`- ${_id}: ${JSON.stringify(set)}`);
  console.log(`Formatos a gravar: ${taxonomia.map(({ _id }) => _id).join(', ')}.`);
  console.log(`Formatos a apagar: ${apagar.join(', ') || 'nenhum'}.`);
  if (!gravar) {
    console.log('Nada foi gravado. Para gravar, rode de novo com --gravar.');
    return;
  }

  const transacao = client.transaction();
  for (const documento of taxonomia) transacao.createOrReplace(documento);
  for (const { _id, set } of plano) transacao.patch(_id, (patch) => patch.set(set));
  for (const id of apagar) {
    transacao.delete(id);
    transacao.delete(`drafts.${id}`);
  }
  await transacao.commit({ visibility: 'sync' });
  console.log(`Gravado em ${destino}.`);
}

unificarFormatos().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
