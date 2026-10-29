// Regras da ficha da review: quais campos cada modelo de ficha usa, quais são obrigatórios, quais
// sobraram de outro modelo depois de trocar a categoria e a projeção GROQ que devolve só os campos
// do modelo certo. Usadas pelo schema do post, pelo input da ficha e pelas consultas do site.

import { MODELOS_DE_FICHA, type ModeloDeFicha } from './taxonomia';

// Campos de cada modelo, na ordem do formulário. Os que têm o mesmo sentido em mais de um modelo
// (ano, onde vi) têm o mesmo nome: ao trocar de Filmes para Séries, "onde vi" continua valendo.
export const CAMPOS_DA_FICHA = {
  filme: ['direcao', 'ano', 'duracao', 'ondeVi'],
  serie: ['criacao', 'anoDeEstreia', 'anoDeFim', 'temporadasVistas', 'ondeVi'],
  livro: ['autoria', 'editora', 'ano', 'paginas', 'formatoDoLivro'],
  lugar: ['endereco', 'linkDoMapa', 'faixaDePreco', 'tipoDeCozinha', 'oQuePedi', 'instagram'],
  comida: ['marca', 'preco', 'oQueProvei'],
} as const satisfies Record<ModeloDeFicha, readonly string[]>;

// Valem para qualquer modelo e ficam no fim da ficha.
export const CAMPOS_COMUNS = ['valeAPena'] as const;

export function modeloDaFicha(valor: unknown): ModeloDeFicha | undefined {
  return MODELOS_DE_FICHA.find((modelo) => modelo.value === valor)?.value;
}

export function camposDoModelo(modelo: ModeloDeFicha): readonly string[] {
  return [...CAMPOS_DA_FICHA[modelo], ...CAMPOS_COMUNS];
}

// Vazio é ausente, texto em branco ou objeto sem nenhum subcampo preenchido (um endereço com
// só o `_type`, por exemplo).
function preenchido(valor: unknown): boolean {
  if (valor === undefined || valor === null) return false;
  if (typeof valor === 'string') return valor.trim() !== '';
  if (typeof valor === 'object') {
    return Object.entries(valor).some(
      ([chave, item]) => !chave.startsWith('_') && preenchido(item),
    );
  }
  return true;
}

function ler(ficha: unknown, caminho: readonly string[]): unknown {
  return caminho.reduce<unknown>(
    (atual, chave) =>
      atual && typeof atual === 'object' ? (atual as Record<string, unknown>)[chave] : undefined,
    ficha,
  );
}

// Campos preenchidos que não são do modelo atual: sobraram de outra categoria. Não são apagados
// sozinhos; o input avisa e a consulta do site ignora.
export function camposIgnorados(ficha: unknown, modelo: ModeloDeFicha): string[] {
  if (!ficha || typeof ficha !== 'object') return [];
  const doModelo = camposDoModelo(modelo);
  return Object.entries(ficha)
    .filter(
      ([campo, valor]) => !campo.startsWith('_') && !doModelo.includes(campo) && preenchido(valor),
    )
    .map(([campo]) => campo);
}

interface CampoChave {
  caminho: readonly string[];
  mensagem: string;
}

// O mínimo para a ficha fazer sentido e alimentar o `itemReviewed` do JSON-LD (#51).
const CAMPOS_CHAVE: Record<ModeloDeFicha, readonly CampoChave[]> = {
  filme: [{ caminho: ['direcao'], mensagem: 'Preencha quem dirigiu o filme.' }],
  serie: [{ caminho: ['criacao'], mensagem: 'Preencha quem criou a série.' }],
  livro: [{ caminho: ['autoria'], mensagem: 'Preencha quem escreveu o livro.' }],
  lugar: [
    { caminho: ['endereco', 'rua'], mensagem: 'Preencha a rua e o número do lugar.' },
    { caminho: ['endereco', 'cidade'], mensagem: 'Preencha a cidade do lugar.' },
    { caminho: ['endereco', 'uf'], mensagem: 'Escolha o estado do lugar.' },
  ],
  comida: [{ caminho: ['oQueProvei'], mensagem: 'Conte o que você provou.' }],
};

// Erros da validação, com o caminho relativo à ficha para o Sanity marcar o subcampo certo.
export function problemasNaFicha(ficha: unknown, modelo: ModeloDeFicha) {
  return CAMPOS_CHAVE[modelo]
    .filter(({ caminho }) => !preenchido(ler(ficha, caminho)))
    .map(({ caminho, mensagem }) => ({ message: mensagem, path: [...caminho] }));
}

// Instagram do lugar, com ou sem @: até 30 letras, números, pontos e sublinhados.
export function problemaNoInstagram(perfil: string) {
  return /^@?[\w.]{1,30}$/.test(perfil.trim())
    ? undefined
    : 'Escreva só o perfil do Instagram, como @nomedolugar, sem o link.';
}

// `"ficha": ${FICHA_NO_GROQ}` numa consulta de post devolve só os campos do modelo da categoria,
// mesmo que a ficha guarde campos de outro modelo. Em pensamento, ou sem ficha, devolve `null`.
export const FICHA_NO_GROQ = `select(${MODELOS_DE_FICHA.map(
  ({ value }) =>
    `categoria->modeloFicha == "${value}" => ficha{${camposDoModelo(value).join(', ')}}`,
).join(', ')})`;
