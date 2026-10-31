import { SECOES, type LinkDeNavegacao } from '@/lib/navegacao';
import {
  urlDaCategoria,
  urlDaPagina,
  urlDoFormato,
  urlDoPost,
  type PostComRota,
} from '@/lib/rotas';

// Os itens da trilha de navegação (breadcrumb). O `Breadcrumb.astro` desenha a trilha e o
// BreadcrumbList do JSON-LD (#50) usa os mesmos itens, com `canonicalUrl(href)` em cada um, para
// a trilha da página e a do markup nunca divergirem.

export type ItemDaTrilha = LinkDeNavegacao;

interface Secao {
  nome?: string | null | undefined;
  slug?: string | null | undefined;
}

// O rótulo das seções é o mesmo da navegação do cabeçalho.
function secaoDoCabecalho(href: string): ItemDaTrilha {
  const secao = SECOES.find((item) => item.href === href);
  if (!secao) throw new Error(`Seção ${href} ausente em SECOES (@/lib/navegacao).`);
  return secao;
}

// Nome ausente derruba o build, como o slug no `urlDoPost`: a trilha não sai com item vazio.
function nomeDa(secao: Secao, onde: string): string {
  if (!secao.nome) throw new Error(`Nome ausente em ${onde} (slug "${secao.slug}").`);
  return secao.nome;
}

/** Início › Todos os posts (/posts, que não está no cabeçalho). */
export function trilhaDeTodosOsPosts(): ItemDaTrilha[] {
  return [secaoDoCabecalho('/'), { rotulo: 'Todos os posts', href: '/posts' }];
}

/** Início › Reviews ou Início › Pensamentos */
export function trilhaDoTipo(tipo: 'review' | 'pensamento'): ItemDaTrilha[] {
  return [secaoDoCabecalho('/'), secaoDoCabecalho(tipo === 'review' ? '/reviews' : '/pensamentos')];
}

/** Início › Reviews › {categoria} */
export function trilhaDaCategoria(categoria: Secao): ItemDaTrilha[] {
  return [
    secaoDoCabecalho('/'),
    secaoDoCabecalho('/reviews'),
    { rotulo: nomeDa(categoria, 'trilhaDaCategoria'), href: urlDaCategoria(categoria.slug ?? '') },
  ];
}

/** Início › Pensamentos › {formato} */
export function trilhaDoFormato(formato: Secao): ItemDaTrilha[] {
  return [
    secaoDoCabecalho('/'),
    secaoDoCabecalho('/pensamentos'),
    { rotulo: nomeDa(formato, 'trilhaDoFormato'), href: urlDoFormato(formato.slug ?? '') },
  ];
}

/**
 * Início › Reviews › {categoria} › {título} ou Início › Pensamentos › {formato} › {título}. Serve
 * direto o resultado da consulta do post (`tipo`, `titulo`, `slug`, `categoria`, `formato`).
 */
export function trilhaDoPost(
  post: PostComRota & {
    titulo?: string | null | undefined;
    categoria?: Secao | null | undefined;
    formato?: Secao | null | undefined;
  },
): ItemDaTrilha[] {
  // O urlDoPost já recusa post sem categoria (review) ou sem formato (pensamento).
  const href = urlDoPost(post);
  if (!post.titulo) throw new Error(`Título ausente em trilhaDoPost (${href}).`);
  const secao =
    post.tipo === 'review'
      ? trilhaDaCategoria(post.categoria ?? {})
      : trilhaDoFormato(post.formato ?? {});
  return [...secao, { rotulo: post.titulo, href }];
}

/**
 * A trilha da página `n` de uma listagem: a da página 1 e, da 2 em diante, "Página n" no fim. O
 * último item da trilha é sempre a página aberta.
 */
export function trilhaDaPagina(trilha: readonly ItemDaTrilha[], n: number): ItemDaTrilha[] {
  const listagem = trilha.at(-1);
  if (!listagem) throw new Error('Trilha vazia em trilhaDaPagina.');
  return n > 1
    ? [...trilha, { rotulo: `Página ${n}`, href: urlDaPagina(listagem.href, n) }]
    : [...trilha];
}
