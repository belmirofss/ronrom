import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it, vi } from 'vitest';
import FichaDaReview from '@/components/post/FichaDaReview.astro';
import { buscarPost, type TipoDePost } from '@/lib/sanity/conteudo';

// As reviews das fixtures: uma por modelo de ficha, e o Mirante com campos vazios.
vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: true,
  SANITY_PROJECT_ID: undefined,
  SANITY_DATASET: undefined,
  SANITY_API_VERSION: '2025-02-19',
  STUDIO_URL: 'https://ronrom.sanity.studio',
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: false,
}));

async function renderizar(tipo: TipoDePost, secao: string, slug: string) {
  const post = await buscarPost({ tipo, secao, slug });
  if (!post) throw new Error(`Fixture ${secao}/${slug} não encontrada.`);
  const container = await AstroContainer.create();
  return container.renderToString(FichaDaReview, { props: { post } });
}

// Os pares rótulo/valor do HTML, sem as tags de dentro do <dd> (links).
function campos(html: string): [string, string][] {
  return [...html.matchAll(/<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/gs)].map(([, dt, dd]) => [
    (dt ?? '').trim(),
    (dd ?? '').replace(/<[^>]+>/g, '').trim(),
  ]);
}

function contar(html: string, trecho: string) {
  return html.split(trecho).length - 1;
}

describe('<FichaDaReview>', () => {
  it.each([
    {
      modelo: 'filme',
      secao: 'filmes',
      slug: 'dias-perfeitos',
      esperado: [
        ['Direção', 'Wim Wenders'],
        ['Ano', '2023'],
        ['Duração', '124 min'],
        ['Onde vi', 'Cinema · Cine Belas Artes'],
        ['Vale a pena?', 'Para ver num dia sem pressa, de preferência no cinema.'],
      ],
    },
    {
      modelo: 'série',
      secao: 'series',
      slug: 'a-casa-do-farol',
      esperado: [
        ['Criação', 'Marta Albuquerque'],
        ['Estreia', '2022'],
        ['Fim', '2025'],
        ['Temporadas vistas', 'As três'],
        ['Onde vi', 'Streaming · Farol+'],
        ['Vale a pena?', 'Sim, mas a segunda temporada pede paciência.'],
      ],
    },
    {
      modelo: 'livro',
      secao: 'livros',
      slug: 'o-inverno-das-laranjeiras',
      esperado: [
        ['Autor(a)', 'Helena Prado'],
        ['Editora', 'Editora Ventania'],
        ['Ano', '2024'],
        ['Páginas', '212'],
        ['Formato', 'Físico'],
        ['Vale a pena?', 'Vale pela segunda metade, que compensa o começo lento.'],
      ],
    },
    {
      modelo: 'lugar',
      secao: 'restaurantes-e-cafes',
      slug: 'cafe-do-bairro',
      esperado: [
        ['Endereço', 'Rua das Acácias, 120 · Vila Mariana · São Paulo/SP'],
        ['Faixa de preço', 'R$$'],
        ['Cozinha', 'Cafeteria'],
        ['O que pedi', 'Coado do dia, pão de fermentação natural com manteiga e bolo de laranja.'],
        ['Instagram', '@cafedobairro'],
        ['Vale a pena?', 'Muito. Vá de manhã, antes das dez, para pegar a mesa da janela.'],
      ],
    },
    {
      modelo: 'filme, num documentário',
      secao: 'documentarios',
      slug: 'vozes-da-represa',
      esperado: [
        ['Direção', 'Lia Monteiro'],
        ['Ano', '2021'],
        ['Duração', '92 min'],
        ['Onde vi', 'Streaming · Farol+'],
        ['Vale a pena?', 'Pelos depoimentos, sim; pela montagem, nem tanto.'],
      ],
    },
  ])(
    'mostra os rótulos do modelo $modelo, na ordem do Studio',
    async ({ secao, slug, esperado }) => {
      const html = await renderizar('review', secao, slug);

      expect(campos(html)).toEqual(esperado);
    },
  );

  it('esconde os campos vazios, sem <dt> nem <dd> sobrando', async () => {
    // Lugar sem tipo de cozinha nem Instagram, e com endereço sem bairro.
    const html = await renderizar('review', 'lugares', 'mirante-do-morro-azul');

    expect(campos(html).map(([rotulo]) => rotulo)).toEqual([
      'Endereço',
      'Faixa de preço',
      'O que pedi',
      'Vale a pena?',
    ]);
    expect(contar(html, '<dt')).toBe(4);
    expect(contar(html, '<dd')).toBe(4);
    expect(html).toContain('Estrada do Morro Azul, km 4 · Campos do Jordão/SP');
  });

  it('linka o endereço ao mapa e o Instagram ao perfil', async () => {
    const html = await renderizar('review', 'restaurantes-e-cafes', 'cafe-do-bairro');

    expect(html).toContain('href="https://maps.google.com/?q=Rua+das+Acacias+120+Sao+Paulo"');
    expect(html).toContain('href="https://www.instagram.com/cafedobairro/"');
  });

  it('mostra a nota em corações', async () => {
    const html = await renderizar('review', 'filmes', 'dias-perfeitos');

    expect(contar(html, 'role="img"')).toBe(1);
    expect(html).toContain('aria-label="Nota: 4,5 de 5 corações"');
  });

  it('não renderiza nada em pensamento', async () => {
    const html = await renderizar('pensamento', 'textos', 'cronica-de-uma-terca-feira');

    expect(html.trim()).toBe('');
  });
});
