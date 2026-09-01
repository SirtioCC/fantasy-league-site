import { NextRequest } from 'next/server';
import { getEspnCredentials } from '@/lib/env';
import { isProxyableLogoHost } from '@/lib/teamLogoSrc';

export const runtime = 'nodejs';

const MAX_REDIRECTS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
/** Logos change rarely, and every visitor loads all twelve — cache hard so
 * this doesn't turn into a per-pageview round trip to ESPN. */
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';

/**
 * Re-serves a team logo that a manager uploaded to ESPN, which is only
 * fetchable with the league's ESPN cookies (see lib/teamLogoSrc.ts).
 *
 * Only ESPN hosts on the allowlist are fetchable, on https, and every
 * redirect hop is re-checked against the same list — otherwise this would
 * be an open proxy that happily attaches our ESPN credentials to whatever
 * URL a stranger passed in. Non-image responses are refused for the same
 * reason: it should not be usable to relay arbitrary content.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) return new Response('Missing url parameter', { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response('Malformed url parameter', { status: 400 });
  }

  if (target.protocol !== 'https:' || !isProxyableLogoHost(target.hostname)) {
    return new Response('Host not allowed', { status: 403 });
  }

  const creds = getEspnCredentials();
  const headers: Record<string, string> = {
    Accept: 'image/*',
    'User-Agent': 'Mozilla/5.0 (fantasy-league-site logo proxy)',
  };
  if (creds) headers.Cookie = `espn_s2=${creds.espnS2}; SWID=${creds.swid};`;

  let response: Response;
  let current = target;

  for (let hop = 0; ; hop++) {
    try {
      response = await fetch(current, { headers, redirect: 'manual', cache: 'no-store' });
    } catch {
      return new Response('Could not reach the image host', { status: 502 });
    }

    const location = response.status >= 300 && response.status < 400 && response.headers.get('location');
    if (!location) break;
    if (hop >= MAX_REDIRECTS) return new Response('Too many redirects', { status: 502 });

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return new Response('Bad redirect target', { status: 502 });
    }
    if (next.protocol !== 'https:' || !isProxyableLogoHost(next.hostname)) {
      return new Response('Redirect to a disallowed host', { status: 502 });
    }
    current = next;
  }

  // Anything but a real image (an ESPN error page, a 401, an HTML login
  // redirect) becomes a 404 so the client's onError swaps in the initials
  // avatar instead of rendering a broken image.
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.startsWith('image/') || !response.body) {
    return new Response('Logo unavailable', { status: 404 });
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    return new Response('Logo too large', { status: 413 });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': CACHE_CONTROL,
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
