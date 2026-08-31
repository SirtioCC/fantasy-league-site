/**
 * ESPN owner IDs are GUIDs wrapped in curly braces, e.g. `{B2E96EB5-...}`.
 * Curly braces are legal-but-fragile in URL paths — some layers percent-encode
 * them, some don't, and round-tripping through Next.js's route param decoding
 * isn't reliable. Rather than depend on that, we strip the braces before
 * building any `/teams/${...}` link and re-add them before the DB lookup.
 */
const GUID_PATTERN = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;

export function ownerIdToSlug(ownerId: string): string {
  return ownerId.replace(/^\{|\}$/g, '');
}

export function slugToOwnerId(slug: string): string {
  const decoded = decodeURIComponent(slug).replace(/^\{|\}$/g, '');
  return GUID_PATTERN.test(decoded) ? `{${decoded}}` : slug;
}
