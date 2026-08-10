'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useState } from 'react';
import { useMobileNavCoordinator } from '@/hooks/mobile-nav-coordinator';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { authApi } from '@/lib/api/client';
import { navForUser } from '@/components/navigation/nav-config';
import { AdminSidebarHost } from '@/components/navigation/admin-sidebar-host';
import { Avatar } from '@/components/ui/primitives';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { SchoolSwitcher } from '@/components/admin/school-switcher';
import { AcademicYearSwitcher } from '@/components/admin/academic-year-switcher';
import { RoleSwitcher } from '@/components/auth/role-switcher';
import { useT } from '@/features/i18n/locale-context';
import type { CurrentUser } from '@/types/user';
import { isMultiSchoolAdmin, isAdminKind } from '@/lib/admin/admin-ux';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { isScopedAdmin } from '@/lib/permissions/scope';
import { BrandLogo } from '@/components/brand/brand-logo';
import { IconMenu } from '@/components/icons/admin-icons';
import { AdminAccountSheet } from '@/components/layout/admin-account-sheet';
import { SignOutButton } from '@/components/layout/sign-out-button';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { resolveEffectiveRole } from '@/lib/auth/active-role-workspace';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import {
  AdminStudentSpotlightHost,
  AdminStudentSpotlightTrigger,
} from '@/features/admin/students/components/admin-student-spotlight-host';

function roleSubtitle(user: CurrentUser, t: (k: string) => string): string {
  const effective = resolveEffectiveRole(user);
  if (effective === 'teacher') return t('roles.teacher');
  if (effective === 'parent') return t('roles.parent');
  if (effective === 'student') return t('roles.student');
  if (effective === 'admin' && user.admin_kind) {
    const kindKey = `roles.adminKind.${user.admin_kind}`;
    const kindLabel = t(kindKey);
    if (kindLabel !== kindKey) return kindLabel;
  }
  return t(`roles.${effective}`);
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
  const { mainDrawerOpen, setMainDrawerOpen } = useMobileNavCoordinator();
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const sections = navForUser(user);
  const t = useT();
  const scopeDesc = scopeDescription(user, t);
  const isTeacher = shouldUseTeacherWorkspace(user);
  const isAdmin = user.role === 'admin' && !isTeacher;
  const multiSchoolPm =
    isAdmin && isMultiSchoolAdmin(user) && isAdminKind(user, 'project_manager');
  const topbarTitle = isTeacher
    ? t('teacher.workspaceTitle')
    : multiSchoolPm
      ? t('admin.multiSchoolContext')
      : formatSchoolLabel(user.school, t);
  const roleLabel = roleSubtitle(user, t);

  useBodyScrollLock(mainDrawerOpen);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authApi.logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  function linkActive(href: string, item?: { isActive?: (pathname: string) => boolean }): boolean {
    if (item?.isActive) return item.isActive(pathname);
    return pathname === href || pathname.startsWith(href + '/');
  }

  const shell = (
    <div
      className={cn(
        'app-shell',
        isTeacher && 'app-shell--teacher',
        isAdmin && 'app-shell--admin',
        isAdmin &&
          adminSidebarCollapsed &&
          'app-shell--focus-collapsed app-shell--focus-v2-collapsed',
      )}
    >
      {isAdmin ? (
        <AdminSidebarHost
          user={user}
          sections={sections}
          roleLabel={roleLabel}
          scopeDesc={scopeDesc}
          mainDrawerOpen={mainDrawerOpen}
          setMainDrawerOpen={setMainDrawerOpen}
          loggingOut={loggingOut}
          onLogout={logout}
          onCollapsedChange={setAdminSidebarCollapsed}
        />
      ) : (
        <>
          {mainDrawerOpen && (
            <button
              type="button"
              className="scrim"
              aria-label={t('common.close')}
              onClick={() => setMainDrawerOpen(false)}
            />
          )}
          <aside
            id="admin-sidebar"
            className={cn(
              'sidebar',
              isTeacher && 'sidebar--teacher',
              mainDrawerOpen && 'sidebar--open',
            )}
            aria-hidden={!mainDrawerOpen ? undefined : false}
          >
            <div className="sidebar__brand">
              <BrandLogo variant="full" />
            </div>

            {isTeacher && (
              <div className="sidebar__profile">
                <Avatar name={user.name} />
                <div className="sidebar__profile-info">
                  <span className="sidebar__profile-name">{user.name}</span>
                  <span className="sidebar__profile-role">{roleLabel}</span>
                  {user.school && (
                    <span className="sidebar__profile-school">
                      {formatSchoolLabel(user.school, t)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Desktop + drawer: labeled switcher in teacher/parent sidebar (topbar copy hidden via CSS). */}
            <div className="sidebar__role-switcher" data-testid="role-switcher-sidebar">
              <RoleSwitcher data-testid="role-switcher-sidebar-control" />
            </div>

            <nav id="admin-sidebar-nav" className="sidebar__nav" aria-label={t('nav.main')}>
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
                      aria-current={linkActive(item.href, item) ? 'page' : undefined}
                      onClick={() => setMainDrawerOpen(false)}
                    >
                      <span className="nav-link__icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>

            {isTeacher && (
              <div className="sidebar__scope sidebar__scope--teacher">
                <span className="sidebar__scope-label">{t('teacher.workspaceTitle')}</span>
                <span className="sidebar__scope-desc">{t('teacher.workspaceSidebarDesc')}</span>
              </div>
            )}

            <div className="sidebar__footer sidebar__footer--mobile">
              <div className="sidebar__footer-field">
                <span className="sidebar__footer-label">{t('common.language')}</span>
                <LocaleSwitcher />
              </div>
              <SignOutButton
                loggingOut={loggingOut}
                onClick={logout}
                className="sidebar__footer-logout"
                block
              />
            </div>
          </aside>
        </>
      )}

      <div className="main">
        <header className={cn('topbar', isTeacher && 'topbar--teacher', 'admin-mobile-header')}>
          <div className="topbar__start topbar__context">
            <button
              type="button"
              className="btn btn--ghost btn--sm menu-toggle admin-mobile-menu-trigger"
              onClick={() => setMainDrawerOpen(!mainDrawerOpen)}
              aria-expanded={mainDrawerOpen}
              aria-controls="admin-sidebar-nav"
              aria-label={t('common.toggleMenu')}
            >
              <IconMenu size={20} />
            </button>
            <span className="topbar__title admin-mobile-header__title">{topbarTitle}</span>
          </div>
          <div className="topbar__right topbar__right--desktop">
            {isAdmin && <AdminStudentSpotlightTrigger variant="desktop" />}
            {isAdmin && <SchoolSwitcher hideLabel />}
            {isAdmin && <AcademicYearSwitcher hideLabel />}
            {/* Admin desktop: labeled topbar. Teacher/parent: labeled control lives in sidebar only. */}
            {isAdmin && (
              <RoleSwitcher className="role-switcher--topbar" data-testid="role-switcher-topbar" />
            )}
            <LocaleSwitcher compact />
            {!isTeacher && (
              <div className="user-chip">
                <Avatar name={user.name} />
                <div className="col" style={{ gap: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</span>
                  <span className="topbar__role">{roleLabel}</span>
                </div>
              </div>
            )}
            <SignOutButton loggingOut={loggingOut} onClick={logout} size="sm" />
          </div>
          <div className="topbar__right topbar__right--mobile">
            {isAdmin && <AdminStudentSpotlightTrigger variant="mobile" />}
            <AdminAccountSheet
              user={user}
              roleLabel={roleLabel}
              loggingOut={loggingOut}
              onLogout={logout}
            />
          </div>
        </header>
        <main className={cn('content', isAdmin && 'content--admin')}>{children}</main>
      </div>
    </div>
  );

  if (isAdmin) {
    return <AdminStudentSpotlightHost>{shell}</AdminStudentSpotlightHost>;
  }

  return shell;
}
