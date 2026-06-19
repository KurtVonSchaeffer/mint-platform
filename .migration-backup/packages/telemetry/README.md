# @mint/telemetry

Central API-usage telemetry pipeline for all AlgoLend client deployments.

## Architecture

```
[Client A's Express] ─┐
[Client B's Express] ─┼──► mint_telemetry Supabase ──► Mint admin /usage
[Client C's Express] ─┘    (events + external_api_calls)
```

A dedicated Supabase project (`mint_telemetry`) lives separately from every
client's own database. Each client's deployment pushes events here via a
**service-role key** that only Mint Platforms holds.

## Setup

### 1. Create the central Supabase project

Once, in the Supabase dashboard:

1. Create a new project named `mint-telemetry`.
2. Run `sql/001_schema.sql` against it via the SQL editor.
3. Copy the project URL and service-role key.

### 2. Per-client env vars

For each client's Vercel deployment, add:

```bash
MINT_TELEMETRY_URL=https://<mint-telemetry-project>.supabase.co
MINT_TELEMETRY_KEY=<service-role-key>
CLIENT_SLUG=bridgecapital            # or apexcredit, nexusbiz, etc.
```

Also `INSERT` a row in the central `clients` table for that slug
(or do it via mint-admin's onboarding flow).

### 3. Mount the middleware in ZwaneOfficial

In `server.js`:

```js
const { telemetry } = require('@mint/telemetry');

// Mount BEFORE your /api routes so it captures every call.
app.use('/api', telemetry());
```

That's it. Every `/api/*` call now buffers an event in memory and flushes to
the central DB every 5s (or sooner if 50+ events accumulate). The middleware
is non-blocking — telemetry failures never break the request path.

### 4. Log external paid-API calls

For Experian / TruID / DocuSeal calls — where every call has a real ZAR cost
that gets passed through to the client — add a `logExternal` call after each:

```js
const { logExternal } = require('@mint/telemetry');

// After an Experian consumer credit-score call
await logExternal({
  provider: 'experian',
  endpoint: 'consumer_score',
  cost_zar_cents: 800,        // R 8.00
  reference: experianResult.requestId,
  status: experianResult.ok ? 'success' : 'failure',
});
```

Mint admin reads these on the `/usage` page (per-endpoint counts, error rate,
p99 latency) and the `/invoices` page (monthly pass-through-cost invoices
are auto-generated from `monthly_external_costs`).

## What gets logged

| Table | Purpose | Cardinality |
|---|---|---|
| `events` | Every `/api/*` request | High (1 row per request) |
| `external_api_calls` | Each Experian/TruID/DocuSeal call | Low (1 row per paid call) |
| `daily_usage` | Materialized view, refreshed nightly | Aggregate |
| `monthly_external_costs` | Materialized view for invoicing | Aggregate |
| `current_month_usage` | View — quota consumption per client | Live |

## What does NOT get logged

- Request bodies or response bodies (privacy + payload size)
- Authentication credentials of any kind
- PII beyond `user_id` (Supabase UUID) and truncated IP

POPIA-safe by design.

## Refreshing the materialized views

Add a cron job (Vercel Cron or Supabase Scheduled Function) to run nightly:

```sql
refresh materialized view concurrently daily_usage;
refresh materialized view concurrently monthly_external_costs;
```
