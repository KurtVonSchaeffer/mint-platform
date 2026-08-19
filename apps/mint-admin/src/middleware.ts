import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ── In-memory rate limiter (per-instance, best-effort) ────────────────
// Protects mutation API routes from basic abuse. Not a substitute for
// proper edge rate limiting on high-traffic endpoints.
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_API = 120; // requests per minute per IP (all API)
const RATE_LIMIT_MUTATION = 30; // POST/PATCH/DELETE per minute per IP

type RateEntry = { count: number; windowStart: number };
const rateBuckets = new Map<string, RateEntry>();

function checkRate(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Prune stale entries every ~500 requests to avoid unbounded growth
let pruneCounter = 0;
function maybePrune() {
  if (++pruneCounter % 500 !== 0) return;
  const now = Date.now();
  for (const [k, v] of rateBuckets) {
    if (now - v.windowStart > RATE_WINDOW_MS) rateBuckets.delete(k);
  }
}

// ── Server-side role gating for API routes ─────────────────────────────
// Mirrors src/components/Shell.tsx's ROLE_ROUTES (which only hides nav
// links — it never blocked the underlying API calls). This is the actual
// enforcement point. Kept as prefix lists against /api/* rather than
// per-route checks so every existing route file stays untouched.
//
// Unlike Shell.tsx's client-side fallback (missing role → 'super_admin',
// the MOST privileged), a missing/unrecognised role here falls back to
// 'support' — the LEAST privileged — since this is the real security
// boundary, not a UI nicety.
const API_ROLE_ROUTES: Record<string, string[]> = {
  super_admin: ['*'],
  admin: [
    '/api/clients', '/api/leads', '/api/applications', '/api/quotes',
    '/api/invoices', '/api/billing', '/api/usage', '/api/compliance',
    '/api/migration', '/api/lender-policies', '/api/payfast/checkout',
    '/api/vercel', '/api/biztech',
  ],
  finance: [
    '/api/quotes', '/api/invoices', '/api/billing', '/api/payfast/checkout',
    '/api/biztech/quotes', '/api/biztech/invoices', '/api/biztech/reports',
  ],
  support: [
    '/api/clients', '/api/leads', '/api/applications',
    '/api/biztech/clients', '/api/biztech/contacts', '/api/biztech/documents',
    '/api/biztech/projects', '/api/biztech/tasks', '/api/biztech/activities',
    '/api/biztech/time-entries', '/api/biztech/services',
  ],
};

// Regardless of the map above: these are super_admin only. In particular,
// /api/users lets a caller create/edit/delete staff accounts and set an
// arbitrary role (including their own) with zero caller-role check today —
// any authenticated staff member, even 'support', can currently PATCH their
// own role to 'super_admin'. This closes that hole.
const SUPER_ADMIN_ONLY_API = ['/api/users'];

function apiRoleAllowed(pathname: string, role: string): boolean {
  if (SUPER_ADMIN_ONLY_API.some(p => pathname.startsWith(p))) {
    return role === 'super_admin';
  }
  const allKnownPrefixes = Object.values(API_ROLE_ROUTES).flat().filter(p => p !== '*');
  const isKnownArea = allKnownPrefixes.some(p => pathname.startsWith(p));
  if (!isKnownArea) return true; // ungated area — unchanged from today's behaviour

  const allowed = API_ROLE_ROUTES[role] ?? API_ROLE_ROUTES.support;
  if (allowed[0] === '*') return true;
  return allowed.some(p => pathname.startsWith(p));
}

/**
 * Runs on every request.
 * 1. Rate-limits API routes per IP.
 * 2. Refreshes the Supabase session cookie so it never silently expires.
 * 3. Redirects unauthenticated requests to /login.
 * 4. Redirects authenticated users away from /login back to /.
 * 5. Enforces role-based access to /api/* (see API_ROLE_ROUTES above).
 */
export async function middleware(request: NextRequest) {
  maybePrune();

  const { pathname } = request.nextUrl;
  const reqMethod = request.method;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(reqMethod);
    const limit = isMutation ? RATE_LIMIT_MUTATION : RATE_LIMIT_API;
    const bucketKey = `${ip}:${isMutation ? 'mut' : 'read'}`;
    if (!checkRate(bucketKey, limit)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
  }

  // If Supabase env vars aren't configured, pass through — avoids a hard 500
  // crash on every request. Pages that need DB access will handle missing config.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: ()  => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: always call getUser() — this is what refreshes the session.
  const { data: { user } } = await supabase.auth.getUser();

  // Allow public paths through without auth
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/set-password') ||
    pathname.startsWith('/onboard') ||            // public client self-onboarding form
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public/') ||        // public API endpoints (rate-limited)
    pathname.startsWith('/api/marketplace') ||   // MINT integration — uses its own Bearer auth
    pathname === '/api/payfast/notify' ||        // PayFast ITN webhook — verified by IP + signature in-route, not a staff session
    pathname === '/api/billing/cron' ||           // Vercel Cron — verified by CRON_SECRET bearer token in-route, not a staff session
    pathname === '/api/biztech/invoices/reminders-cron' || // same as above
    pathname === '/api/biztech/recurring-invoices/cron' || // same as above
    pathname.startsWith('/api/cron/') ||          // all Vercel cron jobs — verified by CRON_SECRET bearer token in-route
    pathname === '/api/telemarketer/twilio/voice' ||      // Twilio calls this webhook directly — no staff session to carry
    pathname === '/api/telemarketer/twilio/status' ||     // Twilio status-callback webhook — same as above
    pathname === '/api/telemarketer/twilio/recording' ||  // Twilio recording-status webhook — same as above
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  if (!user && !isPublic) {
    // API callers get JSON 401, not an HTML redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    // Page routes → redirect to login preserving the intended destination
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === '/login') {
    const role = (user.user_metadata?.role as string | undefined) ?? 'support';
    const next = request.nextUrl.searchParams.get('next');
    const defaultHome = ['telemarketer', 'manager'].includes(role) ? '/telemarketer' : '/';
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = next ?? defaultHome;
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  // Gate /telemarketer routes — only these roles may enter
  if (user && pathname.startsWith('/telemarketer')) {
    const role = (user.user_metadata?.role as string | undefined) ?? 'support';
    if (!['super_admin', 'manager', 'telemarketer'].includes(role)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect telemarketer/manager away from admin routes
  if (user && !pathname.startsWith('/telemarketer') && !pathname.startsWith('/api/') && !isPublic) {
    const role = (user.user_metadata?.role as string | undefined) ?? 'support';
    if (['telemarketer', 'manager'].includes(role)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/telemarketer';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && pathname.startsWith('/api/') && !isPublic) {
    const role = (user.user_metadata?.role as string | undefined) ?? 'support';
    if (!apiRoleAllowed(pathname, role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
