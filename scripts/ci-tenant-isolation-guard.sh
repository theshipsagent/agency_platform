#!/usr/bin/env bash
#
# Tenant isolation regression guard — run in CI after typecheck/lint.
#
# Fails the build if:
#   1. The literal 'tenant-gca-001' appears in apps/ outside lib/api/auth.ts
#      (S1 centralized this string; new occurrences indicate a regression).
#   2. unscopedQuery / unscopedQueryOne is imported anywhere in apps/
#      (unscoped variants are reserved for seed scripts and DB migrations).
#
# Operates only on committed files in the repo. Takes no external input.

set -euo pipefail

bad_literals=$(grep -rn "tenant-gca-001" apps/ --include="*.ts" --include="*.tsx" \
  | grep -v "lib/api/auth.ts" \
  || true)

if [ -n "$bad_literals" ]; then
  echo "ERROR: hardcoded tenant ID found in apps/ outside lib/api/auth.ts:"
  echo "$bad_literals"
  echo ""
  echo "Use getTenantId() from @/lib/api/auth instead of the literal."
  exit 1
fi

bad_imports=$(grep -rn "unscopedQuery" apps/ --include="*.ts" --include="*.tsx" \
  || true)

if [ -n "$bad_imports" ]; then
  echo "ERROR: unscopedQuery is referenced from app code (reserved for seed/migrations):"
  echo "$bad_imports"
  echo ""
  echo "Use tenantQuery / tenantQueryOne instead — they require tenantId at the type level."
  exit 1
fi

echo "✓ Tenant isolation guards passed"
