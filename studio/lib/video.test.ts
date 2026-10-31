import { describe, expect, it } from 'vitest';

import { miniaturaDoYoutube, videoDesatualizado, videoDoLink } from './video';

describe('videoDoLink', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=AbCdEf123', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/a-B_c1D2e3F', 'a-B_c1D2e3F'],
    ['https://youtube.com/shorts/a-B_c1D2e3F?feature=share', 'a-B_c1D2e3F'],
    ['https://m.youtube.com/shorts/a-B_c1D2e3F', 'a-B_c1D2e3F'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ?si=AbCdEf123&start=42', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['http://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&index=2', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=42', 'dQw4w9WgXcQ'],
    ['  https://youtu.be/dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('reconhece o YouTube em %s', (url, idVideo) => {
    expect(videoDoLink(url)).toEqual({ provedor: 'youtube', idVideo });
  });

  it.each([
    ['https://www.instagram.com/p/C1a2B3c4D5e/', 'C1a2B3c4D5e'],
    ['https://instagram.com/p/C1a2B3c4D5e', 'C1a2B3c4D5e'],
    ['https://www.instagram.com/reel/C9x_Y-z8W7v/?igsh=MTIz', 'C9x_Y-z8W7v'],
    ['https://www.instagram.com/reels/C9x_Y-z8W7v/', 'C9x_Y-z8W7v'],
  ])('reconhece o Instagram em %s', (url, idVideo) => {
    expect(videoDoLink(url)).toEqual({ provedor: 'instagram', idVideo });
  });

  it.each([
    ['vazio', ''],
    ['outro site', 'https://vimeo.com/123456789'],
    ['sem protocolo', 'youtu.be/dQw4w9WgXcQ'],
    ['domínio parecido', 'https://notyoutube.com/watch?v=dQw4w9WgXcQ'],
    ['ID curto', 'https://youtu.be/dQw4w9WgXc'],
    ['ID longo', 'https://youtu.be/dQw4w9WgXcQQ'],
    ['ID longo no watch', 'https://www.youtube.com/watch?v=dQw4w9WgXcQQ'],
    ['embed sem ID', 'https://www.youtube.com/embed/'],
    ['ID curto no embed', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXc'],
    ['nocookie fora do embed', 'https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ'],
    ['página de canal', 'https://www.youtube.com/@ronrom'],
    ['watch sem v', 'https://www.youtube.com/watch?list=PL123'],
    ['parâmetro que termina em v', 'https://www.youtube.com/watch?dev=dQw4w9WgXcQ'],
    ['perfil do Instagram', 'https://www.instagram.com/ronrom/'],
    ['story do Instagram', 'https://www.instagram.com/stories/ronrom/123/'],
  ])('recusa %s', (_caso, url) => {
    expect(videoDoLink(url)).toBeNull();
  });

  it('recusa quando não há link', () => {
    expect(videoDoLink(undefined)).toBeNull();
  });
});

describe('miniaturaDoYoutube', () => {
  it('usa a miniatura que existe para todo vídeo', () => {
    expect(miniaturaDoYoutube('dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });
});

describe('videoDesatualizado', () => {
  const url = 'https://youtu.be/dQw4w9WgXcQ';

  it('aceita quando provedor e ID acompanham o link', () => {
    expect(videoDesatualizado({ url, provedor: 'youtube', idVideo: 'dQw4w9WgXcQ' })).toBe(false);
  });

  it('acusa quando o link mudou e o ID ficou para trás', () => {
    expect(videoDesatualizado({ url, provedor: 'youtube', idVideo: 'outroVideo1' })).toBe(true);
  });

  it('acusa quando o link é válido e ainda não há provedor nem ID', () => {
    expect(videoDesatualizado({ url })).toBe(true);
  });

  it('aceita link inválido sem provedor nem ID, que fica com a validação do link', () => {
    expect(videoDesatualizado({ url: 'https://vimeo.com/1' })).toBe(false);
  });

  it('acusa provedor e ID que sobraram de um link apagado', () => {
    expect(videoDesatualizado({ provedor: 'youtube', idVideo: 'dQw4w9WgXcQ' })).toBe(true);
  });
});
