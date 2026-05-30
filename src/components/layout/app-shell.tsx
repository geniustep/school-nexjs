'use client';

// The portal shell: sidebar (role nav) + topbar (title, user, logout) + mobile
// drawer. Receives the server-resolved user and renders navigation for it.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { authApi } from '@/lib/api/client';
import { navForUser } from '@/components/navigation/nav-config';
import { Avatar } from '@/components/ui/primitives';
import { ROLE_LABEL } from '@/lib/utils/labels';
import type { CurrentUser } from '@/types/user';
import { isScopedAdmin, isSuperAdmin } from '@/lib/permissions/scope';

function roleSubtitle(user: CurrentUser): string {
  if (user.role === 'admin') {
    if (isSuperAdmin(user)) return 'Administrator · Full school';
    if (isScopedAdmin(user)) return 'Administrator · Limited access';
    return 'Administrator';
  }
  return ROLE_LABEL[user.role];
}

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const sections = navForUser(user);

  async function logout() {
    setLoggingOut(true);
    await authApi.logout();
    router.replace('/login');
  }

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="app-shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={cn('sidebar', open && 'sidebar--open')}>
        <div className="sidebar__brand">
          <span className="brand-mark">S</span>
          <span>Smart School</span>
        </div>
        <nav className="sidebar__nav">
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && <div className="nav-section-title">{section.title}</div>}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('nav-link', isActive(item.href) && 'nav-link--active')}
                  onClick={() => setOpen(false)}
                >
                  <span className="nav-link__icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="row">
            <button
              className="btn btn--ghost btn--sm menu-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <span className="topbar__title">{user.school?.name ?? 'Smart School'}</span>
          </div>
          <div className="topbar__right">
            <div className="user-chip">
              <Avatar name={user.name} />
              <div className="col" style={{ gap: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</span>
                <span className="tiny faint">{roleSubtitle(user)}</span>
              </div>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? '…' : 'Sign out'}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
