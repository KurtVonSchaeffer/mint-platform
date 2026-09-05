# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internal MINT Platforms / AlgoLend staff only — telemarketers (TMs) working leads and calling prospects, admins managing clients/billing/compliance, finance staff, support staff, and managers (roles: `super_admin`, `admin`, `finance`, `support`, `manager`, `telemarketer`). AlgoLend's clients (the credit-provider lenders who use the AlgoLend product) never log into this console directly — each client runs their own separately deployed AlgoLend instance (its own app and database), and mint-admin is the internal control plane that manages the business relationship with them from the outside.

## Product Purpose

The internal operations and sales control plane for AlgoLend, MINT Platforms' B2B loan-management SaaS product. Staff use it to run the sales pipeline (leads → quotes → won clients), manage onboarded clients (billing, feature flags, API usage quotas, compliance), triage support tickets submitted from every client's deployed instance in one central queue, and track telemarketer performance and commissions. Success means the ops/sales team can run a client's entire lifecycle — first contact through active, paying, supported client — from one tool.

## Positioning

AlgoLend's single credit-check principle: a bureau pull happens once per applicant and is reused/routed across every lender in the marketplace, rather than each lender re-pulling credit separately — protecting the applicant's score. This is also the technical bridge between AlgoLend (the B2B loan management system) and MINT (the B2C borrower marketplace): a generic lending CRM/admin tool couldn't truthfully copy this, because it doesn't sit inside a marketplace of multiple lenders sharing one bureau check.

## Operating Context

- **Sales pipeline:** leads arrive from the marketing site (algolend.co.za) or manual entry, are auto-assigned round-robin to TMs, and progress through call outcomes (New Lead → Contacted → Demo → Proposal → Won) logged via Twilio.
- **Calling:** every outbound call is placed through Twilio (not plain `tel:` links), so it's logged, recorded, and attributable to an agent and a lead.
- **Client lifecycle:** quotes require manager approval before activation; commission is 25% of monthly recurring fee, one-time. Once won, a client gets its own separately deployed instance + database — mint-admin's own `clients` table is internal CRM/billing bookkeeping, not that client's live product data.
- **Support:** each client's deployed instance submits support tickets via an authenticated API call (their `lender_api_key`); mint-admin centralizes triage across every client in one queue rather than staff checking each client's database separately.
- **Compliance:** NCR (National Credit Regulator) obligations are a real, ongoing operating requirement, reflected in dedicated compliance/registers tooling in the product.

## Capabilities and Constraints

- Multi-tenant by *deployment*, not by shared database: each client is a fully separate app + Supabase project. Don't assume client product data is reachable from mint-admin's own database.
- Twilio Voice SDK powers all calling; call outcomes and recordings are the system of record for TM activity.
- SACRRA monthly bureau reporting (layout 700 format) appears in the codebase as a technical/regulatory requirement — noted as observed evidence, not confirmed this session as binding on mint-admin itself versus each client's own deployment.
- POPIA (South African data protection law) is plausibly relevant given borrower/consumer personal and financial data flowing through the business, but was not explicitly confirmed as a hard constraint this session — treat as an open question, not a documented requirement.

## Brand Commitments

AlgoLend brand (violet/purple accent, "AlgoLend" wordmark) for this product; MINT Platforms (Pty) Ltd is the parent company, referenced in footers and emails as "A product of MINT Platforms (Pty) Ltd."

## Evidence on Hand

- Real, non-fabricated client/lender records exist in the `clients` table (active and trial-status lenders) — do not invent case studies, testimonials, or press for this internal tool.
- "Zwane" is a specific, real onboarded client referenced by name in the codebase (invoice generation, its own credit-check service) — a real case, not a generic template to imitate uncritically for other clients.

## Product Principles

1. One tool for the whole client lifecycle — sales, onboarding, billing, support — instead of separate systems per function.
2. Every client's live product data stays inside their own separate deployment; mint-admin centralizes only what the internal ops team genuinely needs one queue for (CRM, billing, support triage).
3. Calling and its outcomes are always logged and attributable — no call happens outside Twilio's tracking.
4. NCR compliance is an operating constraint the product exists partly to satisfy, not an afterthought bolted onto a generic CRM.

## Accessibility & Inclusion

NCR compliance is confirmed as a hard, non-negotiable constraint. No other accessibility or compliance standard was established this session — do not assert WCAG or other conformance claims without a separate confirmation.
