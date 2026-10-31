// Confere, depois do `pnpm build`, que a Vercel serve o 404.html estático com status 404 para
// qualquer URL inexistente (#47). Roda no `ci / build`. Quebra se o 404.astro sumir ou virar rota
// sob demanda, e a URL inexistente passar a cair na função (docs/ambientes.md#página-404).
import { existsSync, readFileSync } from 'node:fs';

const SAIDA = new URL('../web/.vercel/output/', import.meta.url);

const config = JSON.parse(readFileSync(new URL('config.json', SAIDA), 'utf8'));
const ultima = config.routes.at(-1);

const erros = [];
if (!existsSync(new URL('static/404.html', SAIDA))) {
  erros.push('o build não gerou o static/404.html');
}
if (ultima?.src !== '^/.*$' || ultima?.dest !== '/404.html' || ultima?.status !== 404) {
  erros.push(
    `a última rota do config.json devia levar tudo para /404.html com status 404, e é ${JSON.stringify(ultima)}`,
  );
}

if (erros.length > 0) {
  console.error(`Página 404 da Vercel: ${erros.join('; ')}.`);
  process.exit(1);
}
console.log('Página 404 da Vercel: URL inexistente recebe o 404.html com status 404.');
