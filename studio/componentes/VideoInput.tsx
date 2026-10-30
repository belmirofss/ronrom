import { useEffect } from 'react';
import { type ObjectInputProps, set, unset } from 'sanity';

import { videoDesatualizado, videoDoLink } from '../lib/video';

interface ValorDoVideo {
  url?: string | undefined;
  provedor?: string | undefined;
  idVideo?: string | undefined;
}

// Formulário do bloco de vídeo. Mostra só o link e a legenda (o padrão do Sanity) e, a cada link
// novo, grava ao lado o `provedor` e o `idVideo` tirados dele, para o site não ter de interpretar a
// URL. Só escreve quando eles não batem com o link, então abrir um vídeo já certo não muda nada.
export function VideoInput(props: ObjectInputProps) {
  const { onChange, readOnly } = props;
  const { url, provedor, idVideo } = (props.value ?? {}) as ValorDoVideo;

  useEffect(() => {
    if (readOnly || !videoDesatualizado({ url, provedor, idVideo })) return;

    const video = videoDoLink(url);
    onChange(
      video
        ? [set(video.provedor, ['provedor']), set(video.idVideo, ['idVideo'])]
        : [unset(['provedor']), unset(['idVideo'])],
    );
  }, [url, provedor, idVideo, readOnly, onChange]);

  return props.renderDefault(props);
}
