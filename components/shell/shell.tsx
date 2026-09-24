'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Permission, Role } from '@/shared/index';

import { browserFetch } from '../../lib/api';
import { cn } from '../../lib/cn';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { isActivePath, visibleNavItems } from './nav-items';
import { PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';

/**
 * The application shell (R003).
 *
 * A collapsible left rail plus a top bar. It is a client component for exactly
 * two reasons - the rail's collapsed state and the active-item highlight are
 * viewport state - and `children` arrive as a prop, so page content stays a
 * server component: the client boundary is the chrome, not the data. Nothing
 * here can widen what a caller may see, because the navigation is filtered by
 * the permission list the server layout resolved and passed in.
 *
 * The rail's collapsed state is read *after* mount. The server has no
 * `localStorage`, so reading it during render would produce markup that
 * disagrees with the server's HTML and hydrate into a visible jump; rendering
 * expanded first and correcting once mounted is the only honest order.
 */

/** The slice of the session the chrome draws. Kept local so this module never imports the server-only session helper. */
export interface ShellSession {
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  permissions: readonly Permission[];
}

export interface ShellProps {
  session: ShellSession;
  children: ReactNode;
}

const RAIL_STORAGE_KEY = 'cd-rail-collapsed';

/**
 * Below this width the rail and the top bar cannot both fit: 15rem of rail on a
 * 390px viewport leaves the header narrower than the role label plus the
 * sign-out control, so the header clips its own children and the button stops
 * receiving pointer events. The rail therefore starts collapsed on a phone, and
 * the toggle still expands it for anyone who wants it that way - collapsing
 * keeps every label in the accessibility tree (`sr-only`), so nothing becomes
 * unreachable. A stored preference always wins, because expanding the rail on a
 * phone is a decision rather than a mistake.
 */
const PHONE_MEDIA_QUERY = '(max-width: 40rem)';

/** Initials for the avatar: two letters at most, from the name, then the address. */
export function initialsFor(name: string, email: string): string {
  const source = name.trim() || email.trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return `${first}${second}`.toUpperCase();
}

export function Shell({ session, children }: ShellProps) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Read the stored rail state once, after mount. See the module note.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(RAIL_STORAGE_KEY);
    } catch {
      // A browser with storage disabled has no stored preference, which is the
      // same answer as one that has never been asked.
    }

    if (stored !== null) {
      setCollapsed(stored === '1');
      return;
    }

    setCollapsed(window.matchMedia(PHONE_MEDIA_QUERY).matches);
  }, []);

  useEffect(() => {
    const sync = () => setOnline(window.navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  function toggleRail() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(RAIL_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // The rail still moves; only the preference is lost.
      }
      return next;
    });
  }

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    const result = await browserFetch<{ signedOut: boolean }>('/api/auth/logout', { method: 'POST' });

    // A failed sign-out must not navigate: the session cookie is still live, so
    // leaving for /login would be a lie that the next request would undo.
    if (!result.ok) {
      setSigningOut(false);
      setSignOutError(result.error.message);
      return;
    }

    router.replace('/login');
    router.refresh();
  }

  const items = visibleNavItems(session.permissions, session.role);
  const initials = initialsFor(session.name, session.email);

  return (
    <div className="flex min-h-dvh">
      <aside
        data-collapsed={collapsed ? 'true' : 'false'}
        className={cn(
          'flex shrink-0 flex-col border-r border-line bg-panel transition-width duration-move ease-standard',
          collapsed ? 'w-rail-collapsed' : 'w-rail',
        )}
      >
        <div
          className={cn(
            'flex h-topbar items-center border-b border-line',
            collapsed ? 'justify-center px-0' : 'justify-between gap-control px-3',
          )}
        >
          <Link
            href={session.role === 'client' ? '/dashboard' : '/'}
            className={cn('truncate-text text-md font-semibold text-fg', collapsed && 'hidden')}
            title="Claim Desk home"
          >
            <span aria-hidden="true">CD</span>
            <span className="ml-1">Claim Desk</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'p-1.5 flex items-center justify-center',
              collapsed ? 'size-control-md mx-auto' : 'ml-auto',
            )}
            onClick={toggleRail}
            aria-expanded={!collapsed}
            aria-controls="shell-rail-nav"
            aria-label={collapsed ? 'Expand the navigation rail' : 'Collapse the navigation rail'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>

        <nav
          id="shell-rail-nav"
          aria-label="Main"
          className={cn('flex flex-col gap-1', collapsed ? 'p-1.5 items-center' : 'p-2')}
        >
          {items.map((item) => {
            const active = isActivePath(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex min-h-control-md items-center rounded-control text-sm transition-colors duration-exit',
                  collapsed
                    ? 'w-full justify-center px-0'
                    : 'gap-control px-2',
                  active
                    ? 'bg-selected font-medium text-fg'
                    : 'text-fg-muted hover:bg-hover hover:text-fg',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-control-sm flex-none place-items-center rounded-control transition-colors',
                    active ? 'bg-accent text-accent-fg' : 'bg-well text-fg-muted',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                {/* Never removed from the accessibility tree: collapsed, the
                    accessible name must not disappear with the pixels. */}
                <span className={cn('truncate-text', collapsed && 'sr-only')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!online ? (
          <p
            role="status"
            className="flex items-center gap-control border-b border-warning-line bg-warning-soft px-4 py-2 text-sm text-warning"
          >
            <span aria-hidden="true" data-glyph="warning" className="glyph" />
            <span>
              <span className="font-semibold">This browser appears to be offline.</span> The banner
              cannot tell a dropped connection from a captive portal - if a request fails, its own
              error message is the real diagnosis.
            </span>
          </p>
        ) : null}

        {signOutError ? (
          <div className="border-b border-line p-3">
            <Alert tone="error" title="Could not sign out">
              {signOutError}
            </Alert>
          </div>
        ) : null}

        <header className="flex h-topbar items-center gap-sibling border-b border-line bg-panel px-4">
          <p className="uppercase-label">{session.roleLabel}</p>

          <div className="ml-auto flex min-w-0 items-center gap-control">
            <div className="flex min-w-0 flex-col items-end leading-tight">
              <span className="truncate-text max-w-full text-sm font-medium text-fg" title={session.name}>
                {session.name}
              </span>
              <span className="truncate-text max-w-full text-xs text-fg-subtle" title={session.email}>
                {session.email}
              </span>
            </div>
            {/* Initials, not an uploaded picture: the picture arrives in S04 and
                an empty avatar frame reads as a broken image until then. */}
            <span
              aria-hidden="true"
              className="grid size-control-md flex-none place-items-center rounded-pill bg-accent-soft text-xs font-semibold text-accent"
            >
              {initials}
            </span>
            <Button variant="secondary" size="sm" loading={signingOut} onClick={signOut} className="flex items-center gap-1.5">
              <LogOut className="size-3.5" />
              <span>{signingOut ? 'Signing out' : 'Sign out'}</span>
            </Button>
          </div>
        </header>

        {/* The page. A server component, rendered on the server, handed in as a prop. */}
        <div className="flex flex-1 flex-col gap-section p-6">{children}</div>
      </div>
    </div>
  );
}
