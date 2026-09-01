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
    // ESPN's image host answers `Accept: image/*` with a 406, so ask for
    // anything and validate what actually comes back instead.
    Accept: '*/*',
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

  const contentType = response.headers.get('content-type') ?? '';

  // Outside production, ?debug=1 reports what ESPN actually said instead of
  // collapsing every failure into a bare 404 — otherwise a refused logo is
  // indistinguishable from a missing one. Never enabled in production: the
  // upstream body can echo back account or auth detail.
  if (process.env.NODE_ENV !== 'production' && request.nextUrl.searchParams.get('debug') === '1') {
    const snippet = await response
      .text()
      .then((body) => body.slice(0, 400))
      .catch(() => '<unreadable body>');
    return Response.json({
      requested: target.toString(),
      finalUrl: current.toString(),
      sentCredentials: Boolean(creds),
      upstreamStatus: response.status,
      upstreamContentType: contentType,
      upstreamHeaders: Object.fromEntries(response.headers),
      bodySnippet: snippet,
    });
  }

  // Anything but a real image (an ESPN error page, a 401, an HTML login
  // redirect) becomes a 404 so the client's onError swaps in the initials
  // avatar instead of rendering a broken image.
  if (!response.ok || !response.body) {
    return new Response('Logo unavailable', { status: 404 });
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    return new Response('Logo too large', { status: 413 });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readCapped(response.body, MAX_BYTES);
  } catch {
    return new Response('Logo too large', { status: 413 });
  }

  // Trust the upstream content type only when it actually claims an image;
  // otherwise sniff the bytes. ESPN does not always label these uploads, and
  // serving unidentifiable bytes as an image is how a proxy turns into a
  // content-relay, so anything unrecognized is refused.
  const resolvedType = contentType.startsWith('image/') ? contentType : sniffImageType(bytes);
  if (!resolvedType) {
    return new Response('Logo unavailable', { status: 404 });
  }

  // readCapped allocates the buffer at exactly byteLength, so handing over
  // the underlying ArrayBuffer sends precisely these bytes and no more.
  return new Response(bytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': resolvedType,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': CACHE_CONTROL,
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** Reads a stream into memory, aborting past `limit` bytes so an unbounded
 * or chunked response can't be used to exhaust memory. */
async function readCapped(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error('Response exceeded size limit');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Identifies an image by its magic bytes, for responses that arrive with a
 * missing or generic content type. Returns null if it isn't a known image. */
function sniffImageType(bytes: Uint8Array): string | null {
  const startsWith = (...sig: number[]) => sig.every((byte, i) => bytes[i] === byte);

  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (startsWith(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  if (startsWith(0x42, 0x4d)) return 'image/bmp';
  if (startsWith(0x00, 0x00, 0x01, 0x00)) return 'image/x-icon';
  // RIFF....WEBP
  if (startsWith(0x52, 0x49, 0x46, 0x46) && [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[8 + i] === b)) {
    return 'image/webp';
  }

  // SVG is text, so check the opening bytes for a root <svg> — either
  // directly, or after an XML prolog / doctype / comments.
  const head = new TextDecoder()
    .decode(bytes.subarray(0, 1024))
    .replace(/^﻿/, '')
    .trimStart();
  if (/^<svg[\s>]/i.test(head)) return 'image/svg+xml';
  if (/^<\?xml[\s?]/i.test(head) && /<svg[\s>]/i.test(head)) return 'image/svg+xml';

  return null;
}
