import { describe, expect, it, vi } from 'vitest';
import {
  blogPosting,
  breadcrumbList,
  grafoDaPagina,
  ID_DA_AUTORA,
  ID_DO_SITE,
  serializarJsonLd,
  type Identidade,
} from '@/lib/jsonld';
import { buscarConfiguracoes, buscarPost as buscar, buscarSobre } from '@/lib/sanity/conteudo';
import { trilhaDaCategoria, trilhaDaPagina, trilhaDoPost } from '@/lib/trilha';

// Modo fixtures, sem depender do web/.env de quem roda (docs/testes.md).
vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: true,
  SANITY_PROJECT_ID: undefined,
  SANITY_DATASET: undefined,
  SANITY_API_VERSION: '2025-02-19',
  STUDIO_URL: 'https://ronrom.sanity.studio',
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: false,
  // Lido pelo robotsDaPagina (seo.ts, #52); o JSON-LD não depende dele.
  VERCEL_ENV: undefined,
}));
vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

const SITE = 'https://ronrom-blog.vercel.app';

// Os documentos de verdade das fixtures, pelas mesmas funções das páginas.
async function buscarPost(tipo: 'review' | 'pensamento', secao: string, slug: string) {
  const post = await buscar({ tipo, secao, slug });
  if (!post) throw new Error(`Fixture ${secao}/${slug} ausente.`);
  return post;
}

async function identidade(): Promise<Identidade> {
  const [sobre, configuracoes] = await Promise.all([buscarSobre(), buscarConfiguracoes()]);
  return { sobre, configuracoes };
}

const tipos = (grafo: { '@graph': readonly unknown[] }) =>
  grafo['@graph'].map((no) => (no as { '@type': string })['@type']);

// Os @id citados no grafo (fora o próprio @id de cada entidade) e os definidos nele.
function referencias(grafo: { '@graph': readonly unknown[] }) {
  const definidos = new Set(grafo['@graph'].map((no) => (no as { '@id': string })['@id']));
  const citados = new Set<string>();
  const visitar = (valor: unknown, raiz: boolean) => {
    if (Array.isArray(valor)) valor.forEach((item) => visitar(item, false));
    else if (valor && typeof valor === 'object') {
      const objeto = valor as Record<string, unknown>;
      if (!raiz && Object.keys(objeto).length === 1 && typeof objeto['@id'] === 'string') {
        citados.add(objeto['@id']);
      }
      Object.values(objeto).forEach((item) => visitar(item, false));
    }
  };
  grafo['@graph'].forEach((no) => visitar(no, true));
  return { definidos, citados };
}

describe('grafoDaPagina', () => {
  it('na home, traz o WebSite com nome, idioma e busca, e a autora', async () => {
    const grafo = grafoDaPagina({ tipo: 'home' }, await identidade());

    expect(grafo['@context']).toBe('https://schema.org');
    expect(tipos(grafo)).toEqual(['WebSite', 'Person']);
    expect(grafo['@graph'][0]).toMatchObject({
      '@id': `${SITE}/#site`,
      name: 'Ronrom',
      alternateName: 'Ronrom Blog',
      url: `${SITE}/`,
      inLanguage: 'pt-BR',
      publisher: { '@id': ID_DA_AUTORA },
      potentialAction: {
        '@type': 'SearchAction',
        target: { urlTemplate: `${SITE}/busca?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    });
  });

  it('descreve a autora com o Sobre e as redes de Configurações', async () => {
    const [, autora] = grafoDaPagina({ tipo: 'home' }, await identidade())['@graph'];

    expect(autora).toEqual({
      '@type': 'Person',
      '@id': `${SITE}/sobre#autora`,
      name: 'Ana Ronrom',
      url: `${SITE}/sobre`,
      sameAs: ['https://www.instagram.com/ronrom.blog', 'https://letterboxd.com/ronrom'],
      description: expect.stringContaining('caderno'),
    });
  });

  it('na /sobre, usa um ProfilePage com a autora como entidade principal', async () => {
    const grafo = grafoDaPagina({ tipo: 'sobre' }, await identidade());

    expect(tipos(grafo)).toEqual(['WebSite', 'Person', 'ProfilePage']);
    expect(grafo['@graph'][2]).toMatchObject({
      '@id': `${SITE}/sobre`,
      mainEntity: { '@id': ID_DA_AUTORA },
      isPartOf: { '@id': ID_DO_SITE },
      dateModified: '2026-09-01T07:00:00-03:00',
    });
  });

  it('sem nome no Sobre, não inventa autora nem deixa referência solta', async () => {
    const { configuracoes } = await identidade();
    const post = await buscarPost('pensamento', 'artigos', 'por-que-eu-anoto-tudo-num-caderno');

    for (const pagina of [{ tipo: 'sobre' }, { tipo: 'post', post }] as const) {
      const grafo = grafoDaPagina(pagina, { sobre: null, configuracoes });
      const { definidos, citados } = referencias(grafo);

      expect(tipos(grafo)).not.toContain('Person');
      expect([...citados].filter((id) => !definidos.has(id))).toEqual([]);
    }
  });

  it('no pensamento, traz a página, o BlogPosting e a trilha, sem entidade repetida', async () => {
    const post = await buscarPost('pensamento', 'artigos', 'por-que-eu-anoto-tudo-num-caderno');
    const grafo = grafoDaPagina({ tipo: 'post', post }, await identidade());
    const { definidos, citados } = referencias(grafo);

    expect(tipos(grafo)).toEqual(['WebSite', 'Person', 'WebPage', 'BlogPosting', 'BreadcrumbList']);
    expect(definidos.size).toBe(grafo['@graph'].length);
    expect([...citados].filter((id) => !definidos.has(id))).toEqual([]);
  });

  it('na review, fica com a página e a trilha até a Review da #51', async () => {
    const post = await buscarPost('review', 'filmes', 'dias-perfeitos');

    expect(tipos(grafoDaPagina({ tipo: 'post', post }, await identidade()))).toEqual([
      'WebSite',
      'Person',
      'WebPage',
      'BreadcrumbList',
    ]);
  });

  it('na listagem, traz o CollectionPage e a trilha da página aberta', async () => {
    const trilha = trilhaDaPagina(trilhaDaCategoria({ nome: 'Filmes', slug: 'filmes' }), 2);
    const grafo = grafoDaPagina(
      { tipo: 'listagem', titulo: 'Reviews de filmes — página 2', trilha },
      await identidade(),
    );

    expect(tipos(grafo)).toEqual(['WebSite', 'Person', 'CollectionPage', 'BreadcrumbList']);
    expect(grafo['@graph'][2]).toMatchObject({
      '@id': 'https://ronrom-blog.vercel.app/reviews/filmes/pagina/2',
      name: 'Reviews de filmes — página 2',
      breadcrumb: { '@id': 'https://ronrom-blog.vercel.app/reviews/filmes/pagina/2#trilha' },
    });
  });
});

describe('blogPosting', () => {
  it('preenche os campos do artigo, com as datas no fuso de Brasília', async () => {
    const post = await buscarPost('pensamento', 'artigos', 'por-que-eu-anoto-tudo-num-caderno');
    const url =
      'https://ronrom-blog.vercel.app/pensamentos/artigos/por-que-eu-anoto-tudo-num-caderno';

    expect(blogPosting(post, true)).toMatchObject({
      '@type': 'BlogPosting',
      '@id': `${url}#post`,
      url,
      headline: post.titulo,
      datePublished: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/),
      dateModified: expect.stringMatching(/-03:00$/),
      author: { '@id': ID_DA_AUTORA },
      publisher: { '@id': ID_DA_AUTORA },
      mainEntityOfPage: { '@id': url },
      inLanguage: 'pt-BR',
      articleSection: 'Artigos',
      wordCount: expect.any(Number),
    });
  });

  it('usa as tags como palavras-chave e omite o que está vazio', async () => {
    const post = await buscarPost('pensamento', 'artigos', 'por-que-eu-anoto-tudo-num-caderno');

    expect(blogPosting({ ...post, tags: [{ nome: 'Café', slug: 'cafe' }] }, true).keywords).toEqual(
      ['Café'],
    );
    const semTags = blogPosting({ ...post, tags: [] }, false);
    expect(semTags).not.toHaveProperty('keywords');
    expect(semTags).not.toHaveProperty('author');
  });

  it('pede a capa do CDN em 1200×630, 1200×900 e 1200×1200', async () => {
    const post = await buscarPost('pensamento', 'artigos', 'por-que-eu-anoto-tudo-num-caderno');
    const capa = {
      _type: 'image' as const,
      asset: {
        _id: 'image-f00-2400x2400-jpg',
        url: 'https://cdn.sanity.io/images/abc123/production/f00-2400x2400.jpg',
        largura: 2400,
        altura: 2400,
        lqip: null,
      },
    };
    const imagens = blogPosting({ ...post, seo: null, capa }, true).image as string[];

    expect(imagens.map((url) => new URL(url).searchParams.get('h'))).toEqual([
      '630',
      '900',
      '1200',
    ]);
    expect(imagens.every((url) => new URL(url).searchParams.get('w') === '1200')).toBe(true);
  });

  it('cai na imagem padrão do site fora do CDN', async () => {
    const post = await buscarPost('pensamento', 'artigos', 'por-que-eu-anoto-tudo-num-caderno');

    expect(blogPosting(post, true).image).toEqual([`${SITE}/og-padrao.jpg`]);
  });
});

describe('breadcrumbList', () => {
  it('repete os itens do Breadcrumb, com URLs absolutas e posições a partir de 1', async () => {
    const post = await buscarPost('review', 'filmes', 'dias-perfeitos');
    const trilha = trilhaDoPost(post);

    expect(breadcrumbList(trilha)).toEqual({
      '@type': 'BreadcrumbList',
      '@id': 'https://ronrom-blog.vercel.app/reviews/filmes/dias-perfeitos#trilha',
      itemListElement: trilha.map(({ rotulo, href }, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: rotulo,
        item: href === '/' ? `${SITE}/` : `${SITE}${href}`,
      })),
    });
  });

  it('lança erro com a trilha vazia', () => {
    expect(() => breadcrumbList([])).toThrow(/Trilha vazia/);
  });
});

// U+2028, o separador de linha.
const SEPARADOR = String.fromCharCode(0x2028);

describe('serializarJsonLd', () => {
  it('não deixa o texto fechar o <script> e continua lendo o mesmo valor', () => {
    const dados = {
      '@context': 'https://schema.org' as const,
      '@graph': [
        { '@type': 'Thing' as const, name: `Fim </script><script>x</script> & <!-- ${SEPARADOR}` },
      ],
    };
    const json = serializarJsonLd(dados);

    expect(json).not.toMatch(/[<>&]/);
    expect(json).not.toContain(SEPARADOR);
    expect(json).toContain('\\u003c/script');
    expect(JSON.parse(json)).toEqual(dados);
  });
});
