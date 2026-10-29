#!/usr/bin/env bash
# "Ignored Build Step" da Vercel, chamado pelo web/vercel.json (roda dentro de web/).
# Pela regra da Vercel, sair com 0 cancela o build e sair com 1 segue com ele.
# Pula o deploy quando, desde o último deploy da branch, só mudaram docs/, studio/,
# .github/ ou arquivos .md: nada disso entra no site, e cada build gasta cota do Hobby.
set -u

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
