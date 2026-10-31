import { describe, expect, it } from 'vitest';

import { criarSessao, destinoDaPrevia, DURACAO_DA_SESSAO, sessaoValida } from './sessao';

const SEGREDO = 'token-de-teste';
const AGORA = Date.UTC(2026, 9, 31, 12);

describe('sessão da prévia', () => {
  it('aceita a sessão recém-criada com o mesmo segredo', () => {
    expect(sessaoValida(criarSessao(SEGREDO, AGORA), SEGREDO, AGORA)).toBe(true);
  });

  it('expira depois de DURACAO_DA_SESSAO', () => {
    const sessao = criarSessao(SEGREDO, AGORA);
    expect(sessaoValida(sessao, SEGREDO, AGORA + DURACAO_DA_SESSAO - 1)).toBe(true);
    expect(sessaoValida(sessao, SEGREDO, AGORA + DURACAO_DA_SESSAO)).toBe(false);
  });

  it('recusa a sessão assinada com outro segredo (token trocado)', () => {
    expect(sessaoValida(criarSessao('outro-token', AGORA), SEGREDO, AGORA)).toBe(false);
  });

  it('recusa a data adulterada', () => {
    const [, assinatura] = criarSessao(SEGREDO, AGORA).split('.');
    const maisTarde = String(AGORA + 10 * DURACAO_DA_SESSAO);
    expect(sessaoValida(`${maisTarde}.${assinatura}`, SEGREDO, AGORA)).toBe(false);
  });

  it.each([undefined, '', 'qualquer-coisa', '123', '123.', '.abc', 'abc.def', '1.2.3'])(
    'recusa o cookie malformado %j',
    (valor) => {
      expect(sessaoValida(valor, SEGREDO, AGORA)).toBe(false);
    },
  );

  it('recusa tudo sem segredo', () => {
    expect(sessaoValida(criarSessao('', AGORA), '', AGORA)).toBe(false);
  });
});

describe('destinoDaPrevia', () => {
  it.each([
    ['/reviews/filmes/duna', '/reviews/filmes/duna'],
    ['/?aba=mais-lidos', '/?aba=mais-lidos'],
    [undefined, '/'],
    ['', '/'],
    ['https://exemplo.com', '/'],
    ['//exemplo.com', '/'],
    ['/\\exemplo.com', '/'],
  ])('%j → %j', (caminho, esperado) => {
    expect(destinoDaPrevia(caminho)).toBe(esperado);
  });
});
