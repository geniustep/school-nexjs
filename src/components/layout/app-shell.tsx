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
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { useT } from '@/features/i18n/locale-context';
import type { CurrentUser } from '@/types/user';
import { isScopedAdmin, isSuperAdmin } from '@/lib/permissions/scope';

function roleSubtitle(user: CurrentUser, t: (k: string) => string): string {
  return t(`roles.${user.role}`);
}

function scopeDescription(user: CurrentUser): string | null {
  if (user.role !== 'admin' || !isScopedAdmin(user)) return null;
  const scope = user.scope;
  if (!scope) return null;
  switch (scope.type) {
    case 'channels':
      return 'You can access communication channels only.';
    case 'levels':
      return 'You can view students in your assigned grade levels.';
    case 'classes':
      return 'You can view students in your assigned classes.';
    case 'level_group':
      return 'You can view students in your assigned level group.';
    default:
      return 'Your access is limited to a specific part of the school.';
  }
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
  const scopeDesc = scopeDescription(user);
  const t = useT();

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
        {/* Brand */}
        <div className="sidebar__brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-name">
            <span className="brand-name__main">Smart School</span>
            <span className="brand-name__sub">Connect</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {sections.map((section, i) => (
            <div key={i}>
              {section.titleKey && (
                <div className="nav-section-title">{t(section.titleKey)}</div>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn('nav-link', isActive(item.href) && 'nav-link--active')}
                  onClick={() => setOpen(false)}
                >
                  <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Scope notice for scoped admins */}
        {scopeDesc && (
          <div className="sidebar__scope">
            <span className="sidebar__scope-label">Limited access</span>
            <span className="sidebar__scope-desc">{scopeDesc}</span>
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="row">
            <button
              className="btn btn--ghost btn--sm menu-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              ≡
            </button>
            <span className="topbar__title">{user.school?.name ?? 'Smart School'}</span>
          </div>
          <div className="topbar__right">
            <LocaleSwitcher compact />
            <div className="user-chip">
              <Avatar name={user.name} />
              <div className="col" style={{ gap: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</span>
                <span className="topbar__role">{roleSubtitle(user, t)}</span>
              </div>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? '…' : t('common.signOut')}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
