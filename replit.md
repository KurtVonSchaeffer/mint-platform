# AlgoLend

South African white-label lending platform marketing site with application intake flow.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/web run dev` — run the marketing site (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + wouter (routing) + Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Shaders: `@paper-design/shaders-react` (Warp) — requires WebGL in browser
- Fonts: Geist (loaded via Google Fonts in index.html)
- Build: esbuild (CJS bundle for API)

## Where things live

- `artifacts/web/src/pages/` — page components (Home, Apply, Demo, Privacy, Terms, Intro, Onboard, AdminTour)
- `artifacts/web/src/components/` — shared UI components
- `artifacts/web/src/App.tsx` — wouter routing
- `artifacts/web/src/index.css` — Tailwind + custom animations
- `artifacts/api-server/src/routes/leads.ts` — POST /api/leads (contact/enquiry form)
- `artifacts/api-server/src/routes/onboard.ts` — POST /api/onboard/start, GET /api/onboard/:token
- `lib/db/src/schema/leads.ts` — leads table schema

## Architecture decisions

- Migrated from Next.js 15 (Vercel) to React+Vite (Replit). Server components became client components.
- `next/link` → wouter `Link`, `useRouter` → wouter `useLocation`, `next/image` → `img`
- Server-only libs (email, leads-store) removed; replaced with Express API routes + Postgres
- WebGL shaders wrapped in React error boundaries to gracefully fall back when GPU not available
- `OnboardPage` fetches onboarding data client-side via `/api/onboard/:token` instead of server-side props

## Product

- Marketing site for AlgoLend — a fully branded, end-to-end credit management platform for South African credit providers
- Multi-step application form (Company → Directors → Documents → Review) that creates an onboarding token
- Contact/enquiry form saves leads to Postgres
- Privacy Policy and Terms pages

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- WebGL errors in Replit preview are expected (no GPU in sandbox). The shaders work in real browsers.
- `@ts-ignore` is acceptable — functional parity takes priority over zero TS errors
- Run `pnpm --filter @workspace/db run push` after any schema changes before restarting the API server

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
