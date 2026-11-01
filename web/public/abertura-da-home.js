/* global document */
// A animação de abertura da capa da home (TopoHome) roda só na primeira visita da sessão: nas
// seguintes, a classe .home-ja-vista no <html> desliga a animação. Script clássico, carregado antes
// da capa no HTML, para a classe entrar antes da primeira pintura (sem piscar). Sem JS, a animação
// sempre roda.
(() => {
  const CHAVE = 'ronrom:home-vista';
  try {
    if (sessionStorage.getItem(CHAVE)) document.documentElement.classList.add('home-ja-vista');
    else sessionStorage.setItem(CHAVE, '1');
  } catch {
    // Armazenamento bloqueado (aba anônima restrita, por exemplo): a animação roda sempre.
  }
})();
