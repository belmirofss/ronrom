import { rosa, vinho } from './cores';

// Gato do mosaico da home (orelhas sobre semicírculo), simplificado para caber no canto do Studio.
// O quadrado rosa destaca o ícone sobre a barra de navegação vinho.
export function IconeRonrom() {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill={rosa} />
      <path d="M6 25a10 10 0 0 1 20 0ZM7.5 20 9 10l6 5.3ZM24.5 20 23 10l-6 5.3Z" fill={vinho} />
    </svg>
  );
}
