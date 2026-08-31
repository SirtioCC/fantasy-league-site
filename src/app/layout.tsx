import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { LEAGUE_NAME } from '@/lib/branding';

export const metadata: Metadata = {
  title: `${LEAGUE_NAME} | League Stats & Analysis`,
  description: `Historical stats, standings, power rankings, and luck analysis for ${LEAGUE_NAME}.`,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted sm:px-6">
          {LEAGUE_NAME} · Data pulled from the ESPN Fantasy Football API
        </footer>
      </body>
    </html>
  );
}
