import { describe, expect, it, vi } from 'vitest';
import { ogImage } from '@/lib/sanity/imagem';
import {
  descricaoDoPost,
  imagemDeCompartilhamento,
  resumir,
  robotsDaPagina,
  robotsTxt,
  seoDoPost,
} from '@/lib/seo';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

const URL_DO_ASSET = 'https://cdn.sanity.io/images/abc123/production/f00-2400x1600.jpg';

// Capa 2400×1600 com o hotspot no canto superior esquerdo.
const capa = {
  _type: 'image' as const,
  alt: 'Hirayama no banheiro público',
  asset: {
    _id: 'image-f00-2400x1600-jpg',
    url: URL_DO_ASSET,
    largura: 2400,
    altura: 1600,
    lqip: null,
  },
  hotspot: { _type: 'sanity.imageHotspot' as const, x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
};

const bloco = (texto: string, style: 'normal' | 'h2' = 'normal') => ({
  _type: 'block' as const,
  _key: texto.slice(0, 8),
  style,
  markDefs: [],
  children: [{ _type: 'span' as const, _key: 's', text: texto }],
});

const post = {
  tipo: 'review' as const,
  titulo: 'Dias Perfeitos',
  subtitulo: 'Wim Wenders e a rotina de um limpador de banheiros em Tóquio',
  dataDePublicacao: '2026-03-14T12:00:00-03:00',
  _updatedAt: '2026-03-20T10:00:00Z',
  categoria: { nome: 'Filmes', slug: 'filmes', modeloFicha: 'filme' as const },
  formato: null,
  capa,
  corpo: [bloco('Um filme sobre o agora.')],
  seo: null,
};

describe('resumir', () => {
  it('devolve o texto inteiro dentro do limite', () => {
    expect(resumir('  Um   texto\ncurto. ')).toBe('Um texto curto.');
  });

  it('corta sem quebrar palavra e fecha com reticências', () => {
    const texto = 'palavra '.repeat(40);
    const resumo = resumir(texto);

    expect(resumo.length).toBeLessThanOrEqual(155);
    expect(resumo).toMatch(/ palavra…$/);
  });

  it('não deixa pontuação antes das reticências', () => {
    expect(resumir('Um, dois, três, quatro', 11)).toBe('Um, dois…');
  });

  it('corta uma palavra maior que o limite inteiro', () => {
    expect(resumir('a'.repeat(20), 10)).toBe(`${'a'.repeat(9)}…`);
  });
});

describe('descricaoDoPost', () => {
  it('prefere a descrição do SEO', () => {
    const seo = { titulo: null, descricao: 'Do SEO.', noindex: null, imagem: null };
    expect(descricaoDoPost({ ...post, seo })).toBe('Do SEO.');
  });

  it('usa o subtítulo sem descrição no SEO', () => {
    expect(descricaoDoPost(post)).toBe(post.subtitulo);
  });

  it('usa o começo do corpo sem subtítulo, sem os subtítulos do texto', () => {
    const corpo = [bloco('Introdução', 'h2'), bloco('Primeiro parágrafo.'), bloco('Segundo.')];
    expect(descricaoDoPost({ ...post, subtitulo: null, corpo })).toBe(
      'Primeiro parágrafo. Segundo.',
    );
  });

  it('cai na descrição do site com o corpo sem texto', () => {
    expect(descricaoDoPost({ ...post, subtitulo: '  ', corpo: [] })).toMatch(/^Reviews de filmes/);
  });
});

describe('seoDoPost', () => {
  it('monta os metadados do artigo a partir do post', () => {
    expect(seoDoPost(post, '/reviews/filmes/dias-perfeitos')).toEqual({
      title: 'Dias Perfeitos',
      description: post.subtitulo,
      canonical: '/reviews/filmes/dias-perfeitos',
      image: capa,
      type: 'article',
      noindex: false,
      publishedTime: '2026-03-14T12:00:00-03:00',
      modifiedTime: '2026-03-20T10:00:00Z',
      section: 'Filmes',
    });
  });

  it('usa o título, a imagem e o noindex do SEO quando preenchidos', () => {
    const imagem = { ...capa, alt: 'Outra' };
    const seo = { titulo: 'Dias Perfeitos (2023)', descricao: null, noindex: true, imagem };
    const metadados = seoDoPost({ ...post, seo }, '/x');

    expect(metadados).toMatchObject({ title: 'Dias Perfeitos (2023)', noindex: true });
    expect(metadados.image).toBe(imagem);
  });

  it('volta para a capa quando a imagem do SEO perdeu o arquivo', () => {
    const seo = { titulo: null, descricao: null, noindex: null, imagem: { ...capa, asset: null } };
    expect(seoDoPost({ ...post, seo }, '/x').image).toBe(capa);
  });

  it('usa o formato como seção do pensamento', () => {
    const pensamento = {
      ...post,
      tipo: 'pensamento' as const,
      categoria: null,
      formato: { nome: 'Frases soltas', slug: 'frases' },
    };
    expect(seoDoPost(pensamento, '/x').section).toBe('Frases soltas');
  });
});

describe('ogImage', () => {
  it('recorta em 1200×630 no hotspot, em JPG', () => {
    const url = new URL(ogImage(capa) ?? '');

    expect(`${url.origin}${url.pathname}`).toBe(URL_DO_ASSET);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      w: '1200',
      h: '630',
      fit: 'crop',
      fm: 'jpg',
      q: '80',
    });
    // Recorte 2400×1260 (a proporção 1200:630) encostado no topo, por causa do hotspot.
    expect(url.searchParams.get('rect')).toBe('0,0,2400,1260');
  });

  it('devolve null sem asset ou fora do CDN do Sanity', () => {
    expect(ogImage({ ...capa, asset: null })).toBeNull();
    expect(ogImage({ asset: { _id: 'x', url: 'https://exemplo.com/x.jpg' } })).toBeNull();
  });
});

describe('imagemDeCompartilhamento', () => {
  it('usa a imagem padrão do site sem imagem', () => {
    expect(imagemDeCompartilhamento(undefined, undefined, 'Sobre')).toEqual({
      url: 'https://ronrom-blog.vercel.app/og-padrao.jpg',
      largura: 1200,
      altura: 630,
      alt: expect.stringContaining('gato'),
    });
  });

  it('prefere o alt passado, depois o da imagem, depois o título', () => {
    expect(imagemDeCompartilhamento(capa, 'Alt da página', 'Título').alt).toBe('Alt da página');
    expect(imagemDeCompartilhamento(capa, undefined, 'Título').alt).toBe(capa.alt);
    expect(imagemDeCompartilhamento({ ...capa, alt: '' }, undefined, 'Título').alt).toBe('Título');
  });
});

describe('robotsDaPagina', () => {
  it('em produção, segue a prop noindex', () => {
    expect(robotsDaPagina(false, true)).toBe('index,follow,max-image-preview:large');
    expect(robotsDaPagina(true, true)).toBe('noindex,follow');
  });

  it('fora de produção, bloqueia toda página', () => {
    expect(robotsDaPagina(false, false)).toBe('noindex,nofollow');
    expect(robotsDaPagina(true, false)).toBe('noindex,nofollow');
  });
});

describe('robotsTxt', () => {
  const sitemap = 'https://ronrom-blog.vercel.app/sitemap-index.xml';

  it('em produção, libera tudo e aponta o sitemap', () => {
    expect(robotsTxt(true, sitemap)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`);
  });

  it('fora de produção, bloqueia tudo e não anuncia o sitemap', () => {
    expect(robotsTxt(false, sitemap)).toBe('User-agent: *\nDisallow: /\n');
  });
});
