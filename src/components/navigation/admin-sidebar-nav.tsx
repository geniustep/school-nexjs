'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import type { NavItem, NavSection } from '@/components/navigation/nav-config';
import { IconChevronDown } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';

const STORAGE_KEY = 'admin-sidebar-groups-v1';

function stripQuery(href: string): string {
  return href.split('?')[0];
}

function isLinkActive(pathname: string, href: string, item?: NavItem): boolean {
  if (item?.isActive) return item.isActive(pathname);
  const base = stripQuery(href);
  return pathname === base || pathname.startsWith(`${base}/`);
}

function sectionHasActive(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isLinkActive(pathname, item.href, item));
}

function readStored(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistStored(next: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function sectionGroupId(section: NavSection, index: number): string {
  return section.groupId ?? `section-${index}`;
}

export function AdminSidebarNav({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useT();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = readStored();
    const next: Record<string, boolean> = {};
    sections.forEach((section, index) => {
      const id = sectionGroupId(section, index);
      if (stored[id] !== undefined) {
        next[id] = stored[id];
      } else if (section.defaultOpen) {
        next[id] = true;
      } else {
        next[id] = false;
      }
    });
    setOpenGroups(next);
  }, [sections]);

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      sections.forEach((section, index) => {
        const id = sectionGroupId(section, index);
        if (sectionHasActive(pathname, section) && !next[id]) {
          next[id] = true;
          changed = true;
        }
      });
      if (changed) persistStored(next);
      return changed ? next : prev;
    });
  }, [pathname, sections]);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      persistStored(next);
      return next;
    });
  }, []);

  return (
    <>
      {sections.map((section, index) => {
        const groupId = sectionGroupId(section, index);
        const isOpen = openGroups[groupId] ?? section.defaultOpen ?? false;
        const hasTitle = !!section.titleKey;
        const activeInSection = sectionHasActive(pathname, section);

        return (
          <div key={groupId} className={cn('nav-group', isOpen && hasTitle && 'nav-group--open')}>
            {hasTitle && (
              <button
                type="button"
                className={cn(
                  'nav-group__toggle',
                  activeInSection && 'nav-group__toggle--has-active',
                  isOpen && 'nav-group__toggle--open',
                )}
                aria-expanded={isOpen}
                aria-controls={`nav-group-items-${groupId}`}
                onClick={() => toggleGroup(groupId)}
              >
                <span className="nav-group__title">{t(section.titleKey!)}</span>
                <IconChevronDown size={14} className="nav-group__chevron" aria-hidden />
              </button>
            )}
            <div
              id={`nav-group-items-${groupId}`}
              className={cn(
                'nav-group__items',
                !hasTitle || isOpen ? 'nav-group__items--open' : 'nav-group__items--closed',
              )}
            >
              {section.items.map((item) => {
                const active = isLinkActive(pathname, item.href, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('nav-link', active && 'nav-link--active')}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                  >
                    <span className="nav-link__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
