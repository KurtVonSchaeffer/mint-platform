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

/**
 * Runs on every request.
 * 1. Rate-limits API routes per IP.
 * 2. Refreshes the Supabase session cookie so it never silently expires.
 * 3. Redirects unauthenticated requests to /login.
 * 4. Redirects authenticated users away from /login back to /.
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

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/marketplace') ||   // MINT integration — uses its own Bearer auth
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
    // Already logged in → skip login page
    const next = request.nextUrl.searchParams.get('next') ?? '/';
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = next;
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
