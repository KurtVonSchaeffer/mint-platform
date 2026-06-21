#!/usr/bin/env bash
# =============================================================================
# get-client-ids.sh
#
# Prints a table of all clients with their UUIDs, slugs, Vercel project IDs,
# and migration status. Use this to get the MINT_CLIENT_ID values.
#
# Usage:
#   ./scripts/get-client-ids.sh
#
# Prerequisites:
#   - jq installed:  brew install jq
#   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set (mint-admin project)
# =============================================================================

set -euo pipefail

[[ -z "${SUPABASE_URL:-}"             ]] && { echo "Error: SUPABASE_URL not set"; exit 1; }
[[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}"]] && { echo "Error: SUPABASE_SERVICE_ROLE_KEY not set"; exit 1; }

echo ""
echo "Clients in mint-admin database:"
echo "────────────────────────────────────────────────────────────────────────────────"
printf "%-28s %-20s %-38s %-12s %s\n" "UUID (MINT_CLIENT_ID)" "Slug" "Name" "Status" "Vercel"
echo "────────────────────────────────────────────────────────────────────────────────"

curl -s \
  "${SUPABASE_URL}/rest/v1/clients?select=id,slug,name,status,vercel_project_id,migration_status&deleted_at=is.null&order=created_at.asc" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
| jq -r '.[] | [.id, .slug, .name, .status, (.vercel_project_id // "—")] | @tsv' \
| while IFS=$'\t' read -r id slug name status vercel; do
    printf "%-28s %-20s %-38s %-12s %s\n" "$id" "$slug" "$name" "$status" "$vercel"
  done

echo "────────────────────────────────────────────────────────────────────────────────"
echo ""
echo "Copy the UUID from the first column into each client's Vercel project as:"
echo "  MINT_CLIENT_ID=<uuid>"
echo ""
