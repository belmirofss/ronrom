import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import CorpoDoPost from '@/components/post/CorpoDoPost.astro';
import type { Corpo } from '@/lib/corpo';
import { buscarPost } from '@/lib/sanity/conteudo';

// O artigo das fixtures com todos os blocos do Portable Text (lib/sanity/README.md#modo-fixtures).
vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: true,
  SANITY_PROJECT_ID: undefined,
  SANITY_DATASET: undefined,
  SANITY_API_VERSION: '2025-02-19',
}));
vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));

async function renderizar(corpo: Corpo): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(CorpoDoPost, { props: { corpo } });
}

const contar = (html: string, trecho: RegExp) => html.match(trecho)?.length ?? 0;

describe('<CorpoDoPost>', () => {
  let html: string;

  beforeAll(async () => {
    const post = await buscarPost({
      tipo: 'pensamento',
      secao: 'artigos',
      slug: 'por-que-eu-anoto-tudo-num-caderno',
    });
    html = await renderizar(post?.corpo ?? []);
  });

  it('usa só elementos semânticos, sem <div> além do invólucro', () => {
    expect(contar(html, /<div/g)).toBe(1);
    for (const tag of ['<p', '<h2', '<h3', '<ul', '<ol', '<blockquote', '<figure', '<figcaption']) {
      expect(html, tag).toContain(tag);
    }
  });

  it('dá âncora a todo subtítulo, sem h1 e sem pular nível', () => {
    expect(html).not.toContain('<h1');
    const subtitulos = [...html.matchAll(/<(h[2-6])\b[^>]*>/g)].map(([abertura, nivel]) => ({
      nivel,
      id: /\bid="([^"]+)"/.exec(abertura)?.[1],
    }));
    expect(subtitulos.map(({ nivel }) => nivel)).toEqual(['h2', 'h3', 'h3', 'h2']);
    expect(subtitulos[0]?.id).toBe('o-papel-lembra-por-mim');
    for (const { id } of subtitulos) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('aninha a lista de subnível dentro do item', () => {
    expect(html).toMatch(/<li[^>]*>\s*Listas\s*<ul/);
  });

  it('marca o link externo com rel e resolve o link interno, ou deixa só o texto fora do ar', () => {
    expect(html).toMatch(
      /<a href="https:\/\/www\.example\.com\/estudo-escrita-a-mao" rel="noopener noreferrer"/,
    );
    expect(html).toMatch(/<a href="mailto:contato@example\.com" rel="noopener noreferrer"/);
    expect(html).toMatch(/<a href="\/reviews\/filmes\/dias-perfeitos"[^>]*>\s*Dias Perfeitos/);
    expect(html).toContain('texto que já saiu do ar');
    expect(html).not.toMatch(/<a[^>]*>\s*texto que já saiu do ar/);
  });

  it('carrega toda imagem do texto só perto da viewport, sempre com alt', () => {
    const imagens = html.match(/<img\b[^>]*>/g) ?? [];
    expect(imagens.length).toBeGreaterThanOrEqual(4);
    for (const imagem of imagens) {
      expect(imagem).toContain('loading="lazy"');
      expect(imagem).toMatch(/\balt="[^"]+"/);
    }
  });

  it('mostra a citação em destaque com as aspas escondidas do leitor de tela', () => {
    expect(html).toMatch(/<span class="citacao-destaque__aspas[^"]*"[^>]*aria-hidden="true"/);
    expect(html).toContain('Eu mesma, numa terça-feira');
  });

  it('mostra o vídeo e o post do Instagram como fachada, sem carregar nada deles antes do clique', () => {
    expect(html).not.toContain('<iframe');
    expect(html).not.toMatch(/\bsrc="https?:\/\/(?:[\w-]+\.)*(?:youtube|instagram)\.com/);
    expect(html).toContain('src="https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg"');
    // Sem JS, as duas fachadas são links para o original.
    expect(html).toMatch(
      /<a class="video-youtube__quadro[^"]*" href="https:\/\/www\.youtube\.com\/watch\?v=jNQXAC9IVRw"/,
    );
    expect(html).toContain(
      'data-player="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw?autoplay=1"',
    );
    expect(html).toContain('data-rotulo="Reproduzir vídeo: O primeiro vídeo do YouTube, de 2005."');
    expect(html).toMatch(
      /<a[^>]*href="https:\/\/www\.instagram\.com\/p\/RonromFixture1\/"[^>]*>\s*Ver post no Instagram/,
    );
    expect(html).toMatch(/<button[^>]*hidden[^>]*>\s*Carregar post aqui/);
  });

  it('ignora um tipo de bloco desconhecido sem quebrar', async () => {
    const corpo = [{ _type: 'enquete', _key: 'x1', pergunta: 'Café ou chá?' }] as unknown as Corpo;
    const vazio = await renderizar(corpo);
    expect(vazio).not.toContain('Café ou chá?');
    expect(vazio).not.toContain('data-portabletext-unknown');
  });
});
