import type { StegaConfig } from '@sanity/client';

// Na prévia de rascunhos (#43), o cliente esconde em cada texto (com caracteres invisíveis, o
// "stega") de que documento e campo ele veio. O script da edição visual acha esses textos na
// página e os torna clicáveis: o clique abre o campo certo no Studio.
//
// Só os campos de texto corrido recebem a marca. O filtro padrão do @sanity/client marcaria também
// valores que o site compara ou usa como dado (`tipo`, `modelo` da ficha, `provedor` do vídeo,
// `rede`, `largura`, a `uf` do endereço...), e a comparação com o texto marcado falharia. O `alt`
// fica de fora para o leitor de tela não ler a marca.
export const CAMPOS_COM_STEGA = new Set([
  // Posts, taxonomia e Sobre.
  'titulo',
  'subtitulo',
  'nome',
  'bio',
  'descricao',
  // Spans do Portable Text (corpo do post e texto do Sobre).
  'text',
  // Blocos do corpo e frase da semana.
  'legenda',
  'texto',
  'fonte',
  'autoria',
  // Ficha da review: só os campos de texto livre.
  'valeAPena',
  'direcao',
  'criacao',
  'editora',
  'tipoDeCozinha',
  'oQuePedi',
  'oQueProvei',
  'marca',
]);

type FiltroDoStega = NonNullable<StegaConfig['filter']>;

/** Marca só os campos de `CAMPOS_COM_STEGA`, e só onde o filtro padrão também marcaria. */
export const filtroDoStega: FiltroDoStega = (props) => {
  const campo = props.sourcePath.at(-1);
  return typeof campo === 'string' && CAMPOS_COM_STEGA.has(campo) && props.filterDefault(props);
};
