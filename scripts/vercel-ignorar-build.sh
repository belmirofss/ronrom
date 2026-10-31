#!/usr/bin/env bash
# "Ignored Build Step" da Vercel, chamado pelo web/vercel.json (roda dentro de web/).
# Pela regra da Vercel, sair com 0 cancela o build e sair com 1 segue com ele.
# Pula o deploy de preview quando, desde o último deploy da branch, só mudaram docs/,
# studio/, .github/ ou arquivos .md: nada disso entra no site, e cada build gasta cota do Hobby.
set -u

# Produção sempre builda. O deploy hook (#17) rebuilda o commit que já está no ar para
# trazer conteúdo novo do Sanity, e a Vercel não diz ao script que o deploy veio do hook.
# Comparar commits cancelaria esse build: sem commit novo, ou com só docs desde o último
# deploy bom, o diff não acha nada que afete o site.
#
# O projeto da prévia de rascunhos (ronrom-previa, #43) usa este mesmo script, com
# PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true. Ele só publica a main: um deploy por branch dobraria
# os builds (o Hobby faz um de cada vez) sem ninguém usar. E não recebe o deploy hook, porque lê
# o conteúdo na hora; então, na main, compara commits como um preview.
if [ "${PUBLIC_SANITY_VISUAL_EDITING_ENABLED:-}" = "true" ]; then
  if [ "${VERCEL_ENV:-}" != "production" ]; then
    echo "Prévia de rascunhos: só a main é publicada; build ignorado."
    exit 0
  fi
elif [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Deploy de produção; segue com o build (pode ser conteúdo novo pelo deploy hook)."
  exit 1
fi

base="${VERCEL_GIT_PREVIOUS_SHA:-}"

# Primeiro deploy da branch, ou commit anterior fora do clone raso: na dúvida, builda.
if [ -z "$base" ] || ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  echo "Sem deploy anterior para comparar; segue com o build."
  exit 1
fi

if git diff --quiet "$base" HEAD -- \
  ':(top)' \
  ':(top,exclude)docs' \
  ':(top,exclude)studio' \
  ':(top,exclude).github' \
  ':(top,exclude,glob)**/*.md'; then
  echo "Só mudaram docs/, studio/, .github/ ou .md desde ${base}; build ignorado."
  exit 0
fi

echo "Há mudanças que afetam o site desde ${base}; segue com o build."
exit 1
