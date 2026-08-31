import type { ReactNode } from 'react';
import Link from 'next/link';
import { ownerIdToSlug } from '@/lib/ownerSlug';

export function OwnerLink({
  ownerId,
  className = 'hover:text-brand hover:underline',
  children,
}: {
  ownerId: string | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  if (!ownerId) return <>{children}</>;
  return (
    <Link href={`/teams/${ownerIdToSlug(ownerId)}`} className={className}>
      {children}
    </Link>
  );
}
