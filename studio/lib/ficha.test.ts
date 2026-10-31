import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';

import {
  CAMPOS_COMUNS,
  CAMPOS_DA_FICHA,
  camposDoModelo,
  camposIgnorados,
  FICHA_NO_GROQ,
  modeloDaFicha,
  problemaNoInstagram,
  problemasNaFicha,
} from './ficha';
import { MODELOS_DE_FICHA } from './taxonomia';

describe('CAMPOS_DA_FICHA', () => {
  it('tem campos para todos os modelos de ficha', () => {
    expect(Object.keys(CAMPOS_DA_FICHA).sort()).toEqual(
      MODELOS_DE_FICHA.map(({ value }) => value).sort(),
    );
  });
});

describe('modeloDaFicha', () => {
  it.each(MODELOS_DE_FICHA.map(({ value }) => value))('aceita %s', (modelo) => {
    expect(modeloDaFicha(modelo)).toBe(modelo);
  });

  it.each([undefined, null, '', 'Filme', 'restaurante'])('recusa %s', (valor) => {
    expect(modeloDaFicha(valor)).toBeUndefined();
  });
});

describe('camposDoModelo', () => {
  it('junta os campos do modelo e os comuns', () => {
    expect(camposDoModelo('filme')).toEqual(['direcao', 'ano', 'duracao', 'ondeVi', 'valeAPena']);
  });

  it('todo modelo termina com o "vale a pena?"', () => {
    for (const { value } of MODELOS_DE_FICHA) {
      expect(camposDoModelo(value).slice(-CAMPOS_COMUNS.length)).toEqual([...CAMPOS_COMUNS]);
    }
  });
});

describe('camposIgnorados', () => {
  it('lista os campos preenchidos de outro modelo', () => {
    const ficha = { _type: 'ficha', direcao: 'Wim Wenders', ano: 2023, valeAPena: 'Muito' };
    expect(camposIgnorados(ficha, 'lugar')).toEqual(['direcao', 'ano']);
  });

  it('não acusa campo que o novo modelo também usa', () => {
    const ficha = { ondeVi: { meio: 'streaming', qual: 'Mubi' }, ano: 2023 };
    expect(camposIgnorados(ficha, 'serie')).toEqual(['ano']);
    expect(camposIgnorados(ficha, 'livro')).toEqual(['ondeVi']);
  });

  it('ignora campos vazios, objetos sem subcampo preenchido e chaves internas', () => {
    const ficha = {
      _type: 'ficha',
      direcao: '  ',
      endereco: { _type: 'endereco', rua: '' },
      ondeVi: {},
      paginas: 0,
    };
    expect(camposIgnorados(ficha, 'filme')).toEqual(['paginas']);
  });

  it('não acusa nada sem ficha', () => {
    expect(camposIgnorados(undefined, 'filme')).toEqual([]);
  });
});

describe('problemasNaFicha', () => {
  it.each([
    ['filme', ['direcao']],
    ['serie', ['criacao']],
    ['livro', ['autoria']],
  ] as const)('%s exige %s', (modelo, caminho) => {
    expect(problemasNaFicha(undefined, modelo).map(({ path }) => path)).toEqual([caminho]);
  });

  it('lugar exige rua, cidade e estado, mas não o bairro', () => {
    const ficha = { endereco: { bairro: 'Pinheiros', cidade: 'São Paulo' } };
    expect(problemasNaFicha(ficha, 'lugar').map(({ path }) => path)).toEqual([
      ['endereco', 'rua'],
      ['endereco', 'uf'],
    ]);
  });

  it('não reclama de ficha completa', () => {
    expect(problemasNaFicha({ direcao: 'Wim Wenders' }, 'filme')).toEqual([]);
    expect(
      problemasNaFicha(
        { endereco: { rua: 'Rua Augusta, 1500', cidade: 'São Paulo', uf: 'SP' } },
        'lugar',
      ),
    ).toEqual([]);
  });

  it('não aceita texto em branco no campo-chave', () => {
    expect(problemasNaFicha({ direcao: '   ' }, 'filme')).toHaveLength(1);
  });

  it('não exige o campo-chave de outro modelo', () => {
    expect(problemasNaFicha({ direcao: 'Wim Wenders' }, 'livro')[0]?.path).toEqual(['autoria']);
  });
});

describe('problemaNoInstagram', () => {
  it.each(['@cafe.do.ponto', 'cafe_do_ponto', ' @padaria '])('aceita %s', (perfil) => {
    expect(problemaNoInstagram(perfil)).toBeUndefined();
  });

  it.each(['https://instagram.com/cafe', '@café', '@', 'a'.repeat(31), '@dois perfis'])(
    'recusa %s',
    (perfil) => {
      expect(problemaNoInstagram(perfil)).toBeDefined();
    },
  );
});

describe('FICHA_NO_GROQ', () => {
  // Ficha com campos de filme e de lugar: a autora trocou a categoria sem apagar nada.
  const ficha = {
    _type: 'ficha',
    direcao: 'Wim Wenders',
    ano: 2023,
    endereco: { rua: 'Rua Augusta, 1500', cidade: 'São Paulo', uf: 'SP' },
    tipoDeCozinha: 'japonesa',
    valeAPena: 'Vale',
  };

  const dataset = [
    { _id: 'categoria-filmes', _type: 'categoria', modeloFicha: 'filme' },
    { _id: 'categoria-lugares', _type: 'categoria', modeloFicha: 'lugar' },
    { _id: 'categoria-livros', _type: 'categoria', modeloFicha: 'livro' },
    { _id: 'filme', _type: 'post', tipo: 'review', categoria: { _ref: 'categoria-filmes' }, ficha },
    {
      _id: 'lugar',
      _type: 'post',
      tipo: 'review',
      categoria: { _ref: 'categoria-lugares' },
      ficha,
    },
    { _id: 'sem-ficha', _type: 'post', tipo: 'review', categoria: { _ref: 'categoria-livros' } },
    { _id: 'pensamento', _type: 'post', tipo: 'pensamento', ficha },
  ];

  async function fichaDo(id: string, emDataset: Record<string, unknown>[] = dataset) {
    const consulta = parse(`*[_id == $id][0]{ "ficha": ${FICHA_NO_GROQ} }.ficha`);
    const resultado = await evaluate(consulta, { dataset: emDataset, params: { id } });
    return resultado.get();
  }

  // A projeção é escrita à mão: um campo novo em CAMPOS_DA_FICHA que não entrar nela some do site.
  it.each(MODELOS_DE_FICHA.map(({ value }) => value))(
    'devolve o modelo e os campos de %s',
    async (modelo) => {
      const todosOsCampos = Object.fromEntries(
        [...Object.values(CAMPOS_DA_FICHA).flat(), ...CAMPOS_COMUNS].map((campo) => [campo, 1]),
      );
      const devolvida = await fichaDo('post', [
        { _id: 'categoria', _type: 'categoria', modeloFicha: modelo },
        {
          _id: 'post',
          _type: 'post',
          tipo: 'review',
          categoria: { _ref: 'categoria' },
          ficha: todosOsCampos,
        },
      ]);
      expect(Object.keys(devolvida as object).sort()).toEqual(
        ['modelo', ...camposDoModelo(modelo)].sort(),
      );
      expect(devolvida).toMatchObject({ modelo });
    },
  );

  it('em review de filme, devolve só os campos de filme', async () => {
    expect(await fichaDo('filme')).toEqual({
      modelo: 'filme',
      direcao: 'Wim Wenders',
      ano: 2023,
      duracao: null,
      ondeVi: null,
      valeAPena: 'Vale',
    });
  });

  it('em review de lugar, devolve só os campos de lugar', async () => {
    expect(await fichaDo('lugar')).toEqual({
      modelo: 'lugar',
      endereco: ficha.endereco,
      linkDoMapa: null,
      faixaDePreco: null,
      tipoDeCozinha: 'japonesa',
      oQuePedi: null,
      instagram: null,
      valeAPena: 'Vale',
    });
  });

  it('devolve null sem ficha e em pensamento', async () => {
    expect(await fichaDo('sem-ficha')).toBeNull();
    expect(await fichaDo('pensamento')).toBeNull();
  });
});
