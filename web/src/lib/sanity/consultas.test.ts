import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';

import * as consultas from './consultas';
import type {
  CONSULTA_DA_TAXONOMIA_RESULT,
  CONSULTA_DO_DESTAQUE_RESULT,
  CONSULTA_DO_LEIA_TAMBEM_RESULT,
  CONSULTA_DO_POST_RESULT,
  CONSULTA_DO_SITEMAP_RESULT,
  CONSULTA_DOS_POSTS_DA_CATEGORIA_RESULT,
  CONSULTA_DOS_POSTS_DA_TAG_RESULT,
  CONSULTA_DOS_REDIRECTS_RESULT,
  CONSULTA_DOS_ULTIMOS_POSTS_RESULT,
} from './tipos.gerados';

// As consultas rodam com o groq-js, a implementação de GROQ do Sanity, num dataset em memória: sem
// rede (docs/testes.md). O "agora" é fixo, para o post com data futura continuar no futuro.
const AGORA = new Date('2026-10-30T12:00:00Z');

const imagem = (alt: string) => ({
  _type: 'image',
  asset: { _type: 'reference', _ref: 'image-capa-1200x800-jpg' },
  alt,
});

const referencia = (id: string) => ({ _type: 'reference', _ref: id });

const post = (id: string, campos: Record<string, unknown>) => ({
  _id: id,
  _type: 'post',
  _updatedAt: '2026-10-01T10:00:00Z',
  slug: { current: id },
  titulo: `Título de ${id}`,
  capa: imagem(`Capa de ${id}`),
  ...campos,
});

const review = (id: string, categoria: string, dataDePublicacao: string, extra = {}) =>
  post(id, { tipo: 'review', categoria: referencia(categoria), dataDePublicacao, ...extra });

const pensamento = (id: string, formato: string, dataDePublicacao: string, extra = {}) =>
  post(id, { tipo: 'pensamento', formato: referencia(formato), dataDePublicacao, ...extra });

// Tudo o que uma consulta pública nunca pode devolver leva "PROIBIDO" no título ou no nome.
const dataset = [
  {
    _id: 'image-capa-1200x800-jpg',
    _type: 'sanity.imageAsset',
    url: 'https://cdn.sanity.io/images/p/d/capa-1200x800.jpg',
    metadata: { dimensions: { width: 1200, height: 800 }, lqip: 'data:image/jpeg;base64,xx' },
  },
  {
    _id: 'categoria-filmes',
    _type: 'categoria',
    nome: 'Filmes',
    slug: { current: 'filmes' },
    ordem: 1,
    modeloFicha: 'filme',
  },
  {
    _id: 'categoria-lugares',
    _type: 'categoria',
    nome: 'Lugares',
    slug: { current: 'lugares' },
    descricao: 'Passeios.',
    ordem: 2,
    modeloFicha: 'lugar',
  },
  {
    _id: 'formato-frases',
    _type: 'formato',
    nome: 'Frases soltas',
    slug: { current: 'frases' },
    ordem: 1,
  },
  { _id: 'tag-cafe', _type: 'tag', nome: 'Café', slug: { current: 'cafe' } },
  { _id: 'tag-cinema', _type: 'tag', nome: 'Cinema', slug: { current: 'cinema' } },
  { _id: 'tag-sem-post', _type: 'tag', nome: 'Sem post', slug: { current: 'sem-post' } },
  { _id: 'drafts.tag-nova', _type: 'tag', nome: 'PROIBIDO tag', slug: { current: 'nova' } },
  {
    _id: 'configuracoes',
    _type: 'configuracoes',
    postEmDestaque: referencia('antigo'),
    redes: [{ _key: 'a', rede: 'instagram', url: 'https://www.instagram.com/ronrom' }],
  },
  {
    _id: 'drafts.configuracoes',
    _type: 'configuracoes',
    fraseDaSemana: { texto: 'PROIBIDO frase' },
  },
  {
    _id: 'sobre',
    _type: 'sobre',
    _updatedAt: '2026-09-01T10:00:00Z',
    nome: 'Autora',
    bio: 'Bio.',
    foto: imagem('Foto da autora'),
  },

  review('dias-perfeitos', 'categoria-filmes', '2026-03-10T15:00:00-03:00', {
    nota: 4.5,
    tags: [referencia('tag-cinema'), referencia('tag-nova')],
    // Sobrou um campo de lugar de quando a review era de outra categoria.
    ficha: { direcao: 'Wim Wenders', ano: 2023, tipoDeCozinha: 'japonesa' },
    corpo: [
      {
        _type: 'block',
        _key: 'p1',
        markDefs: [{ _type: 'linkInterno', _key: 'l1', post: referencia('so-rascunho') }],
        children: [{ _type: 'span', _key: 's1', text: 'Link', marks: ['l1'] }],
      },
    ],
  }),
  review('cafe-do-bairro', 'categoria-lugares', '2026-03-12T09:00:00-03:00', {
    tags: [referencia('tag-cafe')],
  }),
  pensamento('sobre-gatos', 'formato-frases', '2026-03-11T20:00:00-03:00', {
    tags: [referencia('tag-cafe')],
    slugsAnteriores: ['/pensamentos/frases/gatos'],
  }),
  review('antigo', 'categoria-filmes', '2026-01-01T12:00:00-03:00', {
    seo: { noindex: true },
  }),

  // Rascunho de um post publicado, rascunho que nunca foi ao ar, versão de release e post no
  // futuro: nenhum aparece no site.
  review('drafts.dias-perfeitos', 'categoria-filmes', '2026-03-10T15:00:00-03:00', {
    slug: { current: 'dias-perfeitos' },
    titulo: 'PROIBIDO rascunho editado',
  }),
  review('drafts.so-rascunho', 'categoria-filmes', '2026-03-20T12:00:00-03:00', {
    slug: { current: 'so-rascunho' },
    titulo: 'PROIBIDO rascunho',
    tags: [referencia('tag-sem-post')],
  }),
  review('versions.r1.cafe-do-bairro', 'categoria-lugares', '2026-03-12T09:00:00-03:00', {
    slug: { current: 'cafe-do-bairro' },
    titulo: 'PROIBIDO versão',
  }),
  review('futuro', 'categoria-filmes', '2026-10-30T12:00:01Z', {
    titulo: 'PROIBIDO futuro',
    tags: [referencia('tag-sem-post')],
  }),
];

async function rodar(consulta: string, params: Record<string, unknown> = {}) {
  const resultado = await evaluate(parse(consulta, { params }), {
    dataset,
    params,
    timestamp: AGORA,
  });
  return resultado.get();
}

// Parâmetros que fazem cada consulta achar algo no dataset acima.
const PARAMETROS = {
  inicio: 0,
  fim: 12,
  tipo: 'review',
  categoria: 'filmes',
  formato: 'frases',
  tag: 'cafe',
  secao: 'filmes',
  slug: 'dias-perfeitos',
  id: 'dias-perfeitos',
};

describe('consultas do site', () => {
  it.each(Object.entries(consultas))(
    '%s não devolve rascunho, versão nem post com data futura',
    async (_nome, consulta) => {
      const resultado = JSON.stringify(await rodar(consulta, PARAMETROS));
      expect(resultado).not.toContain('PROIBIDO');
      expect(resultado).not.toMatch(/"(drafts|versions)\./);
    },
  );

  it('não acha o post futuro nem pelo próprio endereço', async () => {
    const params = { tipo: 'review', secao: 'filmes', slug: 'futuro' };
    expect(await rodar(consultas.CONSULTA_DO_POST, params)).toBeNull();
  });
});

describe('CONSULTA_DO_DESTAQUE', () => {
  it('devolve o post escolhido nas configurações', async () => {
    const destaque = (await rodar(consultas.CONSULTA_DO_DESTAQUE)) as CONSULTA_DO_DESTAQUE_RESULT;
    expect(destaque?._id).toBe('antigo');
  });

  it('cai no post mais recente quando o escolhido não está no ar', async () => {
    const consulta = consultas.CONSULTA_DO_DESTAQUE.replace('"configuracoes"', '"sem-config"');
    const destaque = (await rodar(consulta)) as CONSULTA_DO_DESTAQUE_RESULT;
    expect(destaque?._id).toBe('cafe-do-bairro');
  });
});

describe('listagens paginadas', () => {
  it('ordena do mais recente para o mais antigo e conta o total', async () => {
    const { posts, total } = (await rodar(consultas.CONSULTA_DOS_ULTIMOS_POSTS, {
      inicio: 0,
      fim: 12,
    })) as CONSULTA_DOS_ULTIMOS_POSTS_RESULT;
    expect(posts.map(({ _id }) => _id)).toEqual([
      'cafe-do-bairro',
      'sobre-gatos',
      'dias-perfeitos',
      'antigo',
    ]);
    expect(total).toBe(4);
  });

  it('devolve só a fatia da página, com o total de todas', async () => {
    const { posts, total } = (await rodar(consultas.CONSULTA_DOS_ULTIMOS_POSTS, {
      inicio: 2,
      fim: 4,
    })) as CONSULTA_DOS_ULTIMOS_POSTS_RESULT;
    expect(posts.map(({ _id }) => _id)).toEqual(['dias-perfeitos', 'antigo']);
    expect(total).toBe(4);
  });

  it('traz no card o que o urlDoPost precisa e a capa com o asset expandido', async () => {
    const { posts } = (await rodar(consultas.CONSULTA_DOS_ULTIMOS_POSTS, {
      inicio: 0,
      fim: 1,
    })) as CONSULTA_DOS_ULTIMOS_POSTS_RESULT;
    expect(posts[0]).toMatchObject({
      tipo: 'review',
      slug: 'cafe-do-bairro',
      categoria: { nome: 'Lugares', slug: 'lugares' },
      capa: {
        alt: 'Capa de cafe-do-bairro',
        asset: { url: expect.any(String), largura: 1200, altura: 800, lqip: expect.any(String) },
      },
    });
  });

  it('filtra pela categoria e traz os dados dela para o topo da página', async () => {
    const resultado = (await rodar(consultas.CONSULTA_DOS_POSTS_DA_CATEGORIA, {
      ...PARAMETROS,
      categoria: 'filmes',
    })) as CONSULTA_DOS_POSTS_DA_CATEGORIA_RESULT;
    expect(resultado.categoria).toEqual({ nome: 'Filmes', slug: 'filmes', descricao: null });
    expect(resultado.posts.map(({ _id }) => _id)).toEqual(['dias-perfeitos', 'antigo']);
    expect(resultado.total).toBe(2);
  });

  it('devolve categoria null e nenhum post para um slug que não existe', async () => {
    const resultado = (await rodar(consultas.CONSULTA_DOS_POSTS_DA_CATEGORIA, {
      ...PARAMETROS,
      categoria: 'nao-existe',
    })) as CONSULTA_DOS_POSTS_DA_CATEGORIA_RESULT;
    expect(resultado).toEqual({ categoria: null, posts: [], total: 0 });
  });

  it('filtra pela tag, misturando reviews e pensamentos', async () => {
    const resultado = (await rodar(consultas.CONSULTA_DOS_POSTS_DA_TAG, {
      ...PARAMETROS,
      tag: 'cafe',
    })) as CONSULTA_DOS_POSTS_DA_TAG_RESULT;
    expect(resultado.tag).toEqual({ nome: 'Café', slug: 'cafe' });
    expect(resultado.posts.map(({ _id }) => _id)).toEqual(['cafe-do-bairro', 'sobre-gatos']);
  });
});

describe('CONSULTA_DA_TAXONOMIA', () => {
  it('conta só os posts no ar e deixa de fora as tags sem post', async () => {
    const { categorias, formatos, tags } = (await rodar(
      consultas.CONSULTA_DA_TAXONOMIA,
    )) as CONSULTA_DA_TAXONOMIA_RESULT;
    expect(categorias.map(({ slug, total }) => [slug, total])).toEqual([
      ['filmes', 2],
      ['lugares', 1],
    ]);
    expect(formatos.map(({ slug, total }) => [slug, total])).toEqual([['frases', 1]]);
    expect(tags.map(({ slug, total }) => [slug, total])).toEqual([
      ['cafe', 2],
      ['cinema', 1],
    ]);
  });
});

describe('CONSULTA_DO_POST', () => {
  async function buscar(tipo: string, secao: string, slug: string) {
    return (await rodar(consultas.CONSULTA_DO_POST, {
      tipo,
      secao,
      slug,
    })) as CONSULTA_DO_POST_RESULT;
  }

  it('acha o post pelo tipo, pela categoria e pelo slug', async () => {
    expect(await buscar('review', 'filmes', 'dias-perfeitos')).toMatchObject({
      _id: 'dias-perfeitos',
      titulo: 'Título de dias-perfeitos',
      categoria: { nome: 'Filmes', slug: 'filmes', modeloFicha: 'filme' },
      nota: 4.5,
    });
  });

  it('acha o pensamento pelo formato', async () => {
    expect(await buscar('pensamento', 'frases', 'sobre-gatos')).toMatchObject({
      _id: 'sobre-gatos',
      formato: { slug: 'frases' },
    });
  });

  it('não acha o post em outra categoria nem em outro tipo', async () => {
    expect(await buscar('review', 'lugares', 'dias-perfeitos')).toBeNull();
    expect(await buscar('pensamento', 'filmes', 'dias-perfeitos')).toBeNull();
  });

  it('traz a ficha só com os campos do modelo da categoria', async () => {
    const resultado = await buscar('review', 'filmes', 'dias-perfeitos');
    expect(resultado?.ficha).toEqual({
      modelo: 'filme',
      direcao: 'Wim Wenders',
      ano: 2023,
      duracao: null,
      ondeVi: null,
      valeAPena: null,
    });
  });

  it('deixa de fora as tags que não estão publicadas', async () => {
    const resultado = await buscar('review', 'filmes', 'dias-perfeitos');
    expect(resultado?.tags).toEqual([{ nome: 'Cinema', slug: 'cinema' }]);
  });

  it('resolve o link interno para um post fora do ar como null', async () => {
    const resultado = await buscar('review', 'filmes', 'dias-perfeitos');
    const [paragrafo] = resultado?.corpo ?? [];
    expect(paragrafo?._type === 'block' && paragrafo.markDefs?.[0]).toMatchObject({
      _type: 'linkInterno',
      post: null,
    });
  });
});

describe('CONSULTA_DO_LEIA_TAMBEM', () => {
  async function leiaTambem(id: string) {
    const posts = (await rodar(consultas.CONSULTA_DO_LEIA_TAMBEM, {
      id,
    })) as CONSULTA_DO_LEIA_TAMBEM_RESULT;
    return posts.map(({ _id }) => _id);
  }

  it('começa pela mesma categoria, depois o mesmo tipo, sem o próprio post', async () => {
    expect(await leiaTambem('dias-perfeitos')).toEqual(['antigo', 'cafe-do-bairro', 'sobre-gatos']);
  });

  it('devolve lista vazia para um post que não existe', async () => {
    expect(await leiaTambem('nao-existe')).toEqual([]);
  });

  it('sem outro post da mesma seção nem do mesmo tipo, mostra os mais recentes', async () => {
    expect(await leiaTambem('sobre-gatos')).toEqual(['cafe-do-bairro', 'dias-perfeitos', 'antigo']);
  });
});

describe('dados do build', () => {
  it('liga cada caminho antigo à rota atual do post', async () => {
    const redirects = (await rodar(
      consultas.CONSULTA_DOS_REDIRECTS,
    )) as CONSULTA_DOS_REDIRECTS_RESULT;
    expect(redirects).toEqual([
      {
        anteriores: ['/pensamentos/frases/gatos'],
        tipo: 'pensamento',
        slug: 'sobre-gatos',
        categoria: null,
        formato: { slug: 'frases' },
      },
    ]);
  });

  it('marca no sitemap o post com noindex', async () => {
    const sitemap = (await rodar(consultas.CONSULTA_DO_SITEMAP)) as CONSULTA_DO_SITEMAP_RESULT;
    expect(sitemap.posts.map(({ slug, noindex }) => [slug, noindex])).toEqual([
      ['cafe-do-bairro', false],
      ['sobre-gatos', false],
      ['dias-perfeitos', false],
      ['antigo', true],
    ]);
  });
});
