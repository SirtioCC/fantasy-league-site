'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LEAGUE_EMOJI, LEAGUE_NAME } from '@/lib/branding';
import { SyncButton } from './SyncButton';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/standings', label: 'All-Time Standings' },
  { href: '/power-rankings', label: 'Power Rankings' },
  { href: '/luck', label: 'Luck Analysis' },
  { href: '/best-worst', label: 'Best & Worst' },
  { href: '/head-to-head', label: 'Head-to-Head' },
  { href: '/teams', label: 'Owners' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="text-2xl">{LEAGUE_EMOJI}</span>
            <span>{LEAGUE_NAME}</span>
          </Link>
          <SyncButton />
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 text-sm font-medium">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'shrink-0 rounded-full bg-brand px-3 py-1.5 text-white transition-colors'
                    : 'shrink-0 rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground'
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
