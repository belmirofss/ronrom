import type { PreviewProps } from 'sanity';
import styled from 'styled-components';

import { MAXIMO_DE_IMAGENS, MINIMO_DE_IMAGENS, urlDaMiniatura } from '../lib/galeria';
import { creme, malva, vinho } from '../marca/cores';

const TAMANHO = 56;

const Quadro = styled.div`
  display: grid;
  gap: 8px;
  padding: 8px;
`;

const Miniaturas = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Miniatura = styled.img`
  display: block;
  width: ${TAMANHO}px;
  height: ${TAMANHO}px;
  border-radius: 4px;
  object-fit: cover;
  background: ${creme};
`;

const Titulo = styled.span`
  color: ${vinho};
  font-size: 0.875rem;
  font-weight: 600;
`;

const Vazio = styled.span`
  color: ${malva};
  font-size: 0.875rem;
`;

export interface ImagemDaPrevia {
  url?: string | undefined;
  alt?: string | undefined;
}

// O `prepare` do bloco (schemaTypes/corpo.ts) repassa as imagens já com o `url` do asset.
type Props = PreviewProps & { imagens?: ImagemDaPrevia[] };

// Prévia da galeria dentro do texto: as miniaturas de todas as imagens, na ordem do site, e quantas
// são. Imagem ainda sem arquivo não aparece, mas conta, para a autora ver que falta escolher.
export function PreviewGaleria({ title, imagens = [] }: Props) {
  const comArquivo = imagens.filter((imagem): imagem is ImagemDaPrevia & { url: string } =>
    Boolean(imagem.url),
  );

  return (
    <Quadro>
      <Titulo>{typeof title === 'string' ? title : 'Galeria'}</Titulo>
      {comArquivo.length > 0 ? (
        <Miniaturas>
          {comArquivo.map(({ url, alt }, indice) => (
            <li key={`${indice}-${url}`}>
              <Miniatura src={urlDaMiniatura(url, TAMANHO)} alt={alt ?? ''} loading="lazy" />
            </li>
          ))}
        </Miniaturas>
      ) : (
        <Vazio>
          Adicione de {MINIMO_DE_IMAGENS} a {MAXIMO_DE_IMAGENS} imagens.
        </Vazio>
      )}
    </Quadro>
  );
}
