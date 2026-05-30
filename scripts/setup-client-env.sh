#!/usr/bin/env bash
# =============================================================================
# setup-client-env.sh
#
# Sets all required env vars on a client's Vercel project so that:
#   - Their app connects to their own Supabase
#   - API usage telemetry flows to mint-admin's central Supabase
#
# Usage:
#   ./scripts/setup-client-env.sh \
#     --project   prj_xxxxxxxxxxxx   \   ← Vercel project ID
#     --client-id 550e8400-e29b-...  \   ← UUID from mint-admin clients table
#     --supa-url  https://xxxx.supabase.co \
#     --anon-key  eyJh...            \
#     --service-key eyJh...
#
# Prerequisites:
#   - Vercel CLI installed: npm i -g vercel
#   - Logged in: vercel whoami
#   - MINT_TELEMETRY_URL and MINT_TELEMETRY_KEY in your shell env
#     (these come from mint-admin's Supabase, not the client's)
# =============================================================================

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ── Parse args ─────────────────────────────────────────────────────
PROJECT_ID=""
CLIENT_ID=""
SUPA_URL=""
ANON_KEY=""
SERVICE_KEY=""
TEAM_ID="${VERCEL_TEAM_ID:-}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --project)    PROJECT_ID="$2";   shift 2 ;;
    --client-id)  CLIENT_ID="$2";    shift 2 ;;
    --supa-url)   SUPA_URL="$2";     shift 2 ;;
    --anon-key)   ANON_KEY="$2";     shift 2 ;;
    --service-key) SERVICE_KEY="$2"; shift 2 ;;
    --team)       TEAM_ID="$2";      shift 2 ;;
    *) error "Unknown arg: $1" ;;
  esac
done

# ── Validate ───────────────────────────────────────────────────────
[[ -z "$PROJECT_ID"  ]] && error "--project is required (Vercel project ID)"
[[ -z "$CLIENT_ID"   ]] && error "--client-id is required (UUID from clients table)"
[[ -z "$SUPA_URL"    ]] && error "--supa-url is required"
[[ -z "$ANON_KEY"    ]] && error "--anon-key is required"
[[ -z "$SERVICE_KEY" ]] && error "--service-key is required"

TELEM_URL="${MINT_TELEMETRY_URL:-}"
TELEM_KEY="${MINT_TELEMETRY_KEY:-}"
[[ -z "$TELEM_URL" ]] && error "MINT_TELEMETRY_URL env var not set (mint-admin Supabase URL)"
[[ -z "$TELEM_KEY" ]] && error "MINT_TELEMETRY_KEY env var not set (mint-admin service role key)"

TEAM_FLAG=""
[[ -n "$TEAM_ID" ]] && TEAM_FLAG="--scope $TEAM_ID"

echo ""
echo "Setting env vars on Vercel project: $PROJECT_ID"
echo "Client UUID: $CLIENT_ID"
echo "Supabase:    $SUPA_URL"
echo ""

# ── Helper: set a Vercel env var on all environments ──────────────
set_env() {
  local key="$1"
  local value="$2"
  local sensitive="${3:-false}"

  # Remove existing first (ignore errors — may not exist yet)
  vercel env rm "$key" production  $TEAM_FLAG --yes 2>/dev/null || true
  vercel env rm "$key" preview     $TEAM_FLAG --yes 2>/dev/null || true
  vercel env rm "$key" development $TEAM_FLAG --yes 2>/dev/null || true

  if [[ "$sensitive" == "true" ]]; then
    # Pipe value to avoid it appearing in shell history
    printf '%s' "$value" | vercel env add "$key" production  $TEAM_FLAG --force 2>/dev/null
    printf '%s' "$value" | vercel env add "$key" preview     $TEAM_FLAG --force 2>/dev/null
    printf '%s' "$value" | vercel env add "$key" development $TEAM_FLAG --force 2>/dev/null
  else
    echo "$value" | vercel env add "$key" production  $TEAM_FLAG --force 2>/dev/null
    echo "$value" | vercel env add "$key" preview     $TEAM_FLAG --force 2>/dev/null
    echo "$value" | vercel env add "$key" development $TEAM_FLAG --force 2>/dev/null
  fi

  info "Set $key"
}

# Use the project directory approach — Vercel CLI needs a linked project
# We'll use the API directly for project-scoped env vars instead.
# This avoids needing to cd into the project directory.
API_TOKEN="${VERCEL_TOKEN:-$VERCEL_API_TOKEN}"
[[ -z "$API_TOKEN" ]] && error "VERCEL_TOKEN or VERCEL_API_TOKEN env var not set"

upsert_env_via_api() {
  local key="$1"
  local value="$2"
  local is_secret="${3:-false}"
  local env_type="encrypted"
  [[ "$is_secret" == "false" ]] && env_type="plain"

  local team_qs=""
  [[ -n "$TEAM_ID" ]] && team_qs="?teamId=$TEAM_ID"

  # Delete existing (all targets)
  for target in production preview development; do
    curl -s -X DELETE \
      "https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${key}?teamId=${TEAM_ID}" \
      -H "Authorization: Bearer $API_TOKEN" > /dev/null 2>&1 || true
  done

  # Create new
  local response
  response=$(curl -s -X POST \
    "https://api.vercel.com/v10/projects/${PROJECT_ID}/env${team_qs}" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"key\":    \"$key\",
      \"value\":  \"$value\",
      \"type\":   \"$env_type\",
      \"target\": [\"production\", \"preview\", \"development\"]
    }")

  if echo "$response" | grep -q '"error"'; then
    warn "  $key — $(echo "$response" | grep -o '"message":"[^"]*"' | head -1)"
  else
    info "  $key"
  fi
}

echo "── Client Supabase ───────────────────────────────────"
upsert_env_via_api "NEXT_PUBLIC_SUPABASE_URL"  "$SUPA_URL"    false
upsert_env_via_api "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY" false
upsert_env_via_api "SUPABASE_URL"              "$SUPA_URL"    false
upsert_env_via_api "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_KEY" true

echo ""
echo "── Mint Telemetry ────────────────────────────────────"
upsert_env_via_api "MINT_TELEMETRY_URL" "$TELEM_URL" false
upsert_env_via_api "MINT_TELEMETRY_KEY" "$TELEM_KEY" true
upsert_env_via_api "MINT_CLIENT_ID"     "$CLIENT_ID" false

echo ""
echo "── Triggering redeploy ───────────────────────────────"
TEAM_QS=""
[[ -n "$TEAM_ID" ]] && TEAM_QS="?teamId=$TEAM_ID"

DEPLOY=$(curl -s -X POST \
  "https://api.vercel.com/v13/deployments${TEAM_QS}" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${PROJECT_ID}\", \"target\": \"production\"}" 2>/dev/null || echo '{}')

if echo "$DEPLOY" | grep -q '"url"'; then
  DEPLOY_URL=$(echo "$DEPLOY" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
  info "Redeploy queued → https://$DEPLOY_URL"
else
  warn "Could not trigger redeploy automatically — redeploy manually in Vercel dashboard"
fi

echo ""
echo "────────────────────────────────────────────────────────"
echo "Done. Project $PROJECT_ID is configured."
echo ""
echo "Verify with:"
echo "  curl https://api.vercel.com/v9/projects/$PROJECT_ID/env \\"
echo "    -H 'Authorization: Bearer \$VERCEL_TOKEN'"
echo "────────────────────────────────────────────────────────"
