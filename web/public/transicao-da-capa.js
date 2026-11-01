/* global window, document */
// Transição da capa entre um card e o post (View Transitions entre documentos): a imagem do card
// que leva ao post, ou do card do post de onde se voltou, ganha o nome "capa", o mesmo da capa do
// post (.post__imagem, no PaginaDoPost). Um nome só por página, senão a transição cai.
// Script clássico no <head> (LayoutBase): o pagereveal dispara antes dos scripts de módulo.
(() => {
  const capaDoCard = (url) => {
    if (!url) return null;
    const { pathname } = new URL(url);
    const link = [...document.querySelectorAll('.card-clicavel__link')].find(
      (a) => a.pathname === pathname,
    );
    return link?.closest('.card-clicavel')?.querySelector('.imagem-sanity') ?? null;
  };

  const nomear = (transicao, url) => {
    const capa = transicao ? capaDoCard(url) : null;
    if (!capa) return;
    capa.style.viewTransitionName = 'capa';
    transicao.finished.finally(() => (capa.style.viewTransitionName = ''));
  };

  window.addEventListener('pageswap', (evento) => {
    nomear(evento.viewTransition, evento.activation?.entry?.url);
  });

  // Na volta do post, o nome precisa estar no card antes da captura da página nova, então é
  // síncrono. Se o card ainda não chegou no HTML, a página só entra com o fade.
  window.addEventListener('pagereveal', (evento) => {
    nomear(evento.viewTransition, window.navigation?.activation?.from?.url);
  });
})();
