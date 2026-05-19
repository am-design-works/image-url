#!/bin/sh
# Pre-commit guard: block manual /storage/v1/(object|render/image)/public URL
# construction outside the canonical helpers.
#
# Invoked from each repo's .husky/pre-commit via:
#   bash ../image-url/scripts/precommit-guard.sh || exit 1
#
# Allows URLs inside:
#   - the shared @amoeba/image-url package itself
#   - documented compat-layer files in consumer repos
#   - SQL migration files (the SQL function MUST embed the canonical prefix)
#   - dist-core compiled output
#   - markdown / docs files
#
# Anything else is a drift smell: use publicImageUrl / renderImageUrl instead.

set -e

# Files staged for commit (added or modified).
staged_files="$(git diff --cached --name-only --diff-filter=AM)"
if [ -z "$staged_files" ]; then
  exit 0
fi

# Filter out paths that are legitimately allowed to contain raw storage URLs.
candidates="$(echo "$staged_files" | grep -E '\.(ts|tsx|mjs|cjs|js|jsx)$' \
  | grep -vE '(^|/)(image-url/|migrations/|dist-core/|dist-server/|node_modules/)' \
  | grep -vE '(lib/cdn\.ts|supabaseImageLoader\.ts|imageUrlCompat\.ts|product-image-url\.ts|logo\.ts|logoUrls\.ts|amoebaLogoMark\.ts|imageVariants\.ts|imagePreloadUrl\.ts|imgproxyLoader\.ts|product-content-storage\.ts|storagePublicUrl\.ts|architecture-officer\.ts)$' \
  || true)"

if [ -z "$candidates" ]; then
  exit 0
fi

violations=""
for f in $candidates; do
  # Only scan added/changed lines for the URL pattern.
  if git diff --cached -- "$f" | grep -E '^\+[^+]?.*https?://[^"'"'"'\s/]+/storage/v1/(object|render/image)/public' > /dev/null; then
    violations="${violations}${f}\n"
  fi
done

if [ -n "$violations" ]; then
  printf '\n❌ Manual /storage/v1/ URL construction detected in:\n'
  printf "$violations" | sed 's/^/   /'
  printf '\nUse publicImageUrl() or renderImageUrl() from @amoeba/image-url instead.\n'
  printf 'If a new file legitimately needs raw URL access, add it to the allowlist in\n'
  printf '  ~/image-url/scripts/precommit-guard.sh\n\n'
  exit 1
fi

exit 0
