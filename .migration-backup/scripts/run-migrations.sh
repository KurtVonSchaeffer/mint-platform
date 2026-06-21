#!/usr/bin/env bash
# =============================================================================
# run-migrations.sh
#
# Runs all SQL migrations against your Supabase database.
# Uses psql — needs your Supabase connection string.
#
# Option A — run all at once (recommended for fresh DB):
#   ./scripts/run-migrations.sh --all
#
# Option B — run a single file:
#   ./scripts/run-migrations.sh 011_telemetry_and_vercel_linking.sql
#
# Option C — run from a specific migration onwards:
#   ./scripts/run-migrations.sh --from 009
#
# Prerequisites:
#   - psql installed: brew install libpq && brew link --force libpq
#   - DATABASE_URL set:
#       export DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
#     (Get this from: Supabase dashboard → Project Settings → Database → Connection string → URI)
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../db/migrations" && pwd)"

[[ -z "${DATABASE_URL:-}" ]] && error "DATABASE_URL is not set.
  Get it from: Supabase dashboard → Project Settings → Database → URI
  Export it:   export DATABASE_URL=\"postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres\""

# ── Check psql is available ────────────────────────────────────────
if ! command -v psql &>/dev/null; then
  error "psql not found.
  macOS:  brew install libpq && brew link --force libpq
  Ubuntu: sudo apt-get install postgresql-client"
fi

MODE="${1:-}"
FROM_PREFIX=""

case "$MODE" in
  --all)
    FILES=($(ls "$MIGRATIONS_DIR"/[0-9]*.sql | sort))
    ;;
  --from)
    FROM_PREFIX="${2:-}"
    [[ -z "$FROM_PREFIX" ]] && error "--from requires a prefix, e.g. --from 009"
    FILES=($(ls "$MIGRATIONS_DIR"/[0-9]*.sql | sort | awk -F'/' -v p="$FROM_PREFIX" '{ n=$NF; if (n >= p) print }'))
    ;;
  "")
    # Default: run everything
    FILES=($(ls "$MIGRATIONS_DIR"/[0-9]*.sql | sort))
    ;;
  *)
    # Single file name passed
    if [[ -f "$MIGRATIONS_DIR/$MODE" ]]; then
      FILES=("$MIGRATIONS_DIR/$MODE")
    elif [[ -f "$MODE" ]]; then
      FILES=("$MODE")
    else
      error "File not found: $MODE"
    fi
    ;;
esac

if [[ ${#FILES[@]} -eq 0 ]]; then
  warn "No migration files matched."
  exit 0
fi

echo ""
echo "Running ${#FILES[@]} migration(s) against:"
echo "  $(echo "$DATABASE_URL" | sed 's/:.*@/@/')"   # hide password in output
echo ""

FAILED=0
for f in "${FILES[@]}"; do
  NAME=$(basename "$f")
  echo -n "  $NAME ... "
  if psql "$DATABASE_URL" -f "$f" --single-transaction -q 2>&1; then
    info "done"
  else
    echo -e "${RED}FAILED${NC}"
    FAILED=$((FAILED + 1))
    warn "Stopping — fix the error above before continuing."
    echo ""
    echo "Re-run from this file with:"
    echo "  ./scripts/run-migrations.sh $NAME"
    exit 1
  fi
done

echo ""
if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}All migrations completed successfully.${NC}"
else
  echo -e "${RED}$FAILED migration(s) failed.${NC}"
  exit 1
fi
echo ""
