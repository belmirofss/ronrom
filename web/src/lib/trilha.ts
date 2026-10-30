import { SECOES, type LinkDeNavegacao } from '@/lib/navegacao';
import { urlDaCategoria, urlDoFormato, urlDoPost, type PostComRota } from '@/lib/rotas';

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
