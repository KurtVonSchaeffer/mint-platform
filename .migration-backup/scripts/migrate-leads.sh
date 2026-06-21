#!/usr/bin/env bash
# =============================================================================
# migrate-leads.sh
#
# Migrates existing leads from the local .shared/leads.jsonl file into the
# Supabase leads table (created by migration 012_leads.sql).
#
# Usage:
#   ./scripts/migrate-leads.sh
#
# Prerequisites:
#   - Migration 012_leads.sql already run in Supabase
#   - jq installed:  brew install jq
#   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

[[ -z "${SUPABASE_URL:-}"             ]] && error "SUPABASE_URL not set"
[[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}"]] && error "SUPABASE_SERVICE_ROLE_KEY not set"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEADS_FILE="$SCRIPT_DIR/../.shared/leads.jsonl"

[[ ! -f "$LEADS_FILE" ]] && error "No leads file found at $LEADS_FILE"

TOTAL=$(wc -l < "$LEADS_FILE" | tr -d ' ')
echo ""
echo "Found $TOTAL lead(s) in $LEADS_FILE"
echo ""

OK=0; SKIP=0; FAIL=0

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" ]] && continue

  ID=$(echo "$line"      | jq -r '.id')
  NAME=$(echo "$line"    | jq -r '.name')
  EMAIL=$(echo "$line"   | jq -r '.email')
  COMPANY=$(echo "$line" | jq -r '.company')
  MESSAGE=$(echo "$line" | jq -r '.message // ""')
  SOURCE=$(echo "$line"  | jq -r '.source // "manual"')
  STATUS=$(echo "$line"  | jq -r '.status // "new"')
  CREATED=$(echo "$line" | jq -r '.createdAt // .created_at // empty')

  # Validate source is one of the allowed enum values
  case "$SOURCE" in
    marketing-site|referral|manual) ;;
    *) SOURCE="manual" ;;
  esac

  # Validate status
  case "$STATUS" in
    new|contacted|qualified|won|lost) ;;
    *) STATUS="new" ;;
  esac

  echo -n "  $NAME ($EMAIL) ... "

  # Build the JSON payload
  PAYLOAD=$(jq -n \
    --arg id "$ID" \
    --arg name "$NAME" \
    --arg email "$EMAIL" \
    --arg company "$COMPANY" \
    --arg message "$MESSAGE" \
    --arg source "$SOURCE" \
    --arg status "$STATUS" \
    --arg created_at "$CREATED" \
    '{id: $id, name: $name, email: $email, company: $company,
      message: (if $message == "" then null else $message end),
      source: $source, status: $status,
      created_at: (if $created_at == "" then null else $created_at end)}
    | with_entries(select(.value != null))')

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/rest/v1/leads" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal,resolution=ignore-duplicates" \
    -d "$PAYLOAD")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -1)

  if [[ "$HTTP_CODE" == "201" ]] || [[ "$HTTP_CODE" == "200" ]]; then
    info "imported"
    OK=$((OK + 1))
  elif [[ "$HTTP_CODE" == "409" ]]; then
    warn "already exists (skipped)"
    SKIP=$((SKIP + 1))
  else
    echo -e "${RED}FAILED${NC} (HTTP $HTTP_CODE) — $BODY"
    FAIL=$((FAIL + 1))
  fi

done < "$LEADS_FILE"

echo ""
echo "════════════════════════════════════════════"
echo "  Imported:  $OK"
echo "  Skipped:   $SKIP  (already in DB)"
echo "  Failed:    $FAIL"
echo "════════════════════════════════════════════"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${YELLOW}Tip:${NC} If you see 'column does not exist', make sure"
  echo "     migration 012_leads.sql has been run in Supabase first."
  exit 1
fi

if [[ $OK -gt 0 ]]; then
  echo -e "${GREEN}Done.${NC} Leads are now in Supabase and will appear in"
  echo "      mint-admin → Leads once the dev server restarts."
fi
echo ""
