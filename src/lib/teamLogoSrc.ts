/**
 * ESPN serves team logos from two very different places:
 *
 * - Stock logo packs and other public CDN images (g.espncdn.com), plus any
 *   external URL a manager pasted in — all publicly fetchable, so the
 *   browser can load them directly.
 * - Files a manager *uploaded* to ESPN, which land on an authenticated API
 *   host. A visitor's browser has no ESPN session, so those 401/403 and the
 *   logo silently falls back to an initials avatar.
 *
 * The second kind has to be fetched server-side, where the ESPN credentials
 * live, and re-served from our own origin.
 */
const PROXIED_LOGO_HOSTS = new Set(['mystique-api.fantasy.espn.com']);

export function isProxyableLogoHost(hostname: string): boolean {
  return PROXIED_LOGO_HOSTS.has(hostname.toLowerCase());
}

/** True when this logo can only be fetched with ESPN credentials. */
export function needsLogoProxy(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && isProxyableLogoHost(parsed.hostname);
  } catch {
    return false;
  }
}

/** The URL to actually put in an <img src>, routing auth-gated ESPN
 * uploads through our own proxy and leaving public images untouched. */
export function teamLogoSrc(url: string): string {
  return needsLogoProxy(url) ? `/api/team-logo?url=${encodeURIComponent(url)}` : url;
}
