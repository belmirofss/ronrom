import { describe, expect, it } from 'vitest';
import {
  hrefDoLinkExterno,
  hrefDoLinkInterno,
  prepararCorpo,
  type BlocoPreparado,
  type Corpo,
} from '@/lib/corpo';

let chave = 0;

// Bloco de texto mínimo: um span com o texto, no estilo pedido. `style` é `string` para testar
// também o h1, que o schema não tem.
function bloco(style: string, texto: string, extra: Record<string, unknown> = {}) {
  chave += 1;
  return {
    _type: 'block',
    _key: `b${chave}`,
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: `s${chave}`, text: texto, marks: [] }],
    ...extra,
  } as unknown as Corpo[number];
}

const subtitulos = (corpo: Corpo) =>
  (prepararCorpo(corpo) as BlocoPreparado[])
    .filter((item) => item.ancora)
    .map(({ style, ancora }) => `${style}#${ancora}`);

describe('prepararCorpo', () => {
  it('gera a âncora dos subtítulos com o slugify das URLs', () => {
    expect(subtitulos([bloco('h2', 'O papel lembra por mim'), bloco('h3', 'Café & Pão!')])).toEqual(
      ['h2#o-papel-lembra-por-mim', 'h3#cafe-pao'],
    );
  });

  it('numera as âncoras repetidas, sem repetir o id do <main>', () => {
    expect(
      subtitulos([
        bloco('h2', 'Listas'),
        bloco('h3', 'Listas'),
        bloco('h2', 'Listas'),
        bloco('h2', 'Listas 2'),
        bloco('h2', 'Conteúdo'),
      ]),
    ).toEqual(['h2#listas', 'h3#listas-2', 'h2#listas-3', 'h2#listas-2-2', 'h2#conteudo-2']);
  });

  it('dá uma âncora a um subtítulo sem letra nem número', () => {
    expect(subtitulos([bloco('h2', '???'), bloco('h2', '!!!')])).toEqual([
      'h2#secao',
      'h2#secao-2',
    ]);
  });

  it('não pula nível: h1 vira h2, e h3 antes de qualquer h2 também', () => {
    expect(
      subtitulos([
        bloco('h3', 'Antes de tudo'),
        bloco('h1', 'Título do editor'),
        bloco('h3', 'Depois do h2'),
      ]),
    ).toEqual(['h2#antes-de-tudo', 'h2#titulo-do-editor', 'h3#depois-do-h2']);
  });

  it('tira os blocos sem texto, inclusive itens de lista e subtítulos', () => {
    const corpo = [
      bloco('normal', 'Primeiro.'),
      bloco('normal', ''),
      bloco('h2', '   '),
      bloco('normal', '\n'),
      bloco('normal', '', { listItem: 'bullet', level: 1 }),
      bloco('normal', 'Último.'),
    ];
    expect(prepararCorpo(corpo).map((item) => item._key)).toEqual([corpo[0]?._key, corpo[5]?._key]);
  });

  it('mostra item de lista com estilo de subtítulo como texto normal, sem âncora', () => {
    const [item] = prepararCorpo([bloco('h2', 'Item', { listItem: 'number', level: 1 })]);
    expect(item).toMatchObject({ style: 'normal', listItem: 'number' });
    expect(item).not.toHaveProperty('ancora');
  });

  it('mantém parágrafos, citações e blocos que não são texto como vieram', () => {
    const citacao = { _type: 'citacaoDestaque', _key: 'c1', texto: 'Uma frase.' } as const;
    const corpo = [bloco('normal', 'Texto.'), bloco('blockquote', 'Citação.'), citacao];
    expect(prepararCorpo(corpo)).toEqual(corpo);
  });

  it('aceita corpo vazio ou ausente', () => {
    expect(prepararCorpo(null)).toEqual([]);
    expect(prepararCorpo(undefined)).toEqual([]);
    expect(prepararCorpo([])).toEqual([]);
  });
});

describe('hrefDoLinkExterno', () => {
  it.each([
    'https://www.imdb.com/title/tt27503384/',
    'http://example.com',
    'mailto:oi@example.com',
  ])('aceita %s', (href) => {
    expect(hrefDoLinkExterno(href)).toBe(href);
  });

  it.each(['javascript:alert(1)', 'JavaScript:alert(1)', 'tel:+5511999999999', '/sobre', '', null])(
    'recusa %s',
    (href) => {
      expect(hrefDoLinkExterno(href)).toBeNull();
    },
  );
});

describe('hrefDoLinkInterno', () => {
  it('monta o caminho do post com o urlDoPost', () => {
    expect(
      hrefDoLinkInterno({
        tipo: 'review',
        slug: 'dias-perfeitos',
        categoria: { slug: 'filmes' },
        formato: null,
      }),
    ).toBe('/reviews/filmes/dias-perfeitos');
  });

  it('devolve null com o destino fora do ar', () => {
    expect(hrefDoLinkInterno(null)).toBeNull();
  });
});
