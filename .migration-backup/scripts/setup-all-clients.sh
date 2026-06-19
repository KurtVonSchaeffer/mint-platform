#!/usr/bin/env bash
# =============================================================================
# setup-all-clients.sh
#
# Queries the mint-admin Supabase for all active clients that have a
# vercel_project_id set, then calls setup-client-env.sh for each one.
#
# You still need to supply the per-client Supabase URL + keys — those
# aren't stored in mint-admin (by design). Edit the CLIENTS array below.
#
# Usage:
#   ./scripts/setup-all-clients.sh
#
# Prerequisites:
#   - jq installed:  brew install jq
#   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set (mint-admin project)
#   - VERCEL_TOKEN and VERCEL_TEAM_ID set
#   - MINT_TELEMETRY_URL and MINT_TELEMETRY_KEY set
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Required env ───────────────────────────────────────────────────
[[ -z "${SUPABASE_URL:-}"             ]] && error "SUPABASE_URL not set"
[[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}"]] && error "SUPABASE_SERVICE_ROLE_KEY not set"
[[ -z "${VERCEL_TOKEN:-}"             ]] && error "VERCEL_TOKEN not set"
[[ -z "${MINT_TELEMETRY_URL:-}"       ]] && error "MINT_TELEMETRY_URL not set"
[[ -z "${MINT_TELEMETRY_KEY:-}"       ]] && error "MINT_TELEMETRY_KEY not set"

# =============================================================================
# EDIT THIS SECTION — add each client's own Supabase credentials.
# Key = client slug (must match what's in the clients table).
# =============================================================================
declare -A CLIENT_SUPA_URL=(
  ["bridgecap"]="https://xxxx.supabase.co"
  ["apex"]="https://yyyy.supabase.co"
  ["nexus"]="https://zzzz.supabase.co"
)
declare -A CLIENT_ANON_KEY=(
  ["bridgecap"]="eyJh..."
  ["apex"]="eyJh..."
  ["nexus"]="eyJh..."
)
declare -A CLIENT_SERVICE_KEY=(
  ["bridgecap"]="eyJh..."
  ["apex"]="eyJh..."
  ["nexus"]="eyJh..."
)
# =============================================================================

echo ""
echo "Fetching clients from mint-admin Supabase..."

# Pull clients that have a vercel_project_id
CLIENTS_JSON=$(curl -s \
  "${SUPABASE_URL}/rest/v1/clients?select=id,slug,name,vercel_project_id,status&vercel_project_id=not.is.null&deleted_at=is.null" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json")

if ! echo "$CLIENTS_JSON" | jq -e '.[0]' > /dev/null 2>&1; then
  warn "No clients found with vercel_project_id set."
  warn "Set vercel_project_id on each client record first, or use the"
  warn "Import from Vercel button in mint-admin → Clients."
  exit 0
fi

COUNT=$(echo "$CLIENTS_JSON" | jq length)
echo "Found $COUNT client(s) with Vercel projects linked."
echo ""

echo "$CLIENTS_JSON" | jq -c '.[]' | while IFS= read -r client; do
  SLUG=$(echo "$client" | jq -r '.slug')
  NAME=$(echo "$client" | jq -r '.name')
  ID=$(echo "$client"   | jq -r '.id')
  PROJECT=$(echo "$client" | jq -r '.vercel_project_id')

  echo "────────────────────────────────────────────────────────"
  echo "Client: $NAME ($SLUG)"
  echo "UUID:   $ID"
  echo "Vercel: $PROJECT"

  # Check we have credentials for this slug
  if [[ -z "${CLIENT_SUPA_URL[$SLUG]:-}" ]]; then
    warn "No Supabase credentials defined for slug '$SLUG' — skipping."
    warn "Add them to the CLIENTS arrays at the top of this script."
    continue
  fi

  "$SCRIPT_DIR/setup-client-env.sh" \
    --project    "$PROJECT" \
    --client-id  "$ID" \
    --supa-url   "${CLIENT_SUPA_URL[$SLUG]}" \
    --anon-key   "${CLIENT_ANON_KEY[$SLUG]}" \
    --service-key "${CLIENT_SERVICE_KEY[$SLUG]}"

  echo ""
done

echo "════════════════════════════════════════════════════════"
echo "All clients configured."
echo "API usage will appear in mint-admin → API Usage once"
echo "each deployment picks up the new env vars."
echo "════════════════════════════════════════════════════════"
