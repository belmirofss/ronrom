import { urlDoPost } from '@/lib/rotas';
import type { Metadados } from '@/lib/seo';
import type { CONSULTA_DOS_LUGARES_RESULT } from '@/lib/sanity/tipos.gerados';

// Regras da página /mapa (#136): os lugares com review agrupados por cidade, para a lista, e os
// pontos do mapa, só dos que têm `localizacao` na ficha. A lista é o caminho principal: mostra
// todos os lugares, funciona sem JS e com leitor de tela. O mapa (src/lib/mapa-cliente.ts) só
// carrega quando a pessoa pede, e não acrescenta nada que a lista não tenha.

export const CAMINHO_DO_MAPA = '/mapa';

/** O h1 da página, o título da aba e o link do rodapé. */
export const TITULO_DO_MAPA = 'Mapa dos lugares';

export const DESCRICAO_DO_MAPA =
  'Os restaurantes, cafés e lugares que já ganharam review no Ronrom, num mapa e numa lista por cidade.';

type Lugar = CONSULTA_DOS_LUGARES_RESULT[number];

export interface LugarDaLista {
  id: string;
  titulo: string;
  url: string;
  /** "Restaurantes e cafés", "Lugares". */
  categoria: string | undefined;
  bairro: string | undefined;
  nota: number | null;
  /** Se o lugar também aparece no mapa. */
  noMapa: boolean;
}

export interface CidadeDaLista {
  /** "São Paulo/SP", como na ficha da review. */
  nome: string;
  lugares: LugarDaLista[];
}

export interface PontoDoMapa {
  titulo: string;
  url: string;
  categoria: string | undefined;
  lat: number;
  lng: number;
}

// Lugar sem cidade não passa na validação do Studio, mas pode vir de outro lugar (a API).
export const SEM_CIDADE = 'Outros lugares';

const ORDEM = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

function texto(valor: string | null | undefined): string | undefined {
  return valor?.trim() || undefined;
}

/** "São Paulo/SP", só a cidade ou só o estado. */
export function nomeDaCidade(endereco: Lugar['endereco']): string {
  return [texto(endereco?.cidade), texto(endereco?.uf)].filter(Boolean).join('/') || SEM_CIDADE;
}

/**
 * A latitude e a longitude do lugar, se as duas são números dentro do globo. O geopoint do Studio
 * já confere isso; fora dele, um ponto pela metade ou fora do mapa fica só na lista.
 */
export function coordenadas(lugar: {
  localizacao?: { lat?: number | null; lng?: number | null } | null;
}) {
  const lat = lugar.localizacao?.lat;
  const lng = lugar.localizacao?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

/**
 * Os lugares agrupados por cidade, em ordem alfabética (pt-BR, sem diferenciar acento), com
 * "Outros lugares" no fim. Dentro de cada cidade, os lugares mantêm a ordem da consulta (pelo
 * título).
 */
export function lugaresPorCidade(lugares: CONSULTA_DOS_LUGARES_RESULT): CidadeDaLista[] {
  const cidades = new Map<string, LugarDaLista[]>();
  for (const lugar of lugares) {
    const nome = nomeDaCidade(lugar.endereco);
    const lista = cidades.get(nome) ?? [];
    lista.push({
      id: lugar._id,
      titulo: lugar.titulo,
      url: urlDoPost(lugar),
      categoria: texto(lugar.categoria?.nome),
      bairro: texto(lugar.endereco?.bairro),
      nota: lugar.nota,
      noMapa: coordenadas(lugar) !== undefined,
    });
    cidades.set(nome, lista);
  }
  return [...cidades]
    .map(([nome, itens]) => ({ nome, lugares: itens }))
    .sort((a, b) => {
      if (a.nome === SEM_CIDADE || b.nome === SEM_CIDADE) {
        return Number(a.nome === SEM_CIDADE) - Number(b.nome === SEM_CIDADE);
      }
      return ORDEM.compare(a.nome, b.nome);
    });
}

/** Os pontos do mapa: os lugares com coordenadas válidas. */
export function pontosDoMapa(lugares: CONSULTA_DOS_LUGARES_RESULT): PontoDoMapa[] {
  return lugares.flatMap((lugar) => {
    const ponto = coordenadas(lugar);
    return ponto
      ? [
          {
            titulo: lugar.titulo,
            url: urlDoPost(lugar),
            categoria: texto(lugar.categoria?.nome),
            ...ponto,
          },
        ]
      : [];
  });
}

/** "3 lugares em 2 cidades", para a abertura da página. */
export function resumoDosLugares(cidades: CidadeDaLista[]): string {
  const total = cidades.reduce((soma, { lugares }) => soma + lugares.length, 0);
  const comCidade = cidades.filter(({ nome }) => nome !== SEM_CIDADE).length;
  const lugares = `${total} ${total === 1 ? 'lugar' : 'lugares'}`;
  if (comCidade === 0) return lugares;
  return `${lugares} em ${comCidade} ${comCidade === 1 ? 'cidade' : 'cidades'}`;
}

export function seoDoMapa(): Metadados {
  return {
    title: TITULO_DO_MAPA,
    description: DESCRICAO_DO_MAPA,
    canonical: CAMINHO_DO_MAPA,
  };
}
