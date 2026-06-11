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
import { SchoolSwitcher } from '@/components/admin/school-switcher';
import { useT } from '@/features/i18n/locale-context';
import type { CurrentUser } from '@/types/user';
import { isMultiSchoolAdmin, isAdminKind } from '@/lib/admin/admin-ux';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { isScopedAdmin } from '@/lib/permissions/scope';
import { BrandLogo } from '@/components/brand/brand-logo';

function roleSubtitle(user: CurrentUser, t: (k: string) => string): string {
  if (user.role === 'admin' && user.admin_kind) {
    const kindKey = `roles.adminKind.${user.admin_kind}`;
    const kindLabel = t(kindKey);
    if (kindLabel !== kindKey) return kindLabel;
  }
  return t(`roles.${user.role}`);
}

function scopeDescription(user: CurrentUser, t: (k: string) => string): string | null {
  if (user.role !== 'admin' || !isScopedAdmin(user)) return null;
  const scope = user.scope;
  if (!scope) return null;
  switch (scope.type) {
    case 'channels':
      return t('admin.scope.channelsOnly');
    case 'levels':
      return t('admin.scope.levels');
    case 'classes':
      return t('admin.scope.classes');
    case 'level_group':
      return t('admin.scope.levelGroup');
    default:
      return t('admin.scope.custom');
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
  const t = useT();
  const scopeDesc = scopeDescription(user, t);
  const isTeacher = user.role === 'teacher';
  const isAdmin = user.role === 'admin';
  const multiSchoolPm =
    isAdmin && isMultiSchoolAdmin(user) && isAdminKind(user, 'project_manager');
  const topbarTitle = isTeacher
    ? t('teacher.workspaceTitle')
    : multiSchoolPm
      ? t('admin.multiSchoolContext')
      : formatSchoolLabel(user.school, t);

  async function logout() {
    setLoggingOut(true);
    await authApi.logout();
    router.replace('/login');
  }

  function linkActive(href: string, item?: { isActive?: (pathname: string) => boolean }): boolean {
    if (item?.isActive) return item.isActive(pathname);
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div
      className={cn(
        'app-shell',
        isTeacher && 'app-shell--teacher',
        isAdmin && 'app-shell--admin',
      )}
    >
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside
        className={cn(
          'sidebar',
          isTeacher && 'sidebar--teacher',
          isAdmin && 'sidebar--admin',
          open && 'sidebar--open',
        )}
      >
        <div className="sidebar__brand">
          <BrandLogo variant="full" />
        </div>

        {(isTeacher || isAdmin) && (
          <div className="sidebar__profile">
            <Avatar name={user.name} />
            <div className="sidebar__profile-info">
              <span className="sidebar__profile-name">{user.name}</span>
              <span className="sidebar__profile-role">{roleSubtitle(user, t)}</span>
              {user.school && (
                <span className="sidebar__profile-school">
                  {formatSchoolLabel(user.school, t)}
                </span>
              )}
            </div>
          </div>
        )}

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
                  className={cn('nav-link', linkActive(item.href, item) && 'nav-link--active')}
                  onClick={() => setOpen(false)}
                >
                  <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {scopeDesc && (
          <div className="sidebar__scope">
            <span className="sidebar__scope-label">{t('admin.limitedAccess')}</span>
            <span className="sidebar__scope-desc">{scopeDesc}</span>
          </div>
        )}
      </aside>

      <div className="main">
        <header className={cn('topbar', isTeacher && 'topbar--teacher')}>
          <div className="row">
            <button
              className="btn btn--ghost btn--sm menu-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('common.toggleMenu')}
            >
              ≡
            </button>
            <span className="topbar__title">
              {topbarTitle}
            </span>
          </div>
          <div className="topbar__right">
            {isAdmin && <SchoolSwitcher />}
            <LocaleSwitcher compact />
            {!isTeacher && (
              <div className="user-chip">
                <Avatar name={user.name} />
                <div className="col" style={{ gap: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</span>
                  <span className="topbar__role">{roleSubtitle(user, t)}</span>
                </div>
              </div>
            )}
            <button
              className="btn btn--ghost btn--sm"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? '…' : t('common.signOut')}
            </button>
          </div>
        </header>
        <main className={cn('content', isAdmin && 'content--admin')}>{children}</main>
      </div>
    </div>
  );
}
