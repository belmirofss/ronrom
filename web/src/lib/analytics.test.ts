import { afterEach, describe, expect, it, vi } from 'vitest';
import { configurarUmami, EVENTOS, registrarEvento } from '@/lib/analytics';

const ID = '3f2b8c1e-7a4d-4e9b-9c1a-2d5e6f7a8b9c';

describe('configurarUmami', () => {
  it('liga o script em produção, restrito ao host do site', () => {
    expect(
      configurarUmami({
        websiteId: ID,
        ambiente: 'production',
        previa: false,
        urlDoSite: 'https://ronrom-blog.vercel.app',
      }),
    ).toEqual({ websiteId: ID, dominio: 'ronrom-blog.vercel.app' });
  });

  it('não liga fora de produção, na prévia nem sem o website-id', () => {
    const urlDoSite = 'https://ronrom-blog.vercel.app';

    expect(
      configurarUmami({ websiteId: ID, ambiente: 'preview', previa: false, urlDoSite }),
    ).toBeNull();
    expect(
      configurarUmami({ websiteId: ID, ambiente: 'development', previa: false, urlDoSite }),
    ).toBeNull();
    expect(
      configurarUmami({ websiteId: ID, ambiente: 'production', previa: true, urlDoSite }),
    ).toBeNull();
    expect(
      configurarUmami({ websiteId: ID, ambiente: undefined, previa: false, urlDoSite }),
    ).toBeNull();
    expect(
      configurarUmami({ websiteId: undefined, ambiente: 'production', previa: false, urlDoSite }),
    ).toBeNull();
  });
});

describe('registrarEvento', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('repassa o evento ao Umami quando o script carregou', () => {
    const track = vi.fn();
    vi.stubGlobal('window', { umami: { track } });

    registrarEvento(EVENTOS.trocaDeAba, { aba: 'mais-lidos' });

    expect(track).toHaveBeenCalledWith('troca-de-aba', { aba: 'mais-lidos' });
  });

  it('não faz nada sem o script e não quebra se ele falhar', () => {
    vi.stubGlobal('window', {});
    expect(() => registrarEvento(EVENTOS.rss)).not.toThrow();

    vi.stubGlobal('window', {
      umami: {
        track: () => {
          throw new Error('falhou');
        },
      },
    });
    expect(() => registrarEvento(EVENTOS.rss)).not.toThrow();
  });
});
