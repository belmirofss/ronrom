// Regras do seed de desenvolvimento (scripts/seed.ts) que não dependem do Sanity: a trava do
// dataset, o filtro do --reset, as `_key` dos arrays e atalhos para escrever o conteúdo de exemplo
// (seed/conteudo.ts) em Portable Text sem repetir a estrutura de cada bloco.

import { videoDoLink } from './video';

// O seed só grava aqui: production tem o conteúdo real da autora.
export const DATASET_DO_SEED = 'development';

// Todo documento criado pelo seed tem `_id` com este prefixo (`seed-post-01`, `seed-tag-cafe`),
// para o --reset apagar só o que o seed criou. Taxonomia e singletons têm `_id` fixo próprio.
export const PREFIXO_DO_SEED = 'seed-';

// Mensagem de erro, ou `undefined` quando o dataset é o de desenvolvimento.
export function problemaNoDatasetDoSeed(dataset: string | undefined) {
  if (dataset === DATASET_DO_SEED) return undefined;
  return `O seed só grava no dataset "${DATASET_DO_SEED}", e foi pedido "${dataset ?? ''}". Ele apaga e sobrescreve documentos: nunca rode em production.`;
}

// Documentos do seed, publicados ou rascunhos. Pensado para a perspectiva `raw`, que enxerga os
// `drafts.*`. Não usa `path("seed-*")`: no `path()` o `*` vale um segmento inteiro, não um prefixo.
export const FILTRO_DO_RESET = `string::startsWith(_id, "${PREFIXO_DO_SEED}") || string::startsWith(_id, "drafts.${PREFIXO_DO_SEED}")`;

export interface Documento {
  _id: string;
  _type: string;
  [campo: string]: unknown;
}

// Todo objeto dentro de um array precisa de `_key` no Sanity. Dá a cada um que ainda não tem uma
// chave pela posição (`k0`, `k1`…), única dentro do array e igual a cada execução, para rodar o
// seed de novo não mudar nada. Não altera o valor recebido.
export function numerarChaves<Valor>(valor: Valor): Valor {
  if (Array.isArray(valor)) {
    return valor.map((item: unknown, indice) => {
      const numerado = numerarChaves(item);
      return numerado && typeof numerado === 'object' && !('_key' in numerado)
        ? { _key: `k${indice}`, ...numerado }
        : numerado;
    }) as Valor;
  }
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([campo, item]) => [campo, numerarChaves(item)]),
    ) as Valor;
  }
  return valor;
}

export function referencia(id: string) {
  return { _type: 'reference', _ref: id };
}

// Imagem com o asset já enviado. `tipo` é `image` na capa, na foto e na galeria, e `imagem` no
// bloco solto do texto do post.
export function imagem(
  asset: string,
  campos: { alt: string; legenda?: string; largura?: 'normal' | 'larga' },
  tipo: 'image' | 'imagem' = 'image',
) {
  return { _type: tipo, asset: referencia(asset), ...campos };
}

// Um pedaço de texto do bloco: texto puro ou com negrito, itálico, link externo ou link para outro
// post (pelo `_id`).
export type Trecho =
  string | { texto: string; negrito?: true; italico?: true; link?: string; post?: string };

type Estilo = 'normal' | 'h2' | 'h3' | 'blockquote';

function bloco(trechos: Trecho[], estilo: Estilo, lista?: 'bullet' | 'number') {
  const markDefs: Record<string, unknown>[] = [];
  const children = trechos.map((trecho) => {
    if (typeof trecho === 'string') return { _type: 'span', text: trecho, marks: [] };

    const marks: string[] = [];
    if (trecho.negrito) marks.push('strong');
    if (trecho.italico) marks.push('em');
    if (trecho.link || trecho.post) {
      const _key = `l${markDefs.length}`;
      markDefs.push(
        trecho.link
          ? { _key, _type: 'link', href: trecho.link }
          : { _key, _type: 'linkInterno', post: referencia(trecho.post as string) },
      );
      marks.push(_key);
    }
    return { _type: 'span', text: trecho.texto, marks };
  });

  return {
    _type: 'block',
    style: estilo,
    markDefs,
    children,
    ...(lista && { listItem: lista, level: 1 }),
  };
}

export const paragrafo = (...trechos: Trecho[]) => bloco(trechos, 'normal');
export const subtitulo = (texto: string) => bloco([texto], 'h2');
export const subtituloMenor = (texto: string) => bloco([texto], 'h3');
export const citacao = (...trechos: Trecho[]) => bloco(trechos, 'blockquote');

// Uma lista é um bloco por item, cada um com `listItem`.
export function lista(tipo: 'bullet' | 'number', ...itens: (Trecho | Trecho[])[]) {
  return itens.map((item) => bloco(Array.isArray(item) ? item : [item], 'normal', tipo));
}

// Vídeo com `provedor` e `idVideo` já preenchidos, como o VideoInput grava no Studio.
export function video(url: string, legenda?: string) {
  const dados = videoDoLink(url);
  if (!dados) throw new Error(`Link de vídeo inválido no seed: ${url}`);
  return { _type: 'video', url, ...dados, ...(legenda && { legenda }) };
}

export function citacaoDestaque(texto: string, fonte?: string) {
  return { _type: 'citacaoDestaque', texto, ...(fonte && { fonte }) };
}

export function galeria(imagens: ReturnType<typeof imagem>[]) {
  return { _type: 'galeria', imagens };
}
