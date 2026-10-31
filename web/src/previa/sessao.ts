import { createHmac, timingSafeEqual } from 'node:crypto';

// Sessão da prévia de rascunhos (#43): o cookie que o /api/previa/ativar grava depois de conferir
// o segredo do Presentation, e que o middleware exige em toda página da prévia. O valor é
// `<expira em, ms>.<HMAC-SHA256 dessa data>`, assinado com um segredo que só o servidor conhece
// (o token viewer): ninguém monta um cookie válido sem ele, e trocar o token derruba as sessões.

export const COOKIE_DA_PREVIA = 'ronrom-previa';

/** Quanto tempo a prévia fica aberta depois de entrar pelo Studio: 8 horas. */
export const DURACAO_DA_SESSAO = 8 * 60 * 60 * 1000;

const assinar = (expiraEm: string, segredo: string) =>
  createHmac('sha256', segredo).update(`previa:${expiraEm}`).digest('base64url');

/** O valor do cookie de uma sessão nova, que vale por `DURACAO_DA_SESSAO`. */
export function criarSessao(segredo: string, agora = Date.now()): string {
  const expiraEm = String(agora + DURACAO_DA_SESSAO);
  return `${expiraEm}.${assinar(expiraEm, segredo)}`;
}

/** Se o cookie é uma sessão assinada com `segredo` e ainda no prazo. */
export function sessaoValida(valor: string | undefined, segredo: string, agora = Date.now()) {
  if (!valor || !segredo) return false;
  const [expiraEm, assinatura, ...resto] = valor.split('.');
  if (!expiraEm || !assinatura || resto.length > 0 || !/^\d+$/.test(expiraEm)) return false;
  if (Number(expiraEm) <= agora) return false;

  const esperada = Buffer.from(assinar(expiraEm, segredo));
  const recebida = Buffer.from(assinatura);
  return recebida.length === esperada.length && timingSafeEqual(recebida, esperada);
}

/**
 * O Presentation abre a prévia num iframe do Studio (outro domínio): o cookie é de terceiro. Por
 * isso `SameSite=None` (exige `Secure`) e `Partitioned`, que o Chrome aceita mesmo bloqueando
 * cookies de terceiros: o cookie vale só dentro do Studio.
 */
export const OPCOES_DO_COOKIE = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  partitioned: true,
} as const;

/** O caminho para onde ir depois de ativar a prévia: só caminho do próprio site. */
export function destinoDaPrevia(caminho: string | undefined): string {
  return caminho?.startsWith('/') && !caminho.startsWith('//') && !caminho.startsWith('/\\')
    ? caminho
    : '/';
}
