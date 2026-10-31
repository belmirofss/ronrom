import type { CONSULTA_DO_POST_RESULT } from '@/lib/sanity/tipos.gerados';

// O que a FichaDaReview (components/post) mostra: os campos da ficha como pares rótulo/valor, com
// os rótulos do modelo da categoria (studio/lib/ficha.ts) e os valores já formatados em pt-BR.
// Campo vazio não vira item: a ficha nunca mostra um rótulo sem valor.

/** A ficha como a `CONSULTA_DO_POST` devolve: uma união pelo `modelo` da categoria. */
export type Ficha = NonNullable<NonNullable<CONSULTA_DO_POST_RESULT>['ficha']>;

export interface ItemDaFicha {
  rotulo: string;
  valor: string;
  /** Link externo do valor (mapa, Instagram). */
  href?: string;
}

type Campo = string | number | null | undefined;

const MEIOS = { cinema: 'Cinema', streaming: 'Streaming' } as const;
const FORMATOS_DO_LIVRO = { fisico: 'Físico', ebook: 'E-book', audiobook: 'Audiobook' } as const;

function texto(valor: Campo): string | undefined {
  if (valor === null || valor === undefined) return undefined;
  return String(valor).trim() || undefined;
}

// "Cinema · Cine Belas Artes", só o meio ou só o nome.
function ondeVi(valor: { meio?: keyof typeof MEIOS; qual?: string } | null): string | undefined {
  const partes = [valor?.meio && MEIOS[valor.meio], texto(valor?.qual)].filter(Boolean);
  return partes.join(' · ') || undefined;
}

// "Rua das Acácias, 120 · Vila Mariana · São Paulo/SP".
function endereco(
  valor: { rua?: string; bairro?: string; cidade?: string; uf?: string } | null,
): string | undefined {
  const cidade = [texto(valor?.cidade), texto(valor?.uf)].filter(Boolean).join('/');
  const partes = [texto(valor?.rua), texto(valor?.bairro), cidade].filter(Boolean);
  return partes.join(' · ') || undefined;
}

// O Studio aceita o perfil com ou sem @ (`problemaNoInstagram`): aqui sai sempre com.
function instagram(perfil: string | null): ItemDaFicha | undefined {
  const usuario = texto(perfil)?.replace(/^@/, '');
  if (!usuario) return undefined;
  return {
    rotulo: 'Instagram',
    valor: `@${usuario}`,
    href: `https://www.instagram.com/${usuario}/`,
  };
}

function item(rotulo: string, valor: Campo, sufixo = ''): ItemDaFicha | undefined {
  const preenchido = texto(valor);
  return preenchido ? { rotulo, valor: `${preenchido}${sufixo}` } : undefined;
}

// Os campos de cada modelo, na ordem do formulário do Studio, sem o "Vale a pena?" (comum a todos).
function camposDoModelo(ficha: Ficha): (ItemDaFicha | undefined)[] {
  switch (ficha.modelo) {
    case 'filme':
      return [
        item('Direção', ficha.direcao),
        item('Ano', ficha.ano),
        item('Duração', ficha.duracao, ' min'),
        item('Onde vi', ondeVi(ficha.ondeVi)),
      ];
    case 'serie':
      return [
        item('Criação', ficha.criacao),
        item('Estreia', ficha.anoDeEstreia),
        item('Fim', ficha.anoDeFim),
        item('Temporadas vistas', ficha.temporadasVistas),
        item('Onde vi', ondeVi(ficha.ondeVi)),
      ];
    case 'livro':
      return [
        item('Autor(a)', ficha.autoria),
        item('Editora', ficha.editora),
        item('Ano', ficha.ano),
        item('Páginas', ficha.paginas),
        item('Formato', ficha.formatoDoLivro && FORMATOS_DO_LIVRO[ficha.formatoDoLivro]),
      ];
    case 'lugar': {
      const local = endereco(ficha.endereco);
      const mapa = texto(ficha.linkDoMapa);
      return [
        local ? { rotulo: 'Endereço', valor: local, ...(mapa ? { href: mapa } : {}) } : undefined,
        item('Faixa de preço', ficha.faixaDePreco),
        item('Cozinha', ficha.tipoDeCozinha),
        item('O que pedi', ficha.oQuePedi),
        instagram(ficha.instagram),
      ];
    }
    default:
      return [];
  }
}

/** Os itens preenchidos da ficha, na ordem do Studio, com o "Vale a pena?" no fim. */
export function itensDaFicha(ficha: Ficha | null | undefined): ItemDaFicha[] {
  if (!ficha) return [];
  return [...camposDoModelo(ficha), item('Vale a pena?', ficha.valeAPena)].filter(
    (campo): campo is ItemDaFicha => campo !== undefined,
  );
}
