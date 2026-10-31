import { enableVisualEditing } from '@sanity/visual-editing/enable-visual-editing';

// Edição visual da prévia de rascunhos (#43), injetada em toda página só no build da prévia
// (astro.config.mjs). Acha os textos marcados pelo stega (lib/sanity/stega.ts) e desenha por cima
// deles o contorno clicável: o clique abre o campo certo no Studio.
//
// Sem dados reativos no navegador: quando a autora edita, o Presentation pede um refresh, e o
// padrão do pacote (recarregar a página) basta, porque o servidor monta a página de novo com o
// rascunho atual.
enableVisualEditing({
  // A barra de endereço do Presentation acompanha a navegação dentro da prévia, e o que a autora
  // digita nela navega a prévia.
  history: {
    subscribe: (navegar) => {
      navegar({ type: 'push', url: `${location.pathname}${location.search}` });
      return () => {};
    },
    update: (mudanca) => {
      if (mudanca.type === 'pop') history.back();
      else location.assign(mudanca.url);
    },
  },
});
