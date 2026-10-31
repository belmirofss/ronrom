// Analytics do site (#58): Umami Cloud, sem cookies e sem localStorage, só em produção e
// respeitando o Do Not Track. Por que o Umami, o que é coletado e como conferir: docs/analytics.md.

export const SCRIPT_DO_UMAMI = 'https://cloud.umami.is/script.js';

/**
 * Os eventos customizados, com os nomes que aparecem no painel do Umami. Nenhum leva texto digitado
 * pela pessoa: a busca manda só a quantidade de resultados.
 */
export const EVENTOS = {
  /** Busca feita na /busca (#55), depois de 1 s sem mudar. Dados: `{ resultados }`. */
  busca: 'busca',
  /** Troca de um filtro da /busca (#55). Dados: `{ filtro, valor }`. */
  filtro: 'filtro',
  /** Troca de aba pela pessoa, como "Últimos posts" ↔ "Mais lidos" na home. Dados: `{ aba }`. */
  trocaDeAba: 'troca-de-aba',
  /** Clique no link do RSS. */
  rss: 'rss',
} as const;

export type Evento = (typeof EVENTOS)[keyof typeof EVENTOS];

/** O Umami só aceita texto, número e booleano nos dados de um evento. */
export type DadosDoEvento = Record<string, string | number | boolean>;

export interface ConfiguracaoDoUmami {
  websiteId: string;
  /** O host da produção: o script não manda nada se a página estiver em outro (`data-domains`). */
  dominio: string;
}

/**
 * O script só entra no HTML do build de produção com o website-id cadastrado. Previews, `pnpm dev`,
 * CI e a prévia de rascunhos (o projeto `ronrom-previa`, que também é `production`) ficam sem ele,
 * e o `data-domains` ainda barra uma cópia do build servida em outro host.
 */
export function configurarUmami({
  websiteId,
  ambiente,
  previa,
  urlDoSite,
}: {
  websiteId: string | undefined;
  ambiente: string | undefined;
  previa: boolean;
  urlDoSite: string;
}): ConfiguracaoDoUmami | null {
  if (ambiente !== 'production' || previa || !websiteId) return null;
  return { websiteId, dominio: new URL(urlDoSite).hostname };
}

interface Umami {
  track(evento: string, dados?: DadosDoEvento): void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

/**
 * Registra um evento customizado. Sem o script (fora de produção, com Do Not Track, bloqueado por
 * adblock ou ainda carregando), não faz nada.
 */
export function registrarEvento(evento: Evento, dados?: DadosDoEvento): void {
  try {
    window.umami?.track(evento, dados);
  } catch {
    // O analytics nunca quebra a página.
  }
}
