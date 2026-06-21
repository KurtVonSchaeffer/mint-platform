# Shared dev storage

This directory holds dev-only shared state between the `web` (marketing) and
`mint-admin` apps — currently the leads JSONL file.

**Production note:** in production the leads pipeline must move to a real
backend (Supabase `leads` table, or Vercel Marketplace storage). This file-based
approach only works when both apps run on the same machine.
