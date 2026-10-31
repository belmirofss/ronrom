import { describe, expect, it, vi } from 'vitest';
import { buscarSobre } from '@/lib/sanity/conteudo';
import type { CONSULTA_DO_SOBRE_RESULT } from '@/lib/sanity/tipos.gerados';
import { altDaFoto, seoDoSobre, sobreTemTexto, textoDoSobre } from '@/lib/sobre';
import { DESCRICAO_DO_SITE } from '@/lib/utils/site';

vi.mock('astro:env/server', () => ({
  SANITY_FIXTURES: true,
  SANITY_PROJECT_ID: undefined,
  SANITY_DATASET: undefined,
  SANITY_API_VERSION: '2025-02-19',
  STUDIO_URL: 'https://ronrom.sanity.studio',
  PUBLIC_SANITY_VISUAL_EDITING_ENABLED: false,
}));
vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom.blog' }));

// O documento preenchido, como nas fixtures: com nome, bio, foto e texto.
type Sobre = Extract<NonNullable<CONSULTA_DO_SOBRE_RESULT>, { bio: string }>;

const sobreDasFixtures = async (): Promise<Sobre> => {
  const sobre = await buscarSobre();
  if (!sobre?.bio) throw new Error('As fixtures precisam do documento "sobre".');
  return sobre;
};

describe('sobreTemTexto', () => {
  it('é verdadeiro com o texto das fixtures', async () => {
    expect(sobreTemTexto(await sobreDasFixtures())).toBe(true);
  });

  it('é falso sem o documento', () => {
    expect(sobreTemTexto(null)).toBe(false);
    expect(textoDoSobre(null)).toEqual([]);
  });

  it('é falso com o texto só de blocos vazios', async () => {
    const sobre = await sobreDasFixtures();
    const vazio = sobre.texto.map((bloco) => ({
      ...bloco,
      children: (bloco.children ?? []).map((span) => ({ ...span, text: '  ' })),
    }));
    expect(sobreTemTexto({ ...sobre, texto: vazio })).toBe(false);
  });
});

describe('altDaFoto', () => {
  it('usa o alt do Studio', async () => {
    expect(altDaFoto(await sobreDasFixtures())).toBe(
      'Retrato desenhado da autora com um gato no colo',
    );
  });

  it('cai em "Foto de {nome}" sem alt', async () => {
    const sobre = await sobreDasFixtures();
    expect(altDaFoto({ ...sobre, foto: { ...sobre.foto, alt: ' ' } })).toBe('Foto de Ana Ronrom');
  });
});

describe('seoDoSobre', () => {
  it('usa a description e a imagem do SEO', async () => {
    const sobre = await sobreDasFixtures();
    const seo = seoDoSobre(sobre);
    expect(seo).toMatchObject({
      title: 'Sobre mim',
      canonical: '/sobre',
      description: 'Quem escreve o Ronrom e por quê.',
    });
    expect(seo.image).toBe(sobre.seo?.imagem);
    expect(seo.imageAlt).toBeUndefined();
  });

  it('cai na bio e na foto com o SEO vazio', async () => {
    const sobre = await sobreDasFixtures();
    const seo = seoDoSobre({ ...sobre, seo: null });
    expect(seo.description).toBe(sobre.bio);
    expect(seo.image).toBe(sobre.foto);
    expect(seo.imageAlt).toBe('Retrato desenhado da autora com um gato no colo');
  });

  it('cai no padrão do site sem o documento', () => {
    expect(seoDoSobre(null)).toEqual({
      title: 'Sobre mim',
      description: DESCRICAO_DO_SITE,
      canonical: '/sobre',
      image: null,
      imageAlt: undefined,
    });
  });
});
