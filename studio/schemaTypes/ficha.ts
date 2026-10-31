import { defineField, type ValidationContext } from 'sanity';

import { FichaInput } from '../componentes/FichaInput';
import { API_VERSION } from '../env';
import { modeloDaFicha, problemaNoInstagram, problemasNaFicha } from '../lib/ficha';

const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

// Um ano a mais que o atual, para lançamentos anunciados.
const ANO_MAXIMO = new Date().getFullYear() + 1;

// `depoisDe` é o nome de outro ano da ficha que este não pode anteceder (o fim e a estreia).
const campoAno = (name: string, title: string, description: string, depoisDe?: string) =>
  defineField({
    name,
    title,
    type: 'number',
    description,
    validation: (rule) => [
      rule.integer().min(1).max(ANO_MAXIMO).error('Use o ano com quatro dígitos, como 2024.'),
      rule.custom((ano: number | undefined, contexto) => {
        const anterior = depoisDe && (contexto.parent as Record<string, unknown>)?.[depoisDe];
        return ano && typeof anterior === 'number' && ano < anterior
          ? 'O ano do fim não pode ser antes do ano de estreia.'
          : true;
      }),
    ],
  });

const campoInteiro = (name: string, title: string, mensagem: string, description?: string) =>
  defineField({
    name,
    title,
    type: 'number',
    ...(description && { description }),
    validation: (rule) => rule.integer().min(1).error(mensagem),
  });

// Filme e série: onde a autora assistiu.
const campoOndeVi = defineField({
  name: 'ondeVi',
  title: 'Onde vi',
  type: 'object',
  fields: [
    defineField({
      name: 'meio',
      title: 'Cinema ou streaming',
      type: 'string',
      options: {
        list: [
          { value: 'cinema', title: 'Cinema' },
          { value: 'streaming', title: 'Streaming' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'qual',
      title: 'Qual',
      type: 'string',
      description: 'O nome do cinema ou do streaming. Por exemplo: "Netflix".',
    }),
  ],
});

// Lê o modelo direto da categoria: a validação não enxerga campos do documento referenciado.
async function modeloDoPost(contexto: ValidationContext) {
  const documento = contexto.document as
    { tipo?: unknown; categoria?: { _ref?: string } } | undefined;
  const id = documento?.categoria?._ref;
  if (documento?.tipo !== 'review' || !id) return undefined;

  const modelo = await contexto
    .getClient({ apiVersion: API_VERSION })
    .fetch<string | null>('*[_id == $id][0].modeloFicha', { id });
  return modeloDaFicha(modelo);
}

// Dados técnicos da review. Guarda os campos de todos os modelos num objeto só, sem prefixo; o
// FichaInput mostra só os do modelo da categoria escolhida (lib/ficha.ts), e a consulta do site
// usa o FICHA_NO_GROQ para devolver só esses.
export const campoFicha = defineField({
  name: 'ficha',
  title: 'Ficha',
  type: 'object',
  description: 'Os dados técnicos que aparecem no quadro da review. Mudam conforme a categoria.',
  components: { input: FichaInput },
  hidden: ({ document }) => document?.tipo !== 'review',
  validation: (rule) =>
    rule.custom(async (ficha, contexto) => {
      const modelo = await modeloDoPost(contexto);
      if (!modelo) return true;
      const problemas = problemasNaFicha(ficha, modelo);
      return problemas.length > 0 ? problemas : true;
    }),
  fields: [
    // Filme
    defineField({ name: 'direcao', title: 'Direção', type: 'string' }),
    campoAno('ano', 'Ano', 'O ano de lançamento.'),
    campoInteiro('duracao', 'Duração', 'Use a duração em minutos, como 112.', 'Em minutos.'),
    campoOndeVi,

    // Série
    defineField({
      name: 'criacao',
      title: 'Criação',
      type: 'string',
      description: 'Quem criou a série.',
    }),
    campoAno('anoDeEstreia', 'Ano de estreia', 'O ano da primeira temporada.'),
    campoAno(
      'anoDeFim',
      'Ano do fim',
      'O ano da última temporada. Deixe vazio se a série ainda está no ar.',
      'anoDeEstreia',
    ),
    defineField({
      name: 'temporadasVistas',
      title: 'Temporadas vistas',
      type: 'string',
      description: 'Por exemplo: "1 a 3" ou "todas".',
    }),

    // Livro
    defineField({ name: 'autoria', title: 'Autor(a)', type: 'string' }),
    defineField({ name: 'editora', title: 'Editora', type: 'string' }),
    campoInteiro('paginas', 'Páginas', 'Use o número de páginas, como 320.'),
    defineField({
      name: 'formatoDoLivro',
      title: 'Formato',
      type: 'string',
      description: 'Como você leu.',
      options: {
        list: [
          { value: 'fisico', title: 'Físico' },
          { value: 'ebook', title: 'E-book' },
          { value: 'audiobook', title: 'Audiobook' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),

    // Lugar (restaurantes, cafés e lugares)
    defineField({
      name: 'endereco',
      title: 'Endereço',
      type: 'object',
      description: 'Vai para o Google como o endereço do lugar.',
      options: { columns: 2 },
      fields: [
        defineField({ name: 'rua', title: 'Rua e número', type: 'string' }),
        defineField({ name: 'bairro', title: 'Bairro', type: 'string' }),
        defineField({ name: 'cidade', title: 'Cidade', type: 'string' }),
        defineField({ name: 'uf', title: 'Estado', type: 'string', options: { list: UFS } }),
      ],
    }),
    defineField({
      name: 'linkDoMapa',
      title: 'Link do mapa',
      type: 'url',
      description: 'O link do lugar no Google Maps, para o leitor abrir o caminho.',
      validation: (rule) =>
        rule.uri({ scheme: ['https'] }).error('Cole o link completo, começando com https://.'),
    }),
    // Opcional: só o lugar com localização vira um ponto no /mapa (#136). Sem ela, ele aparece só
    // na lista da página, pela cidade.
    defineField({
      name: 'localizacao',
      title: 'Localização no mapa',
      type: 'geopoint',
      description:
        'Opcional. Para o lugar aparecer no mapa de lugares visitados. No Google Maps, clique com o botão direito no lugar e copie os números: o primeiro é a latitude, o segundo a longitude.',
    }),
    defineField({
      name: 'faixaDePreco',
      title: 'Faixa de preço',
      type: 'string',
      options: {
        list: ['R$', 'R$$', 'R$$$', 'R$$$$'].map((faixa) => ({ value: faixa, title: faixa })),
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'tipoDeCozinha',
      title: 'Tipo de cozinha',
      type: 'string',
      description: 'Por exemplo: "japonesa" ou "padaria". Deixe vazio em lugar que não é de comer.',
    }),
    defineField({ name: 'oQuePedi', title: 'O que pedi', type: 'string' }),
    defineField({
      name: 'instagram',
      title: 'Instagram do lugar',
      type: 'string',
      description: 'Só o perfil, como @nomedolugar.',
      validation: (rule) =>
        rule.custom((perfil: string | undefined) =>
          perfil ? (problemaNoInstagram(perfil) ?? true) : true,
        ),
    }),

    // Todos
    defineField({
      name: 'valeAPena',
      title: 'Vale a pena?',
      type: 'string',
      description: 'Opcional. Uma frase curta, como "Vale, mas vá com fome".',
      validation: (rule) =>
        rule.max(120).warning('Acima de 120 caracteres, a frase fica longa demais para o quadro.'),
    }),
  ],
});
