import { NextRequest, NextResponse } from 'next/server';

const INTRO_COOKIE = 'algolend_seen_intro';

/**
 * First-visit splash gate.
 * If the visitor lands on `/` without the seen-intro cookie set, redirect to `/intro`.
 * The /intro page sets the cookie when the user clicks Enter or Skip.
 * Search engine crawlers bypass the gate so Google indexes the homepage content.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate the homepage. Everything else passes through.
  if (pathname !== '/') return NextResponse.next();

  // Let search engine crawlers see the homepage directly — they don't accept cookies
  // and /intro has noindex, so without this bypass Google never indexes the site.
  const ua = req.headers.get('user-agent') ?? '';
  const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|facebot|facebookexternalhit/i.test(ua);
  if (isBot) return NextResponse.next();

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
