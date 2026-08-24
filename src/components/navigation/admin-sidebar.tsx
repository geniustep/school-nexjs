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
import { useAnnouncementsList } from '@/features/announcements/hooks/use-announcements-list';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { cn } from '@/lib/utils/cn';
import type { AdminChannel } from '@/types/admin-channel';
import type { CommunicationContent } from '@/types/communication';
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
  // The API exposes a real unread count for announcement deliveries. Keep this
  // separate from any future "needs follow-up" workflow state.
  const { data: announcements } = useAnnouncementsList({ pageSize: 1 });
  const unreadAnnouncements = announcements?.unread_count ?? 0;
  const hasCommunicationReview = sections.some((section) =>
    section.items.some((item) => item.href === '/admin/communication'),
  );
  const hasChannels = sections.some((section) =>
    section.items.some((item) => item.href === '/admin/channels'),
  );
  const communicationReview = useAdminResource<CommunicationContent[]>(
    hasCommunicationReview ? endpoints.admin.communicationContent : null,
    { page: 1, page_size: 1, state: 'submitted' },
  );
  const channels = useAdminResource<AdminChannel[]>(
    hasChannels ? endpoints.admin.channels : null,
    { page: 1, page_size: 100 },
  );
  const reviewMeta = communicationReview.meta as
    | { pagination?: { total?: number }; total?: number }
    | null
    | undefined;
  const pendingCommunicationReview =
    reviewMeta?.pagination?.total ?? reviewMeta?.total ?? communicationReview.data?.length ?? 0;
  const unreadChannelMessages = (channels.data ?? []).reduce(
    (total, channel) => total + Math.max(0, channel.unread_count ?? 0),
    0,
  );
  const communicationCounts: Record<string, number> = {
    '/admin/announcements': unreadAnnouncements,
    '/admin/communication': pendingCommunicationReview,
    '/admin/channels': unreadChannelMessages,
  };
  const communicationAttentionTotal = Object.values(communicationCounts).reduce(
    (total, count) => total + count,
    0,
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = readAdminSidebarGroups();
    const activeGroupId = sections.reduce<string | null>((current, section, index) => {
      if (current || !section.titleKey || !sectionHasActiveLink(pathname, section)) return current;
      return sectionGroupId(section, index);
    }, null);
    const storedGroupId = sections.reduce<string | null>((current, section, index) => {
      if (current || !section.titleKey) return current;
      const id = sectionGroupId(section, index);
      return stored[id] ? id : null;
    }, null);
    const selectedGroupId = activeGroupId ?? storedGroupId;
    const next: Record<string, boolean> = {};
    sections.forEach((section, index) => {
      const id = sectionGroupId(section, index);
      next[id] = !!section.titleKey && id === selectedGroupId;
    });
    setOpenGroups(next);
    writeAdminSidebarGroups(next);
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
    const activeSectionIndex = sections.findIndex(
      (section) => !!section.titleKey && sectionHasActiveLink(pathname, section),
    );
    if (activeSectionIndex < 0) return;
    const activeGroupId = sectionGroupId(sections[activeSectionIndex], activeSectionIndex);

    setOpenGroups((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      sections.forEach((section, index) => {
        const id = sectionGroupId(section, index);
        const shouldOpen = !!section.titleKey && id === activeGroupId;
        next[id] = shouldOpen;
        if (!!prev[id] !== shouldOpen) changed = true;
      });
      if (changed) writeAdminSidebarGroups(next);
      return changed ? next : prev;
    });
  }, [pathname, sections]);

  const scrollGroupToTop = useCallback((groupId: string) => {
    window.requestAnimationFrame(() => {
      const nav = document.getElementById('admin-sidebar-nav');
      const group = document.getElementById(`admin-sidebar-group-${groupId}`);
      if (!nav || !group || typeof nav.scrollTo !== 'function') return;

      const navRect = nav.getBoundingClientRect();
      const groupRect = group.getBoundingClientRect();
      const top = Math.max(0, nav.scrollTop + groupRect.top - navRect.top - 4);
      const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      nav.scrollTo({ top, behavior });
    });
  }, []);

  const toggleGroup = useCallback(
    (groupId: string) => {
      const opening = !openGroups[groupId];
      setOpenGroups(() => {
        const next: Record<string, boolean> = {};
        sections.forEach((section, index) => {
          const id = sectionGroupId(section, index);
          next[id] = !!section.titleKey && id === groupId ? opening : false;
        });
        writeAdminSidebarGroups(next);
        return next;
      });
      if (opening && !collapsed) scrollGroupToTop(groupId);
    },
    [collapsed, openGroups, scrollGroupToTop, sections],
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
          const showCommunicationTotal =
            groupId === 'communication' && !isOpen && communicationAttentionTotal > 0;

          return (
            <section
              key={groupId}
              id={`admin-sidebar-group-${groupId}`}
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
                  {!collapsed && showCommunicationTotal ? (
                    <span
                      className="focus-v2__unread-badge"
                      aria-label={`${t(section.titleKey!)}: ${communicationAttentionTotal}`}
                      title={`${t(section.titleKey!)}: ${communicationAttentionTotal}`}
                    >
                      {communicationAttentionTotal > 99 ? '99+' : communicationAttentionTotal}
                    </span>
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
                  const itemCount = groupId === 'communication' ? communicationCounts[item.href] ?? 0 : 0;
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
                      {!collapsed && isOpen && itemCount > 0 ? (
                        <span
                          className="focus-v2__link-count"
                          aria-label={`${label}: ${itemCount}`}
                          title={`${label}: ${itemCount}`}
                        >
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      ) : null}
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
