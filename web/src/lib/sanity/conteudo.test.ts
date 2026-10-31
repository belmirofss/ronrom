import { describe, expect, it, vi } from 'vitest';

import { videoDoLink } from '../../../../studio/lib/video';
import { CATEGORIAS, FORMATOS } from '../../../../studio/lib/taxonomia';
import { urlDoPost } from '@/lib/rotas';
import {
  buscarConfiguracoes,
  buscarDestaque,
  buscarIndiceDePosts,
  buscarLeiaTambem,
  buscarPost,
  buscarPostsDaCategoria,
  buscarPostsDaTag,
  buscarPostsDoFormato,
  buscarPostsDoTipo,
  buscarRotasDosPosts,
  buscarSitemap,
  buscarSobre,
  buscarTaxonomia,
  buscarUltimos,
  fatiaDaPagina,
  POSTS_POR_PAGINA,
  totalDePaginas,
} from './conteudo';

// Modo fixtures, sem depender do web/.env de quem roda: as consultas rodam com o groq-js no
// dataset de fixtures/, sem rede (docs/testes.md).
vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: true,
  SANITY_PROJECT_ID: undefined,
  SANITY_DATASET: undefined,
  SANITY_API_VERSION: '2025-02-19',
  STUDIO_URL: 'https://ronrom.sanity.studio',
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: false,
}));
vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

async function todosOsPosts() {
  const rotas = await buscarRotasDosPosts();
  const posts = await Promise.all(
    rotas.map((rota) =>
      buscarPost({
        tipo: rota.tipo,
        secao: (rota.tipo === 'review' ? rota.categoria?.slug : rota.formato?.slug) ?? '',
        slug: rota.slug,
      }),
    ),
  );
  return posts.filter((post) => post !== null);
}

describe('paginação', () => {
  it('a página n pega a fatia [(n - 1) * 12...n * 12]', () => {
    expect(POSTS_POR_PAGINA).toBe(12);
    expect(fatiaDaPagina(1)).toEqual({ inicio: 0, fim: 12 });
    expect(fatiaDaPagina(3)).toEqual({ inicio: 24, fim: 36 });
  });

  it.each([0, -1, 1.5, Number.NaN])('recusa a página %s', (n) => {
    expect(() => fatiaDaPagina(n)).toThrow(/Página inválida/);
  });

  it('conta as páginas, com pelo menos uma', () => {
    expect(totalDePaginas(0)).toBe(1);
    expect(totalDePaginas(12)).toBe(1);
    expect(totalDePaginas(13)).toBe(2);
  });
});

describe('funções de acesso no modo fixtures', () => {
  it('configurações e sobre vêm preenchidos', async () => {
    const configuracoes = await buscarConfiguracoes();
    expect(configuracoes?.fraseDaSemana?.texto).toBeTruthy();
    expect(configuracoes?.redes?.length).toBeGreaterThan(0);

    const sobre = await buscarSobre();
    expect(sobre?.nome).toBeTruthy();
    expect(sobre?.foto?.asset?.url).toMatch(/^data:image\/svg\+xml,/);
    expect(sobre?.texto?.length).toBeGreaterThan(0);
  });

  it('o destaque é o post escolhido nas configurações', async () => {
    expect((await buscarDestaque())?.slug).toBe('dias-perfeitos');
  });

  it('a listagem de todos os posts traz 1 review por categoria e 1 pensamento por formato', async () => {
    const { posts, total } = await buscarUltimos();
    expect(total).toBe(CATEGORIAS.length + FORMATOS.length);
    expect(posts).toHaveLength(total);

    const datas = posts.map((post) => post.dataDePublicacao);
    expect(datas).toEqual([...datas].sort().reverse());
  });

  it('a página além da última vem vazia, com o total', async () => {
    expect(await buscarUltimos(2)).toEqual({ posts: [], total: 10 });
  });

  it('filtra por tipo, categoria, formato e tag', async () => {
    expect((await buscarPostsDoTipo('review')).total).toBe(CATEGORIAS.length);
    expect((await buscarPostsDoTipo('pensamento')).total).toBe(FORMATOS.length);

    const filmes = await buscarPostsDaCategoria('filmes');
    expect(filmes.categoria?.nome).toBe('Filmes');
    expect(filmes.posts.map((post) => post.slug)).toEqual(['dias-perfeitos']);

    const frases = await buscarPostsDoFormato('frases');
    expect(frases.formato?.nome).toBe('Frases soltas');
    expect(frases.total).toBe(1);

    const cafe = await buscarPostsDaTag('cafe');
    expect(cafe.tag?.nome).toBe('Café');
    expect(cafe.total).toBeGreaterThan(0);
  });

  it('seção inexistente vem null', async () => {
    expect((await buscarPostsDaCategoria('nao-existe')).categoria).toBeNull();
    expect((await buscarPostsDoFormato('nao-existe')).formato).toBeNull();
    expect((await buscarPostsDaTag('nao-existe')).tag).toBeNull();
  });

  it('toda categoria e todo formato têm um post, e toda tag listada tem post', async () => {
    const { categorias, formatos, tags } = await buscarTaxonomia();
    expect(categorias.map((categoria) => categoria.slug)).toEqual(CATEGORIAS.map((c) => c.slug));
    expect(formatos.map((formato) => formato.slug)).toEqual(FORMATOS.map((f) => f.slug));
    for (const item of [...categorias, ...formatos]) expect(item.total).toBe(1);
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(tag.total).toBeGreaterThan(0);
  });

  it('todo post tem uma URL válida e é achado por ela', async () => {
    const rotas = await buscarRotasDosPosts();
    const urls = rotas.map((rota) => urlDoPost(rota));
    expect(new Set(urls).size).toBe(rotas.length);
    expect(await todosOsPosts()).toHaveLength(rotas.length);
  });

  it('post em outro endereço não é achado', async () => {
    expect(
      await buscarPost({ tipo: 'review', secao: 'series', slug: 'dias-perfeitos' }),
    ).toBeNull();
  });

  it('toda review tem nota e a ficha do modelo da categoria', async () => {
    const reviews = (await todosOsPosts()).filter((post) => post.tipo === 'review');
    expect(reviews).toHaveLength(CATEGORIAS.length);
    for (const review of reviews) {
      expect(review.nota).not.toBeNull();
      expect(review.ficha?.modelo).toBe(review.categoria?.modeloFicha);
    }

    // Ficha completa em todas, menos no mirante, que fica sem os campos de restaurante.
    const vazios = reviews.flatMap((review) =>
      Object.entries(review.ficha ?? {})
        .filter(([, valor]) => valor === null)
        .map(([campo]) => `${review.slug}.${campo}`),
    );
    expect(vazios).toEqual([
      'mirante-do-morro-azul.tipoDeCozinha',
      'mirante-do-morro-azul.instagram',
    ]);
  });

  it('o "Leia também" traz até 3 cards sem o próprio post', async () => {
    const leiaTambem = await buscarLeiaTambem('fixture-dias-perfeitos');
    expect(leiaTambem).toHaveLength(3);
    expect(leiaTambem.map((post) => post._id)).not.toContain('fixture-dias-perfeitos');
  });

  it('o índice traz todos os posts com capa', async () => {
    const indice = await buscarIndiceDePosts();
    expect(indice).toHaveLength(10);
    for (const post of indice) {
      expect(post.capa.asset).toMatchObject({
        largura: expect.any(Number),
        altura: expect.any(Number),
      });
      expect(post.capa.alt).toBeTruthy();
    }
  });

  it('sitemap', async () => {
    const sitemap = await buscarSitemap();
    expect(sitemap.posts).toHaveLength(10);
    expect(sitemap.posts.filter((post) => post.noindex).map((post) => post.slug)).toEqual([
      'sobre-gatos',
    ]);
  });
});

describe('o corpo das fixtures cobre todo o Portable Text', async () => {
  const blocos = (await todosOsPosts()).flatMap((post) => post.corpo ?? []);
  const textos = blocos.filter((bloco) => bloco._type === 'block');
  const anotacoes = textos.flatMap((bloco) => bloco.markDefs ?? []);

  it('todos os tipos de bloco', () => {
    expect(new Set(blocos.map((bloco) => bloco._type))).toEqual(
      new Set(['block', 'imagem', 'galeria', 'video', 'citacaoDestaque']),
    );
  });

  it('todos os estilos, as duas listas (com subnível) e as marcas', () => {
    expect(new Set(textos.map((bloco) => bloco.style))).toEqual(
      new Set(['normal', 'h2', 'h3', 'blockquote']),
    );
    expect(new Set(textos.map((bloco) => bloco.listItem).filter(Boolean))).toEqual(
      new Set(['bullet', 'number']),
    );
    expect(textos.some((bloco) => bloco.listItem && bloco.level === 2)).toBe(true);

    const marcas = new Set(
      textos.flatMap((bloco) => bloco.children?.flatMap((span) => span.marks) ?? []),
    );
    expect(marcas).toContain('strong');
    expect(marcas).toContain('em');
  });

  it('link externo (https e mailto) e link interno, no ar e fora do ar', () => {
    const externos = anotacoes.filter((anotacao) => anotacao._type === 'link');
    expect(externos.some((link) => link.href.startsWith('https://'))).toBe(true);
    expect(externos.some((link) => link.href.startsWith('mailto:'))).toBe(true);

    const internos = anotacoes.filter((anotacao) => anotacao._type === 'linkInterno');
    // O tipo gerado não diz, mas o destino fora do ar vem `null` (studio/lib/corpo.ts).
    const destinos = internos.map((link) => link.post as typeof link.post | null);
    expect(destinos).toContain(null);
    for (const destino of destinos.filter((post) => post !== null)) {
      expect(urlDoPost(destino)).toMatch(/^\/(reviews|pensamentos)\//);
    }
  });

  it('imagem normal e larga, galeria e citação em destaque com e sem fonte', () => {
    const imagens = blocos.filter((bloco) => bloco._type === 'imagem');
    expect(new Set(imagens.map((imagem) => imagem.largura))).toEqual(new Set(['normal', 'larga']));
    for (const imagem of imagens) expect(imagem.asset?.url).toBeTruthy();

    const galerias = blocos.filter((bloco) => bloco._type === 'galeria');
    for (const galeria of galerias) {
      expect(galeria.imagens?.length).toBeGreaterThanOrEqual(2);
      for (const imagem of galeria.imagens ?? []) expect(imagem.asset?.url).toBeTruthy();
    }

    const citacoes = blocos.filter((bloco) => bloco._type === 'citacaoDestaque');
    expect(citacoes.some((citacao) => citacao.fonte)).toBe(true);
    expect(citacoes.some((citacao) => !citacao.fonte)).toBe(true);
  });

  it('vídeos do YouTube e do Instagram como o Studio grava', () => {
    const videos = blocos.filter((bloco) => bloco._type === 'video');
    expect(new Set(videos.map((video) => video.provedor))).toEqual(
      new Set(['youtube', 'instagram']),
    );
    for (const video of videos) {
      expect(videoDoLink(video.url)).toEqual({ provedor: video.provedor, idVideo: video.idVideo });
    }
  });
});
