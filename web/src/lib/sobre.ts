import type { Corpo } from '@/lib/corpo';
import type { Metadados } from '@/lib/seo';
import type { CONSULTA_DO_SOBRE_RESULT } from '@/lib/sanity/tipos.gerados';
import { DESCRICAO_DO_SITE } from '@/lib/utils/site';

// Regras da página /sobre (#47): o que ela mostra e os metadados. O documento é o singleton
// `sobre` (CONSULTA_DO_SOBRE), que pode não existir ainda, ou existir só em parte.

type Sobre = CONSULTA_DO_SOBRE_RESULT;

export const CAMINHO_DO_SOBRE = '/sobre';

/** O h1 da página e o título da aba. */
export const TITULO_DO_SOBRE = 'Sobre mim';

/**
 * O texto da página, no formato do corpo do post, para o `<CorpoDoPost>`. O do Sobre é um pedaço
 * do corpo (parágrafos, subtítulo h2, lista e link externo), então cabe no mesmo tipo.
 */
export function textoDoSobre(sobre: Sobre): Corpo {
  // A CONSULTA_DO_POST projeta os `markDefs`, que chegam sempre (`null` sem link); aqui eles vêm
  // como estão no documento e podem faltar.
  return (sobre?.texto ?? []).map((bloco) => ({ ...bloco, markDefs: bloco.markDefs ?? null }));
}

/**
 * Se a página tem o que mostrar: algum texto escrito. Sem o documento (ou com o texto vazio), a
 * página mostra o estado vazio, mesmo que o nome e a bio já estejam preenchidos.
 */
export function sobreTemTexto(sobre: Sobre): boolean {
  return textoDoSobre(sobre).some(
    (bloco) => bloco._type === 'block' && (bloco.children ?? []).some(({ text }) => text?.trim()),
  );
}

/** Texto alternativo da foto: o do Studio ou, sem ele, "Foto de {nome}". */
export function altDaFoto(sobre: Sobre): string {
  const alt = sobre?.foto?.alt?.trim();
  if (alt) return alt;
  return sobre?.nome ? `Foto de ${sobre.nome}` : 'Foto da autora';
}

/**
 * Metadados da /sobre. Como diz o Studio, o que ficar vazio no SEO usa a bio curta e a foto; sem
 * elas, a description e a imagem padrão do site.
 */
export function seoDoSobre(sobre: Sobre): Metadados {
  const daFoto = !sobre?.seo?.imagem?.asset && Boolean(sobre?.foto?.asset);
  const imagem = daFoto ? sobre?.foto : sobre?.seo?.imagem;
  return {
    title: TITULO_DO_SOBRE,
    description: sobre?.seo?.descricao?.trim() || sobre?.bio?.trim() || DESCRICAO_DO_SITE,
    canonical: CAMINHO_DO_SOBRE,
    image: imagem?.asset ? imagem : null,
    // A imagem do SEO tem o próprio alt; a foto usa o mesmo alt da página.
    imageAlt: daFoto ? altDaFoto(sobre) : undefined,
  };
}
