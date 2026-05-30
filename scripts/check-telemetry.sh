#!/usr/bin/env bash
# =============================================================================
# check-telemetry.sh
#
# Checks whether API usage events are flowing in from each client.
# Shows total events, last event time, and error rate per client.
#
# Usage:
#   ./scripts/check-telemetry.sh
#   ./scripts/check-telemetry.sh --since 2026-05-01   # filter by date
#
# Prerequisites:
#   - jq installed
#   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set (mint-admin project)
# =============================================================================

set -euo pipefail

[[ -z "${SUPABASE_URL:-}"             ]] && { echo "Error: SUPABASE_URL not set"; exit 1; }
[[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}"]] && { echo "Error: SUPABASE_SERVICE_ROLE_KEY not set"; exit 1; }

SINCE="${1:-}"
[[ "$1" == "--since" ]] && SINCE="$2"
[[ -z "$SINCE" ]] && SINCE=$(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ')

echo ""
echo "Telemetry report — events since $SINCE"
echo "──────────────────────────────────────────────────────────────────"

# Query the monthly_summary view
SUMMARY=$(curl -s \
  "${SUPABASE_URL}/rest/v1/rpc/query" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"select c.name, c.slug, count(e.id) as total_calls, count(e.id) filter (where e.status >= 400) as errors, max(e.ts) as last_event from clients c left join mint_telemetry.api_events e on e.client_id = c.id and e.ts >= '${SINCE}' where c.deleted_at is null group by c.id, c.name, c.slug order by total_calls desc\"}" \
  2>/dev/null || echo "[]")

if ! echo "$SUMMARY" | jq -e '.[0]' > /dev/null 2>&1; then
  # Fallback: query via PostgREST view
  SUMMARY=$(curl -s \
    "${SUPABASE_URL}/rest/v1/mint_telemetry_monthly_summary?select=*" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    2>/dev/null || echo "[]")
fi

printf "%-30s %-12s %-12s %-10s %s\n" "Client" "Total calls" "Errors" "Error%" "Last event"
echo "──────────────────────────────────────────────────────────────────"

# Direct query via Supabase RPC
curl -s \
  "${SUPABASE_URL}/rest/v1/clients?select=id,name,slug&deleted_at=is.null" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
| jq -r '.[] | [.id, .name, .slug] | @tsv' \
| while IFS=$'\t' read -r cid name slug; do
    STATS=$(curl -s \
      "${SUPABASE_URL}/rest/v1/mint_telemetry.api_events?client_id=eq.${cid}&ts=gte.${SINCE}&select=status,ts" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      2>/dev/null || echo "[]")

    TOTAL=$(echo "$STATS" | jq 'length')
    ERRS=$(echo "$STATS"  | jq '[.[] | select(.status >= 400)] | length')
    LAST=$(echo "$STATS"  | jq -r 'max_by(.ts) | .ts // "—"')
    PCT=0
    [[ "$TOTAL" -gt 0 ]] && PCT=$(echo "scale=1; $ERRS * 100 / $TOTAL" | bc)

    if [[ "$TOTAL" -eq 0 ]]; then
      printf "%-30s %-12s %-12s %-10s %s\n" "$name" "0" "—" "—" "No events yet"
    else
      printf "%-30s %-12s %-12s %-10s %s\n" "$name" "$TOTAL" "$ERRS" "${PCT}%" "${LAST:0:19}"
    fi
  done

echo "──────────────────────────────────────────────────────────────────"
echo ""
echo "If a client shows 0 events, check their Vercel project has:"
echo "  MINT_TELEMETRY_URL, MINT_TELEMETRY_KEY, MINT_CLIENT_ID"
echo ""
