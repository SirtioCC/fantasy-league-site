'use client';

import { useEffect, useRef, useState } from 'react';
import { initialsFor, ownerColor } from '@/lib/ownerColor';

const SIZES = {
  sm: 'h-6 w-6 text-[0.55rem]',
  md: 'h-9 w-9 text-[0.7rem]',
  lg: 'h-16 w-16 text-xl',
} as const;

/**
 * A team's ESPN logo, falling back to a colored initials avatar when the
 * team has no logo set or the image fails to load. ESPN lets managers point
 * a team logo at an arbitrary URL, so this uses a plain <img> rather than
 * next/image — an un-allowlisted domain would otherwise throw at render.
 * The name is always rendered as text alongside, so the image is decorative.
 */
export function TeamLogo({
  logoUrl,
  name,
  ownerId,
  size = 'md',
}: {
  logoUrl?: string | null;
  name: string;
  ownerId?: string | null;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const base = `${SIZES[size]} shrink-0 rounded-full`;

  // The server-rendered <img> can finish loading — or fail — before React
  // hydrates and attaches onError, in which case that event is missed and a
  // broken image sticks around forever. Re-check the real load state once
  // mounted: a finished image with no intrinsic width did not load.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={logoUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${base} border border-border bg-surface object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: ownerColor(ownerId) }}
      className={`${base} flex items-center justify-center font-bold text-white`}
    >
      {initialsFor(name)}
    </span>
  );
}
