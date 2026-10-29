import { useId } from 'react';

import type { Preenchimento } from '../lib/nota';
import { rosa, vinho } from '../marca/cores';

// Coração simétrico em x = 12: o meio coração é o desenho cheio recortado na metade esquerda.
const CAMINHO =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

const LARGURA_PREENCHIDA: Record<Preenchimento, number> = { cheio: 24, meio: 12, vazio: 0 };

// Preenchido em vinho, vazio só com o contorno rosa. Decorativo: quem usa o coração dá o nome
// acessível (o rótulo do radio no input da nota).
export function Coracao({
  preenchimento,
  tamanho,
}: {
  preenchimento: Preenchimento;
  tamanho: number;
}) {
  // O id do useId tem caracteres (":" ou "«»") que o `url(#…)` do clip-path não aceita.
  const recorte = `coracao-${useId().replace(/[^\w-]/g, '')}`;
  const largura = LARGURA_PREENCHIDA[preenchimento];

  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
      <clipPath id={recorte}>
        <rect width={largura} height="24" />
      </clipPath>
      <path d={CAMINHO} fill="none" stroke={rosa} strokeWidth="1.5" />
      {largura > 0 && (
        <path
          d={CAMINHO}
          fill={vinho}
          stroke={vinho}
          strokeWidth="1.5"
          clipPath={`url(#${recorte})`}
        />
      )}
    </svg>
  );
}
