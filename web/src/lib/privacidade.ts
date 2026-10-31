import type { Metadados } from '@/lib/seo';
import type {
  CONSULTA_DAS_CONFIGURACOES_RESULT,
  CONSULTA_DO_SOBRE_RESULT,
} from '@/lib/sanity/tipos.gerados';

// Regras da página /privacidade (#59). O texto fica na página; aqui ficam os dados que o build e os
// testes também usam: a data da última atualização (sitemap) e os serviços de terceiros, que o
// privacidade.test.ts confere contra as origens liberadas na CSP do vercel.json.

export const CAMINHO_DA_PRIVACIDADE = '/privacidade';

/** O h1 da página e o título da aba. */
export const TITULO_DA_PRIVACIDADE = 'Política de privacidade';

export const DESCRICAO_DA_PRIVACIDADE =
  'Como o Ronrom trata dados: sem cookies, com métricas agregadas e um contador anônimo. Os serviços usados e os seus direitos pela LGPD.';

/**
 * Data da última mudança no texto, ao meio-dia de Brasília (uma data sem hora seria meia-noite UTC,
 * que em São Paulo ainda é o dia anterior). Mude junto com o texto.
 */
export const PRIVACIDADE_ATUALIZADA_EM = '2026-10-31T12:00:00-03:00';

export interface ServicoDeTerceiro {
  nome: string;
  /** Para que o site usa o serviço e o que chega até ele. */
  uso: string;
  /** Quando o navegador (ou o servidor do site) fala com o serviço. */
  quando: string;
  /** Onde fica a empresa e onde os dados podem ser tratados (transferência internacional). */
  pais: string;
  politica: string;
  /** As origens que o navegador acessa, as mesmas da CSP. Vazio: só o servidor fala com ele. */
  origens: readonly string[];
}

// Serviço novo (outro embed, outro analytics) entra aqui, na CSP e na tabela de docs/cabecalhos.md.
export const SERVICOS_DE_TERCEIROS: readonly ServicoDeTerceiro[] = [
  {
    nome: 'Vercel',
    uso: 'Hospeda o site e roda o contador de visualizações. Como todo servidor, recebe o endereço IP e o navegador de quem acessa e guarda registros técnicos (logs).',
    quando: 'Em todo acesso',
    pais: 'Estados Unidos, com servidores em São Paulo e em outros países',
    politica: 'https://vercel.com/legal/privacy-notice',
    origens: [],
  },
  {
    nome: 'Sanity',
    uso: 'Guarda os textos e entrega as imagens dos posts pela rede dela. Ao baixar uma imagem, recebe o endereço IP e o navegador.',
    quando: 'Em toda página com imagem',
    pais: 'Noruega e Estados Unidos',
    politica: 'https://www.sanity.io/legal/privacy',
    origens: ['https://cdn.sanity.io'],
  },
  {
    nome: 'Upstash',
    uso: 'Banco de dados do contador de visualizações. Recebe do servidor do site só o código do post e um hash que não identifica ninguém; o seu navegador nunca fala com ele.',
    quando: 'Depois de 5 segundos lendo um post',
    pais: 'Estados Unidos',
    politica: 'https://upstash.com/trust/privacy.pdf',
    origens: [],
  },
  {
    nome: 'Umami',
    uso: 'Métricas agregadas de audiência, sem cookies: página visitada (sem o que vem depois do "?"), site de origem, país, tipo de aparelho, navegador e alguns cliques.',
    quando: 'Em toda página, menos com o "Não rastrear" (Do Not Track) ligado no navegador',
    pais: 'Estados Unidos',
    politica: 'https://umami.is/privacy',
    origens: ['https://cloud.umami.is', 'https://gateway.umami.is'],
  },
  {
    nome: 'YouTube (Google)',
    uso: 'Mostra os vídeos dos posts. Antes do clique, só a miniatura vem do servidor de imagens do YouTube; o player, no modo de privacidade avançada (youtube-nocookie), só carrega quando você clica para assistir.',
    quando: 'Em posts com vídeo do YouTube: a miniatura ao abrir o post, o player depois do clique',
    pais: 'Estados Unidos',
    politica: 'https://policies.google.com/privacy',
    origens: ['https://i.ytimg.com', 'https://www.youtube-nocookie.com'],
  },
  {
    nome: 'Instagram (Meta)',
    uso: 'Mostra posts e reels do Instagram dentro do post. Nada do Instagram carrega antes de você clicar em "Carregar post aqui".',
    quando: 'Só depois do clique',
    pais: 'Estados Unidos',
    politica: 'https://privacycenter.instagram.com/policy',
    origens: ['https://www.instagram.com'],
  },
];

type Sobre = CONSULTA_DO_SOBRE_RESULT;
type Rede = NonNullable<NonNullable<CONSULTA_DAS_CONFIGURACOES_RESULT>['redes']>[number];

/** Quem responde pelos dados: a autora, com o nome do singleton Sobre. */
export function controladora(sobre: Sobre): string {
  return sobre?.nome?.trim() || 'a autora do Ronrom';
}

// Os mesmos nomes da lista de redes do Studio (studio/schemaTypes/configuracoes.ts).
const NOMES_DAS_REDES: Record<Rede['rede'], string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  letterboxd: 'Letterboxd',
  goodreads: 'Goodreads',
  skoob: 'Skoob',
  pinterest: 'Pinterest',
  outra: 'outra rede',
};

export interface CanalDeContato {
  nome: string;
  url: string;
}

/**
 * O canal para os pedidos do titular (a LGPD pede um): as redes de Configurações do site, que não
 * aparecem em outra página. Vazio: a página manda para o Sobre.
 */
export function canaisDeContato(
  configuracoes: CONSULTA_DAS_CONFIGURACOES_RESULT,
): CanalDeContato[] {
  return (configuracoes?.redes ?? []).flatMap(({ rede, url }) =>
    url ? [{ nome: NOMES_DAS_REDES[rede] ?? NOMES_DAS_REDES.outra, url }] : [],
  );
}

export function seoDaPrivacidade(): Metadados {
  return {
    title: TITULO_DA_PRIVACIDADE,
    description: DESCRICAO_DA_PRIVACIDADE,
    canonical: CAMINHO_DA_PRIVACIDADE,
  };
}
