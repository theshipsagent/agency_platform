#!/usr/bin/env bash
#
# Audit trail regression guard — run in CI after typecheck/lint.
#
# Fails the build if any file under apps/web/app/api/ contains a raw mutation
# verb (INSERT INTO / UPDATE ... SET / DELETE FROM) but does NOT import
# `auditedMutation`. S2 requires every tenant-scoped write to go through the
# `auditedMutation(...)` helper from @shipops/db so an audit_logs row is
# written atomically with the mutation.
#
# This is a coarse check — a file that imports `auditedMutation` AND also has
# a raw `tenantQuery(... INSERT ...)` would pass at this level. Code review
# is expected to catch in-file mixing; this guard catches new-file regressions
# (the high-frequency failure mode).
#
# Operates only on committed files in the repo. Takes no external input.

set -euo pipefail

# Files containing mutation verbs in SQL template-literal positions.
# Each pattern requires a backtick (template-literal start) before the verb so
# the word appearing in English (a comment like "Build UPDATE query") does not
# false-positive. Whitespace after the backtick is allowed so multi-line SQL
# like  `INSERT INTO ...  or  `\n  UPDATE foo  also matches.
#
# UPDATE is matched followed by an identifier (table name) rather than SET,
# because UPDATE and SET commonly appear on separate lines in formatted SQL.
files_with_mutations=$(
  grep -rl -E "\`[[:space:]]*(INSERT INTO|UPDATE[[:space:]]+\"?[a-zA-Z_][a-zA-Z_0-9]*|DELETE FROM)" \
    apps/web/app/api \
    --include="*.ts" --include="*.tsx" \
    2>/dev/null \
    | sort -u \
    || true
)

if [ -z "$files_with_mutations" ]; then
  echo "✓ Audit trail guard: no mutation verbs found under apps/web/app/api/ (nothing to check)"
  exit 0
fi

violators=""
for f in $files_with_mutations; do
  if ! grep -q "auditedMutation" "$f"; then
    violators="${violators}${f}\n"
  fi
done

if [ -n "$violators" ]; then
  echo "ERROR: the following files contain raw INSERT/UPDATE/DELETE but do not import auditedMutation:"
  printf "$violators" | sed 's/^/  /'
  echo ""
  echo "S2 policy: every tenant-scoped write must go through auditedMutation()"
  echo "from @shipops/db so an audit_logs row is written atomically. Replace"
  echo "the tenantQuery/tenantQueryOne mutation call with auditedMutation."
  echo ""
  echo "See packages/db/src/audit.ts for the helper API."
  exit 1
fi

file_count=$(echo "$files_with_mutations" | wc -l | tr -d ' ')
echo "✓ Audit trail guard passed (${file_count} mutation file(s) checked, all import auditedMutation)"
