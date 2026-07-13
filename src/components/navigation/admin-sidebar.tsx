'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import {
  isNavLinkActive,
  sectionGroupId,
  sectionHasActiveLink,
} from '@/components/navigation/admin-sidebar-nav-utils';
import {
  readAdminSidebarCollapsed,
  readAdminSidebarGroups,
  writeAdminSidebarCollapsed,
  writeAdminSidebarGroups,
} from '@/components/navigation/admin-sidebar-storage';
import type { NavSection } from '@/components/navigation/nav-config';
import { IconChevronDown, IconMenu } from '@/components/icons/admin-icons';
import { SignOutButton } from '@/components/layout/sign-out-button';
import { Avatar } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { cn } from '@/lib/utils/cn';
import type { CurrentUser } from '@/types/user';

/** Official admin sidebar (adopted Focus Navigation). */
export function AdminSidebar({
  user,
  sections,
  roleLabel,
  scopeDesc,
  mainDrawerOpen,
  loggingOut,
  onLogout,
  onNavigate,
  onCollapsedChange,
}: {
  user: CurrentUser;
  sections: NavSection[];
  roleLabel: string;
  scopeDesc: string | null;
  mainDrawerOpen: boolean;
  loggingOut: boolean;
  onLogout: () => void;
  onNavigate: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const t = useT();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = readAdminSidebarGroups();
    const next: Record<string, boolean> = {};
    sections.forEach((section, index) => {
      const id = sectionGroupId(section, index);
      if (sectionHasActiveLink(pathname, section)) {
        next[id] = true;
      } else if (stored[id] !== undefined) {
        next[id] = stored[id];
      } else {
        next[id] = false;
      }
    });
    setOpenGroups(next);
  }, [sections, pathname]);

  useEffect(() => {
    const next = readAdminSidebarCollapsed();
    setCollapsed(next);
    onCollapsedChange?.(next);
  }, [onCollapsedChange]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    function syncMobile() {
      if (!mq.matches) return;
      setCollapsed(false);
      onCollapsedChange?.(false);
    }
    syncMobile();
    mq.addEventListener('change', syncMobile);
    return () => mq.removeEventListener('change', syncMobile);
  }, [onCollapsedChange]);

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      sections.forEach((section, index) => {
        const id = sectionGroupId(section, index);
        if (sectionHasActiveLink(pathname, section) && !next[id]) {
          next[id] = true;
          changed = true;
        }
      });
      if (changed) writeAdminSidebarGroups(next);
      return changed ? next : prev;
    });
  }, [pathname, sections]);

  const toggleGroup = useCallback(
    (groupId: string) => {
      if (collapsed) {
        // Rail mode: reveal this group's icons without expanding the sidebar.
        setOpenGroups((prev) => {
          const closing = !!prev[groupId];
          const next: Record<string, boolean> = {};
          sections.forEach((section, index) => {
            const id = sectionGroupId(section, index);
            next[id] = id === groupId ? !closing : false;
          });
          writeAdminSidebarGroups(next);
          return next;
        });
        return;
      }
      setOpenGroups((prev) => {
        const next = { ...prev, [groupId]: !prev[groupId] };
        writeAdminSidebarGroups(next);
        return next;
      });
    },
    [collapsed, sections],
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeAdminSidebarCollapsed(next);
      onCollapsedChange?.(next);
      return next;
    });
  }, [onCollapsedChange]);

  const schoolLabel = user.school ? formatSchoolLabel(user.school, t) : null;

  return (
    <aside
      id="admin-sidebar"
      data-sidebar-variant="admin"
      className={cn(
        'sidebar',
        'sidebar--admin',
        'sidebar--focus-v2',
        collapsed && 'sidebar--focus-v2-collapsed',
        mainDrawerOpen && 'sidebar--open',
      )}
      aria-hidden={!mainDrawerOpen ? undefined : false}
    >
      <header className="focus-v2__header">
        <div className="focus-v2__brand-row">
          <div className="focus-v2__brand">
            <BrandLogo variant={collapsed ? 'compact' : 'full'} />
          </div>
          <button
            type="button"
            className="focus-v2__collapse-btn"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? t('common.toggleMenu') : t('common.close')}
            title={collapsed ? t('common.toggleMenu') : t('common.close')}
          >
            <IconMenu size={16} />
          </button>
        </div>

        <div className={cn('focus-v2__identity', collapsed && 'focus-v2__identity--collapsed')}>
          <Avatar name={user.name} />
          {!collapsed ? (
            <div className="focus-v2__identity-copy">
              {schoolLabel ? (
                <span className="focus-v2__school" title={schoolLabel}>
                  {schoolLabel}
                </span>
              ) : null}
              <span className="focus-v2__user" title={user.name}>
                {user.name}
              </span>
              <span className="focus-v2__role">{roleLabel}</span>
            </div>
          ) : (
            <span className="focus-v2__sr-only">{user.name}</span>
          )}
        </div>

        {scopeDesc && !collapsed ? (
          <p className="focus-v2__scope" title={scopeDesc}>
            {scopeDesc}
          </p>
        ) : null}
      </header>

      <nav id="admin-sidebar-nav" className="focus-v2__nav" aria-label={t('nav.main')}>
        {!collapsed ? <p className="focus-v2__nav-eyebrow">{t('nav.main')}</p> : null}
        {sections.map((section, index) => {
          const groupId = sectionGroupId(section, index);
          const hasTitle = !!section.titleKey;
          const activeInSection = sectionHasActiveLink(pathname, section);
          const isOpen = !hasTitle || (openGroups[groupId] ?? false);
          const groupIcon = section.icon ?? section.items[0]?.icon ?? '•';

          return (
            <section
              key={groupId}
              className={cn(
                'focus-v2__group',
                isOpen && hasTitle && 'focus-v2__group--open',
                activeInSection && 'focus-v2__group--active',
              )}
              data-focus-open={isOpen ? 'true' : 'false'}
              data-focus-active-group={activeInSection ? 'true' : 'false'}
            >
              {hasTitle ? (
                <button
                  type="button"
                  className={cn(
                    'focus-v2__group-toggle',
                    activeInSection && 'focus-v2__group-toggle--has-active',
                    isOpen && 'focus-v2__group-toggle--open',
                  )}
                  aria-expanded={isOpen}
                  aria-controls={`admin-sidebar-items-${groupId}`}
                  onClick={() => toggleGroup(groupId)}
                  title={t(section.titleKey!)}
                >
                  <span className="focus-v2__group-icon" aria-hidden="true">
                    {groupIcon}
                  </span>
                  {!collapsed ? (
                    <span className="focus-v2__group-title">{t(section.titleKey!)}</span>
                  ) : null}
                  {!collapsed ? (
                    <IconChevronDown size={16} className="focus-v2__group-chevron" aria-hidden />
                  ) : null}
                </button>
              ) : null}

              <div
                id={`admin-sidebar-items-${groupId}`}
                className={cn(
                  'focus-v2__items',
                  (!hasTitle || isOpen) && !collapsed
                    ? 'focus-v2__items--open'
                    : collapsed && (!hasTitle || isOpen)
                      ? 'focus-v2__items--rail'
                      : 'focus-v2__items--closed',
                )}
              >
                {section.items.map((item) => {
                  const active = isNavLinkActive(pathname, item.href, item);
                  const label = t(item.labelKey);
                  // Collapsed rail: show every destination of the opened group only.
                  if (collapsed && hasTitle && !isOpen) return null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn('focus-v2__link', active && 'focus-v2__link--active')}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                      title={label}
                    >
                      <span className="focus-v2__link-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      {!collapsed ? <span className="focus-v2__link-label">{label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      <footer className={cn('focus-v2__footer', 'sidebar__footer', 'sidebar__footer--mobile')}>
        {!collapsed ? (
          <div className="sidebar__footer-field">
            <span className="sidebar__footer-label">{t('common.language')}</span>
            <LocaleSwitcher />
          </div>
        ) : null}
        <SignOutButton
          loggingOut={loggingOut}
          onClick={onLogout}
          className="sidebar__footer-logout"
          block={!collapsed}
          size={collapsed ? 'sm' : undefined}
          title={t('common.signOut')}
        />
      </footer>
    </aside>
  );
}
