# 0003 · pnpm e monorepo com `web/` e `studio/`

- **Status:** aceita
- **Data:** 29/10/2026
- **Issues:** #2, #7

## Contexto

O projeto tem duas aplicações: o site em Astro e o Sanity Studio, onde a autora escreve. Elas compartilham o modelo de conteúdo: os schemas ficam no Studio, as consultas GROQ ficam no site, e o typegen do Sanity (#25) precisa ler os dois para gerar os tipos. Só uma pessoa mantém o código.

Alternativas consideradas:

- **Dois repositórios:** isolamento total, mas cada mudança de schema vira dois PRs sincronizados à mão, e o typegen teria que buscar as consultas de outro repositório ou de um pacote publicado.
- **Studio embutido no Astro** (rota `/studio` no site): um app só, mas o Studio pesaria no build e nas funções da Vercel, com cota limitada no Hobby, enquanto o Sanity hospeda o Studio de graça.
- **Monorepo com workspaces:** as duas aplicações no mesmo repositório, cada uma com o próprio `package.json`, e um lockfile só.

Para o gerenciador de pacotes, o pnpm tem workspaces nativos, instala mais rápido e ocupa menos disco que o npm, e é mais estrito: um pacote só enxerga as dependências que declarou. Ele também bloqueia scripts de instalação por padrão (`allowBuilds`) e recusa versões publicadas há pouco tempo (`minimumReleaseAge`), duas defesas contra pacotes comprometidos.

## Decisão

Um monorepo com workspaces do pnpm: o site em `web/` e o Studio em `studio/`, listados no `pnpm-workspace.yaml`, com um `pnpm-lock.yaml` único na raiz. A versão do pnpm fica fixa em `packageManager` no `package.json` (usada pelo Corepack, pelo CI e pela Vercel), e a do Node no `.nvmrc`. Os scripts de uso comum são expostos na raiz (`pnpm dev`, `pnpm studio:dev` etc.). O Studio é publicado pelo Sanity em `ronrom.sanity.studio`, fora da Vercel.

## Consequências

- Uma mudança de schema e a consulta que a usa entram no mesmo PR, e o typegen lê as consultas direto de `web/`.
- A Vercel builda só `web/` (Root Directory). O Ignored Build Step pula deploys quando só `studio/` mudou, e o Studio é publicado à parte (#12).
- Um lockfile só: o Dependabot olha a raiz, e uma atualização do Sanity que afete os dois lados chega num PR só.
- Todo comando de dependência precisa de `--filter` (`pnpm --filter web add ...`); um `pnpm add` sem filtro na raiz falha ou instala no lugar errado.
- O lockfile depende da versão exata do pnpm. Gerá-lo com outra versão já quebrou o `--frozen-lockfile` do CI (#79); usar o Corepack evita isso.
- npm e yarn não funcionam no projeto.
- As versões de Node ficam em vários lugares (`.nvmrc`, `engines` dos `package.json`) e precisam mudar juntas.
- Se surgir código compartilhado entre site e Studio (o slugify da #18, por exemplo), ele pode virar um terceiro workspace (`packages/*`) sem mudar a estrutura.
