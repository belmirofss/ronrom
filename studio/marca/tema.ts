import '@fontsource-variable/dm-sans';

import { buildLegacyTheme } from 'sanity';

import { creme, malva, vinho } from './cores';

// O buildLegacyTheme é a única API de tema pública do Sanity 6. Está marcado como deprecated
// ("será removido numa próxima major"): ao migrar de major, confira se ainda existe.
export const temaRonrom = buildLegacyTheme({
  '--font-family-base': "'DM Sans Variable', system-ui, sans-serif",

  // Vinho é a cor primária: botões de ação, links, foco e a barra de navegação.
  '--brand-primary': vinho,
  '--focus-color': vinho,
  '--default-button-primary-color': vinho,
  '--main-navigation-color': vinho,
  '--main-navigation-color--inverted': creme,

  // Malva no lugar do cinza: botões neutros, bordas e textos secundários ficam quentes.
  '--default-button-color': malva,
  '--gray-base': malva,
  '--gray': malva,
});
