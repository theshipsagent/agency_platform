#!/usr/bin/env bash
#
# Input validation regression guard — run in CI after typecheck/lint.
#
# Fails the build if any file under apps/web/app/api/ uses the raw
# `req.json() as { ... }` TypeScript-cast pattern instead of going through
# the Zod-validated `parseBody(...)` helper. S2.5 requires every request
# body to be validated at the boundary so unknown fields are rejected,
# enum constraints are enforced, and clients get a consistent 400 error
# shape.
#
# Discriminator: `req.json() as` — NOT bare `req.json()`. The latter is
# legitimate inside `parseBody(Schema, await req.json())`. The TypeScript
# cast suffix is the anti-pattern we are closing.
#
# Operates only on committed files in the repo. Takes no external input.

set -euo pipefail

violators=$(
  grep -rn -E "req\.json\(\)[[:space:]]+as[[:space:]]" \
    apps/web/app/api \
    --include="*.ts" --include="*.tsx" \
    2>/dev/null \
    || true
)

if [ -n "$violators" ]; then
  echo "ERROR: raw req.json() cast pattern found in apps/web/app/api/:"
  echo "$violators" | sed 's/^/  /'
  echo ""
  echo "S2.5 policy: every request body must be validated at the boundary"
  echo "via parseBody(Schema, await req.json()) from @/lib/api/parse."
  echo "Schemas live in packages/shared/src/validation/index.ts."
  echo ""
  echo "Example:"
  echo "  import { parseBody } from '@/lib/api/parse'"
  echo "  import { MySchema } from '@shipops/shared/validation'"
  echo "  const parsed = parseBody(MySchema, await req.json())"
  echo "  if (!parsed.ok) return parsed.response"
  echo "  const body = parsed.data"
  exit 1
fi

echo "✓ Input validation guard passed (no raw req.json() casts in apps/web/app/api/)"
