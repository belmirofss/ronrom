import { describe, expect, it, vi } from 'vitest';
import { dadosDoCanal, itemDoFeed } from '@/lib/feed';
import type { CONSULTA_DO_FEED_RESULT } from '@/lib/sanity/tipos.gerados';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

const post: CONSULTA_DO_FEED_RESULT[number] = {
  tipo: 'review',
  slug: 'cafe-do-bairro',
  titulo: 'Café do bairro',
  subtitulo: 'Pão de queijo & café coado',
  dataDePublicacao: '2026-03-14T12:00:00-03:00',
  categoria: { nome: 'Restaurantes e cafés', slug: 'restaurantes-e-cafes' },
  formato: null,
  tags: [{ nome: 'Café' }, { nome: 'São Paulo' }],
  capa: {
    _type: 'image',
    alt: 'Xícara "grande" & pão',
    asset: {
      _id: 'image-f00-2400x1600-jpg',
      url: 'https://cdn.sanity.io/images/abc123/production/f00-2400x1600.jpg',
      largura: 2400,
      altura: 1600,
      lqip: null,
    },
  },
  corpo: null,
  seo: null,
};

describe('itemDoFeed', () => {
  it('monta o item com link canônico, data, categorias e description do post', () => {
    expect(itemDoFeed(post)).toMatchObject({
      title: 'Café do bairro',
      description: 'Pão de queijo & café coado',
      link: 'https://ronrom-blog.vercel.app/reviews/restaurantes-e-cafes/cafe-do-bairro',
      pubDate: new Date('2026-03-14T15:00:00Z'),
      categories: ['Review', 'Restaurantes e cafés', 'Café', 'São Paulo'],
    });
  });

  it('põe a capa em media:content, com a URL e o alt escapados para XML', () => {
    const { customData } = itemDoFeed(post);

    expect(customData).toMatch(
      /^<media:content url="https:\/\/cdn\.sanity\.io\/images\/abc123\/production\/f00-2400x1600\.jpg\?[^"]*&amp;[^"]*" medium="image" type="image\/jpeg" width="1200" height="630">/,
    );
    expect(customData).not.toMatch(/&(?!amp;|quot;|lt;|gt;)/);
    expect(customData).toContain(
      '<media:description>Xícara &quot;grande&quot; &amp; pão</media:description></media:content>',
    );
  });

  it('não emite a capa sem arquivo', () => {
    expect(itemDoFeed({ ...post, capa: { ...post.capa, asset: null } }).customData).toBeUndefined();
  });
});

describe('dadosDoCanal', () => {
  it('declara o idioma e o próprio feed', () => {
    expect(dadosDoCanal('https://ronrom-blog.vercel.app/rss.xml')).toBe(
      '<language>pt-br</language><atom:link href="https://ronrom-blog.vercel.app/rss.xml" rel="self" type="application/rss+xml"/>',
    );
  });
});
