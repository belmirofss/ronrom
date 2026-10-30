import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';

import { documentosDoSeed, IMAGENS, type Assets } from '../seed/conteudo';
import { problemasNaFicha, camposIgnorados, modeloDaFicha } from './ficha';
import { problemaNaQuantidadeDeImagens } from './galeria';
import { problemaNaNota } from './nota';
import { dataNoFuturo } from './post';
import {
  FILTRO_DO_RESET,
  numerarChaves,
  paragrafo,
  problemaNoDatasetDoSeed,
  type Documento,
} from './seed';
import { problemaNoSlug } from './slug';
import { CATEGORIAS, documentosDaTaxonomia, FORMATOS } from './taxonomia';
import { videoDesatualizado } from './video';

describe('problemaNoDatasetDoSeed', () => {
  it('aceita só o development', () => {
    expect(problemaNoDatasetDoSeed('development')).toBeUndefined();
  });

  it.each(['production', 'Development', '', undefined])('recusa %j', (dataset) => {
    expect(problemaNoDatasetDoSeed(dataset)).toMatch(/só grava no dataset "development"/);
  });
});

describe('FILTRO_DO_RESET', () => {
  it('pega os documentos seed-*, publicados e rascunhos, e nada mais', async () => {
    const dataset = [
      'seed-post-01',
      'drafts.seed-post-01',
      'seed-tag-cafe',
      'configuracoes',
      'sobre',
      'categoria-filmes',
      'post-seed-01',
      'drafts.post-de-verdade',
    ].map((_id) => ({ _id, _type: 'post' }));

    const resultado = await evaluate(parse(`*[${FILTRO_DO_RESET}]._id`), { dataset });
    expect(await resultado.get()).toEqual(['seed-post-01', 'drafts.seed-post-01', 'seed-tag-cafe']);
  });
});

describe('numerarChaves', () => {
  it('dá `_key` pela posição aos objetos de qualquer array, sem trocar as que existem', () => {
    const valor = {
      lista: [{ a: 1 }, { _key: 'fixa', b: [{ c: 1 }, { c: 2 }] }, 'texto'],
      objeto: { d: [{ e: 1 }] },
    };
    expect(numerarChaves(valor)).toEqual({
      lista: [
        { _key: 'k0', a: 1 },
        {
          _key: 'fixa',
          b: [
            { _key: 'k0', c: 1 },
            { _key: 'k1', c: 2 },
          ],
        },
        'texto',
      ],
      objeto: { d: [{ _key: 'k0', e: 1 }] },
    });
    expect(valor.lista[0]).toEqual({ a: 1 });
  });
});

describe('paragrafo', () => {
  it('liga cada link ao markDef dele', () => {
    const bloco = paragrafo(
      'Veja ',
      { texto: 'o site', link: 'https://exemplo.com', negrito: true },
      ' e ',
      { texto: 'o post', post: 'seed-post-02' },
    );
    expect(bloco.markDefs).toEqual([
      { _key: 'l0', _type: 'link', href: 'https://exemplo.com' },
      { _key: 'l1', _type: 'linkInterno', post: { _type: 'reference', _ref: 'seed-post-02' } },
    ]);
    expect(bloco.children.map((span) => span.marks)).toEqual([[], ['strong', 'l0'], [], ['l1']]);
  });
});

// O seed grava direto pela API, sem passar pela validação do Studio: estes testes conferem com as
// mesmas regras que o conteúdo de exemplo seria publicável.
describe('conteúdo do seed', () => {
  const assets = Object.fromEntries(
    IMAGENS.map((nome) => [nome, `image-${nome}-960x640-jpg`]),
  ) as Assets;
  const documentos = documentosDoSeed(assets);
  const todos: Documento[] = [...documentosDaTaxonomia(), ...documentos];
  const porId = new Map(todos.map((doc) => [doc._id, doc]));
  const posts = documentos.filter((doc) => doc._type === 'post');
  const reviews = posts.filter((doc) => doc.tipo === 'review');
  const pensamentos = posts.filter((doc) => doc.tipo === 'pensamento');

  // Todos os objetos dentro de qualquer valor do documento.
  function objetos(valor: unknown): Record<string, unknown>[] {
    if (Array.isArray(valor)) return valor.flatMap(objetos);
    if (valor && typeof valor === 'object') {
      return [valor as Record<string, unknown>, ...Object.values(valor).flatMap(objetos)];
    }
    return [];
  }

  const corpo = (doc: Documento) => (doc.corpo ?? []) as Record<string, unknown>[];

  it('tem uns 12 posts, todos com `_id` seed-*, sem repetir `_id` nem slug', () => {
    expect(posts.length).toBeGreaterThanOrEqual(12);
    expect(new Set(todos.map((doc) => doc._id)).size).toBe(todos.length);
    for (const doc of documentos) {
      if (doc._type === 'configuracoes' || doc._type === 'sobre') expect(doc._id).toBe(doc._type);
      else expect(doc._id).toMatch(/^seed-/);
    }
    const slugs = posts.map((doc) => (doc.slug as { current: string }).current);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('tem uma review por categoria e um pensamento por formato', () => {
    const categorias = reviews.map((doc) => (doc.categoria as { _ref: string })._ref);
    const formatos = pensamentos.map((doc) => (doc.formato as { _ref: string })._ref);
    for (const { _id } of CATEGORIAS) expect(categorias).toContain(_id);
    for (const { _id } of FORMATOS) expect(formatos).toContain(_id);
  });

  it('tem os casos de borda: frase curta, texto longo, post sem subtítulo', () => {
    expect(pensamentos.some((doc) => (doc.titulo as string).length <= 20)).toBe(true);
    expect(posts.some((doc) => !doc.subtitulo)).toBe(true);

    const palavras = (doc: Documento) =>
      objetos(corpo(doc))
        .filter((obj) => obj._type === 'span')
        .map((span) => span.text as string)
        .join(' ')
        .split(/\s+/).length;
    expect(Math.max(...posts.map(palavras))).toBeGreaterThan(800);
  });

  it('tem um post com todos os blocos do texto', () => {
    const completo = posts.find((doc) => {
      const blocos = corpo(doc);
      const tipos = new Set(blocos.map((bloco) => bloco._type));
      const provedores = new Set(blocos.map((bloco) => bloco.provedor));
      const listas = new Set(blocos.map((bloco) => bloco.listItem));
      const marcas = new Set(objetos(blocos).map((obj) => obj._type));
      return (
        ['imagem', 'galeria', 'video', 'citacaoDestaque'].every((tipo) => tipos.has(tipo)) &&
        provedores.has('youtube') &&
        provedores.has('instagram') &&
        listas.has('bullet') &&
        listas.has('number') &&
        marcas.has('link') &&
        marcas.has('linkInterno') &&
        blocos.some((bloco) => bloco.style === 'blockquote')
      );
    });
    expect(completo).toBeDefined();
  });

  it.each(posts.map((doc) => [doc.titulo, doc]))('"%s" passa nas regras do post', (_, doc) => {
    expect(problemaNoSlug((doc.slug as { current: string }).current)).toBeUndefined();
    expect(problemaNaNota(doc.tipo, doc.nota as number | undefined)).toBeUndefined();
    expect(dataNoFuturo(doc.dataDePublicacao as string)).toBe(false);
    expect((doc.capa as { alt?: string }).alt).toBeTruthy();

    if (doc.tipo === 'review') {
      const categoria = porId.get((doc.categoria as { _ref: string })._ref);
      const modelo = modeloDaFicha(categoria?.modeloFicha);
      expect(modelo).toBeDefined();
      if (!modelo) return;
      expect(problemasNaFicha(doc.ficha, modelo)).toEqual([]);
      expect(camposIgnorados(doc.ficha, modelo)).toEqual([]);
    } else {
      expect(doc.ficha).toBeUndefined();
    }

    for (const bloco of corpo(doc)) {
      if (bloco._type === 'video') expect(videoDesatualizado(bloco)).toBe(false);
      if (bloco._type === 'galeria') {
        expect(problemaNaQuantidadeDeImagens((bloco.imagens as unknown[]).length)).toBeNull();
      }
    }
  });

  it('não deixa referência para documento fora do seed nem imagem sem asset', () => {
    const asIds = new Set(Object.values(assets));
    for (const obj of objetos(documentos)) {
      if (obj._type !== 'reference') continue;
      const ref = obj._ref as string;
      expect(porId.has(ref) || asIds.has(ref), ref).toBe(true);
    }
    for (const obj of objetos(documentos)) {
      if (obj._type === 'image' || obj._type === 'imagem') {
        expect(obj.alt, JSON.stringify(obj)).toBeTruthy();
      }
    }
  });

  it('dá `_key` a todo objeto dentro de array', () => {
    const semChave = (valor: unknown): boolean => {
      if (Array.isArray(valor)) {
        return valor.some(
          (item) => (item && typeof item === 'object' && !('_key' in item)) || semChave(item),
        );
      }
      return Boolean(valor && typeof valor === 'object' && Object.values(valor).some(semChave));
    };
    expect(semChave(documentos)).toBe(false);
  });

  it('preenche as configurações e o sobre', () => {
    const configuracoes = porId.get('configuracoes');
    const sobre = porId.get('sobre');
    expect((configuracoes?.fraseDaSemana as { texto?: string }).texto).toBeTruthy();
    expect((configuracoes?.postEmDestaque as { _ref: string })._ref).toMatch(/^seed-post-/);
    expect((sobre?.bio as string).length).toBeLessThanOrEqual(200);
    expect(sobre?.texto).not.toHaveLength(0);
  });

  it('dá a mesma saída a cada execução', () => {
    expect(documentosDoSeed(assets)).toEqual(documentos);
  });
});
