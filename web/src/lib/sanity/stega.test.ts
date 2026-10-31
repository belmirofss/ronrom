import type { StegaConfig } from '@sanity/client';
import { describe, expect, it, vi } from 'vitest';

import { filtroDoStega } from './stega';

type Props = Parameters<NonNullable<StegaConfig['filter']>>[0];

// O filtro recebe o caminho do valor no documento de origem; o resto do contexto não importa aqui.
function marca(sourcePath: Props['sourcePath'], filterDefault: () => boolean = () => true) {
  return filtroDoStega({
    sourcePath,
    resultPath: sourcePath,
    sourceDocument: { _id: 'post-1', _type: 'post' },
    value: 'texto',
    filterDefault: vi.fn(filterDefault),
  } as Props);
}

describe('filtroDoStega', () => {
  it.each([
    [['titulo']],
    [['subtitulo']],
    [['corpo', { _key: 'b1', _index: 0 }, 'children', { _key: 's1', _index: 0 }, 'text']],
    [['capa', 'legenda']],
    [['ficha', 'direcao']],
    [['fraseDaSemana', 'texto']],
  ] as Props['sourcePath'][][])('marca o texto corrido em %j', (caminho) => {
    expect(marca(caminho)).toBe(true);
  });

  it.each([
    [['tipo']],
    [['ficha', 'modelo']],
    [['ficha', 'endereco', 'uf']],
    [['corpo', { _key: 'v1', _index: 2 }, 'provedor']],
    [['corpo', { _key: 'i1', _index: 3 }, 'largura']],
    [['redes', { _key: 'r1', _index: 0 }, 'rede']],
    [['capa', 'alt']],
    [['slug', 'current']],
  ] as Props['sourcePath'][][])(
    'não marca o valor que o site compara ou lê em voz alta: %j',
    (caminho) => {
      expect(marca(caminho)).toBe(false);
    },
  );

  it('respeita o filtro padrão do @sanity/client (o título do SEO, por exemplo)', () => {
    expect(marca(['seo', 'titulo'], () => false)).toBe(false);
  });
});
