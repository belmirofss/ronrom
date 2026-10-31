import L from 'leaflet';
import urlDoCss from 'leaflet/dist/leaflet.css?url';

import type { PontoDoMapa } from '@/lib/mapa';

// O mapa interativo do /mapa (#136), com o Leaflet e os tiles do OpenStreetMap. A página só importa
// este módulo quando a pessoa clica em "Mostrar o mapa": o Leaflet (uns 40 KB de JS) e os tiles,
// que mandam o IP de quem lê ao OpenStreetMap (veja a /privacidade), nunca carregam sozinhos.

export const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// A atribuição que a política de uso dos tiles exige, sempre visível no canto do mapa.
const ATRIBUICAO =
  '© <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>';

// Zoom com um ponto só (ou todos no mesmo lugar): o quarteirão, não o planeta.
const ZOOM_DE_UM_PONTO = 15;

// Os pontos são <div> do Leaflet, não imagens: o desenho fica no CSS da página, e cada um recebe
// foco pelo teclado (Enter abre o balão com o link da review).
const icone = L.divIcon({
  className: 'mapa__ponto',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

function balao(ponto: PontoDoMapa): HTMLElement {
  const conteudo = document.createElement('div');
  conteudo.className = 'mapa__balao';
  if (ponto.categoria) {
    const categoria = document.createElement('p');
    categoria.className = 'mapa__balao-categoria';
    categoria.textContent = ponto.categoria;
    conteudo.append(categoria);
  }
  const link = document.createElement('a');
  link.href = ponto.url;
  link.textContent = ponto.titulo;
  conteudo.append(link);
  return conteudo;
}

// O CSS do Leaflet entra como URL, não como `import '…css'`: importado, o Astro o poria no <head>
// da página, bloqueando a renderização de quem nunca abre o mapa.
function carregarCss(): Promise<void> {
  if (document.querySelector(`link[href="${urlDoCss}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = urlDoCss;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`O CSS do mapa não carregou: ${urlDoCss}`));
    document.head.append(link);
  });
}

/** Monta o mapa dentro de `elemento`, com um ponto por lugar, enquadrando todos. */
export async function montarMapa(elemento: HTMLElement, pontos: PontoDoMapa[]): Promise<L.Map> {
  await carregarCss();
  const mapa = L.map(elemento, { scrollWheelZoom: false });
  mapa.attributionControl.setPrefix(false);
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATRIBUICAO }).addTo(mapa);

  const marcadores = pontos.map((ponto) =>
    L.marker([ponto.lat, ponto.lng], { icon: icone, title: ponto.titulo, alt: ponto.titulo })
      .bindPopup(balao(ponto))
      .addTo(mapa),
  );

  const limites = L.latLngBounds(marcadores.map((marcador) => marcador.getLatLng()));
  if (pontos.length === 1 || limites.getNorthEast().equals(limites.getSouthWest())) {
    mapa.setView(limites.getCenter(), ZOOM_DE_UM_PONTO);
  } else {
    mapa.fitBounds(limites, { padding: [32, 32] });
  }
  return mapa;
}
