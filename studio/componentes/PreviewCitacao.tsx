import type { PreviewProps } from 'sanity';
import styled from 'styled-components';

import { malva, vinho } from '../marca/cores';

const Quadro = styled.figure`
  margin: 0;
  padding: 12px 16px;
  border-left: 4px solid ${vinho};
`;

const Texto = styled.blockquote`
  margin: 0;
  color: ${vinho};
  font-size: 1.25rem;
  font-style: italic;
  line-height: 1.4;
`;

const Fonte = styled.figcaption`
  margin-top: 8px;
  color: ${malva};
  font-size: 0.875rem;
`;

// Mostra a citação em destaque dentro do editor parecida com o site (letra grande, vinho, com a
// fonte embaixo), para a autora diferenciar do estilo "Citação" do texto corrido.
export function PreviewCitacao({ title, subtitle }: PreviewProps) {
  const texto = typeof title === 'string' ? title.trim() : '';
  const fonte = typeof subtitle === 'string' ? subtitle.trim() : '';

  return (
    <Quadro>
      <Texto>{texto ? `“${texto}”` : 'Escreva a citação.'}</Texto>
      {fonte && <Fonte>— {fonte}</Fonte>}
    </Quadro>
  );
}
