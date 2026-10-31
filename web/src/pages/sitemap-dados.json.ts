import type { APIRoute } from 'astro';
import { buscarSitemap } from '@/lib/sanity/conteudo';
import { dadosDoSitemap } from '@/lib/sitemap';

// Mapa caminho → lastmod e páginas noindex, gerado no build para o @astrojs/sitemap (#52). Não
// chega ao deploy: o web/sitemap.mjs lê o arquivo e o apaga no fim do build.
export const GET: APIRoute = async () => Response.json(dadosDoSitemap(await buscarSitemap()));
