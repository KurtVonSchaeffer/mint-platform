import { NextRequest, NextResponse } from 'next/server';

const INTRO_COOKIE = 'algolend_seen_intro';

/**
 * First-visit splash gate.
 * If the visitor lands on `/` without the seen-intro cookie set, redirect to `/intro`.
 * The /intro page sets the cookie when the user clicks Enter or Skip.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate the homepage. Everything else passes through.
  if (pathname !== '/') return NextResponse.next();

  const seen = req.cookies.get(INTRO_COOKIE)?.value;
  if (seen === '1') return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/intro';
  return NextResponse.redirect(url);
}

export const config = {
  // Don't run on _next/*, api/*, the intro page itself, or static files.
  matcher: ['/((?!_next|api|intro|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2)).*)'],
};
