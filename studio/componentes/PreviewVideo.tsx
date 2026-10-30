import { useState, type MouseEvent, type SyntheticEvent } from 'react';
import type { PreviewProps } from 'sanity';
import styled from 'styled-components';

import { LARGURA_DA_MINIATURA_INDISPONIVEL, miniaturaDoYoutube, videoDoLink } from '../lib/video';
import { creme, malva, rosa, vinho } from '../marca/cores';

const Quadro = styled.figure`
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 8px;
`;

const Miniatura = styled.img`
  display: block;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 16 / 9;
  border-radius: 4px;
  object-fit: cover;
`;

const Cartao = styled.div`
  display: grid;
  gap: 4px;
  justify-items: start;
  max-width: 320px;
  padding: 16px;
  border: 1px solid ${rosa};
  border-radius: 4px;
  color: ${vinho};
  background: ${creme};
  font-size: 0.875rem;
  line-height: 1.4;

  strong {
    font-size: 1rem;
  }
`;

const Legenda = styled.figcaption`
  color: ${malva};
  font-size: 0.875rem;
`;

const Link = styled.a`
  color: ${vinho};
  font-size: 0.875rem;
  overflow-wrap: anywhere;

  &:focus-visible {
    outline: 2px solid ${vinho};
    outline-offset: 2px;
  }
`;

// O `prepare` do bloco (schemaTypes/corpo.ts) repassa o link e a legenda, além do título.
type Props = PreviewProps & { url?: string; legenda?: string };

// O clique no bloco abre o formulário do vídeo; o clique no link só abre o vídeo em outra aba.
function pararClique(evento: MouseEvent) {
  evento.stopPropagation();
}

function LinkDoVideo({ url, children }: { url: string; children: string }) {
  return (
    <Link href={url} target="_blank" rel="noreferrer" onClick={pararClique}>
      {children}
    </Link>
  );
}

// Prévia do vídeo dentro do texto: a miniatura do YouTube ou um cartão do Instagram (que não
// oferece miniatura sem login). Sem link válido ou sem miniatura, mostra "Prévia indisponível" e o
// link, para a autora conferir.
export function PreviewVideo({ url, legenda }: Props) {
  const video = videoDoLink(url);
  const [semMiniatura, setSemMiniatura] = useState<string>();
  // Só vira link o que é página da web: um `javascript:` colado no campo fica como texto.
  const link = url?.trim();
  const linkSeguro = link && /^https?:\/\//i.test(link) ? link : undefined;

  function conferirMiniatura(evento: SyntheticEvent<HTMLImageElement>) {
    if (evento.currentTarget.naturalWidth <= LARGURA_DA_MINIATURA_INDISPONIVEL) {
      setSemMiniatura(video?.idVideo);
    }
  }

  let conteudo;
  if (video?.provedor === 'youtube' && semMiniatura !== video.idVideo) {
    conteudo = (
      <Miniatura
        src={miniaturaDoYoutube(video.idVideo)}
        alt={legenda ? `Miniatura do vídeo: ${legenda}` : 'Miniatura do vídeo do YouTube'}
        onLoad={conferirMiniatura}
        onError={() => setSemMiniatura(video.idVideo)}
      />
    );
  } else if (video?.provedor === 'instagram' && linkSeguro) {
    conteudo = (
      <Cartao>
        <strong>
          {/\/reels?\//i.test(linkSeguro) ? 'Reel do Instagram' : 'Post do Instagram'}
        </strong>
        <span>A prévia do Instagram só aparece no site.</span>
        <LinkDoVideo url={linkSeguro}>Abrir no Instagram</LinkDoVideo>
      </Cartao>
    );
  } else {
    conteudo = (
      <Cartao>
        <strong>Prévia indisponível</strong>
        {linkSeguro ? (
          <LinkDoVideo url={linkSeguro}>{linkSeguro}</LinkDoVideo>
        ) : (
          <span>{link || 'Cole o link do vídeo.'}</span>
        )}
      </Cartao>
    );
  }

  return (
    <Quadro>
      {conteudo}
      {legenda?.trim() && <Legenda>{legenda.trim()}</Legenda>}
    </Quadro>
  );
}
