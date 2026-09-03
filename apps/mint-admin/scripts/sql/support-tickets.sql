-- Run in Supabase SQL editor to create the client help-desk ticket tables.
-- Tickets are submitted by a client's own deployed app (e.g. ZwaneOfficial)
-- via POST /api/public/support-tickets, authenticated with the client's
-- existing clients.lender_api_key as a Bearer token. Triaged and replied to
-- from mint-admin's /support pages.
--
-- Named client_support_tickets (not support_tickets) because a table called
-- support_tickets already exists in this project, built around a different
-- tenants/tenant_admins model that nothing in this app uses.

CREATE TABLE IF NOT EXISTS client_support_tickets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  subject             text        NOT NULL,
  message             text        NOT NULL,
  category            text        NOT NULL DEFAULT 'other',   -- technical | billing | compliance | feature_request | other
  priority            text        NOT NULL DEFAULT 'normal',  -- low | normal | high | urgent
  status              text        NOT NULL DEFAULT 'open',    -- open | in_progress | resolved | closed

  submitted_by_name   text,
  submitted_by_email  text,
  assigned_to         uuid,        -- mint-admin staff user id (auth.users.id), unassigned when null

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_support_tickets_client  ON client_support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_support_tickets_status  ON client_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_client_support_tickets_created ON client_support_tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS client_support_ticket_replies (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid        NOT NULL REFERENCES client_support_tickets(id) ON DELETE CASCADE,

  author_type  text        NOT NULL CHECK (author_type IN ('client', 'admin')),
  author_name  text,
  author_email text,
  message      text        NOT NULL,

  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_support_ticket_replies_ticket ON client_support_ticket_replies(ticket_id);
