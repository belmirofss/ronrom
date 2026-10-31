import { describe, expect, it, vi } from 'vitest';
import type { CONSULTA_DO_SITEMAP_RESULT } from '@/lib/sanity/tipos.gerados';
import { PRIVACIDADE_ATUALIZADA_EM } from '@/lib/privacidade';
import { dadosDoSitemap } from '@/lib/sitemap';

vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

type Post = CONSULTA_DO_SITEMAP_RESULT['posts'][number];

const review = (slug: string, atualizado: string, extra: Partial<Post> = {}): Post => ({
  tipo: 'review',
  slug,
  categoria: { slug: 'filmes' },
  formato: null,
  _updatedAt: atualizado,
  dataDePublicacao: '2026-01-01T12:00:00Z',
  noindex: false,
  lugar: false,
  ...extra,
});

const pensamento = (slug: string, atualizado: string): Post => ({
  ...review(slug, atualizado),
  tipo: 'pensamento',
  categoria: null,
  formato: { slug: 'frases' },
});

const vazio: CONSULTA_DO_SITEMAP_RESULT = {
  posts: [],
  categorias: [],
  formatos: [],
  sobre: null,
  configuracoes: null,
};

describe('dadosDoSitemap', () => {
  it('dá ao post a última edição e marca o noindex', () => {
    const { lastmod, noindex } = dadosDoSitemap({
      ...vazio,
      posts: [
        review('dias-perfeitos', '2026-03-20T10:00:00Z'),
        pensamento('sobre-gatos', '2026-02-01T10:00:00Z'),
        review('antigo', '2026-01-02T10:00:00Z', { noindex: true }),
      ],
    });

    expect(lastmod['/reviews/filmes/dias-perfeitos']).toBe('2026-03-20T10:00:00.000Z');
    expect(lastmod['/pensamentos/frases/sobre-gatos']).toBe('2026-02-01T10:00:00.000Z');
    expect(noindex).toEqual(['/reviews/filmes/antigo']);
  });

  it('usa a data de publicação quando o post entrou no ar depois da última edição', () => {
    const agendado = review('agendado', '2026-01-01T10:00:00Z', {
      dataDePublicacao: '2026-04-01T09:00:00-03:00',
    });

    expect(
      dadosDoSitemap({ ...vazio, posts: [agendado] }).lastmod['/reviews/filmes/agendado'],
    ).toBe('2026-04-01T12:00:00.000Z');
  });

  it('dá a cada página de listagem o post mais recente até ela', () => {
    // 13 reviews: a 1ª (a mais recente na listagem) foi editada por último; a 13ª, na página 2,
    // tem a data mais antiga, mas a página 2 também muda quando a 1ª empurra as outras.
    const posts = Array.from({ length: 13 }, (_, i) =>
      review(`post-${i + 1}`, `2026-01-${String(20 - i).padStart(2, '0')}T00:00:00Z`),
    );
    const { lastmod } = dadosDoSitemap({ ...vazio, posts });

    expect(lastmod['/reviews']).toBe('2026-01-20T00:00:00.000Z');
    expect(lastmod['/reviews/pagina/2']).toBe('2026-01-20T00:00:00.000Z');
    expect(lastmod['/posts/pagina/2']).toBe('2026-01-20T00:00:00.000Z');
    expect(lastmod['/reviews/pagina/3']).toBeUndefined();
    // Sem pensamento, a listagem fica com a data da home.
    expect(lastmod['/pensamentos']).toBe('2026-01-20T00:00:00.000Z');
    expect(lastmod['/sobre']).toBe('2026-01-20T00:00:00.000Z');
  });

  it('cobre categoria e formato, inclusive a categoria sem post', () => {
    const { lastmod } = dadosDoSitemap({
      ...vazio,
      posts: [review('dias-perfeitos', '2026-03-20T10:00:00Z')],
      categorias: [
        { slug: 'filmes', _updatedAt: '2026-01-01T00:00:00Z' },
        { slug: 'livros', _updatedAt: '2026-02-01T00:00:00Z' },
      ],
      formatos: [{ slug: 'frases', _updatedAt: '2026-05-01T00:00:00Z' }],
    });

    expect(lastmod['/reviews/filmes']).toBe('2026-03-20T10:00:00.000Z');
    expect(lastmod['/reviews/livros']).toBe('2026-02-01T00:00:00.000Z');
    // A descrição do formato mudou depois do último post.
    expect(lastmod['/pensamentos/frases']).toBe('2026-05-01T00:00:00.000Z');
  });

  it('dá à home a data mais recente de tudo e ao Sobre a do próprio documento', () => {
    const { lastmod } = dadosDoSitemap({
      ...vazio,
      posts: [review('dias-perfeitos', '2026-03-20T10:00:00Z')],
      configuracoes: '2026-06-01T00:00:00Z',
      sobre: '2026-02-02T00:00:00Z',
    });

    expect(lastmod['/']).toBe('2026-06-01T00:00:00.000Z');
    expect(lastmod['/sobre']).toBe('2026-02-02T00:00:00.000Z');
  });

  it('dá ao mapa o post de lugar mais recente, ou a home sem nenhum', () => {
    const dados = {
      ...vazio,
      posts: [
        review('filme-novo', '2026-03-01T00:00:00Z'),
        review('cafe', '2026-02-01T00:00:00Z', { categoria: { slug: 'lugares' }, lugar: true }),
      ],
    };
    expect(dadosDoSitemap(dados).lastmod['/mapa']).toBe('2026-02-01T00:00:00.000Z');
    expect(dadosDoSitemap({ ...dados, posts: [dados.posts[0]!] }).lastmod['/mapa']).toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });

  it('dá à privacidade a última mudança no texto ou no Sobre', () => {
    expect(dadosDoSitemap(vazio).lastmod['/privacidade']).toBe(
      new Date(PRIVACIDADE_ATUALIZADA_EM).toISOString(),
    );
    const depois = '2099-01-01T00:00:00.000Z';
    expect(dadosDoSitemap({ ...vazio, sobre: depois }).lastmod['/privacidade']).toBe(depois);
  });
});
