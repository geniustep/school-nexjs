'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { MobileBottomSheet } from '@/components/ui/mobile-bottom-sheet';
import { IconChevronDown } from '@/components/icons/admin-icons';
import { useMobileNavCoordinator } from '@/hooks/mobile-nav-coordinator';
import { useT } from '@/features/i18n/locale-context';
import { canViewAcademicSetupSection } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';

export const ACADEMIC_NAV_ITEMS = [
  { href: '/admin/settings/academic-setup', key: 'overview', section: 'overview' as const, exact: true },
  { href: '/admin/settings/academic-setup/classes', key: 'classes', section: 'classes' as const },
  { href: '/admin/settings/academic-setup/subjects', key: 'subjects', section: 'subjects' as const },
  { href: '/admin/settings/academic-setup/terms', key: 'terms', section: 'terms' as const },
  { href: '/admin/settings/academic-setup/teachers', key: 'teachers', section: 'teachers' as const },
  { href: '/admin/settings/academic-setup/staff', key: 'staff', section: 'staff' as const },
  { href: '/admin/settings/academic-setup/assignments', key: 'assignments', section: 'assignments' as const },
];

export function AcademicSectionSwitcher() {
  const pathname = usePathname();
  const t = useT();
  const user = useSession();
  const { contextNavOpen, setContextNavOpen } = useMobileNavCoordinator();

  const items = ACADEMIC_NAV_ITEMS.filter((item) =>
    canViewAcademicSetupSection(user, item.section),
  );

  const activeItem =
    items.find((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? items[0];

  return (
    <nav className="academic-section-switcher" aria-label={t('admin.academicSetup.navLabel')}>
      <Link href="/admin/settings" className="academic-setup-nav__back academic-section-switcher__back">
        ‹ {t('admin.settings.backToSettings')}
      </Link>

      <div className="academic-section-switcher__desktop">
        {items.map((item) => {
          const active = item.href === activeItem?.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('academic-setup-nav__link', active && 'academic-setup-nav__link--active')}
              aria-current={active ? 'page' : undefined}
            >
              {t(`admin.academicSetup.nav.${item.key}`)}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        className="academic-section-switcher__mobile"
        aria-expanded={contextNavOpen}
        aria-haspopup="dialog"
        onClick={() => setContextNavOpen(true)}
      >
        <span className="academic-section-switcher__mobile-label">
          {t('admin.academicSetup.currentSection')}
        </span>
        <span className="academic-section-switcher__mobile-value">
          {activeItem ? t(`admin.academicSetup.nav.${activeItem.key}`) : '—'}
          <IconChevronDown size={16} />
        </span>
      </button>

      <MobileBottomSheet
        open={contextNavOpen}
        onClose={() => setContextNavOpen(false)}
        title={t('admin.academicSetup.navLabel')}
        closeLabel={t('common.close')}
      >
        <ul className="academic-section-switcher__sheet-list">
          {items.map((item) => {
            const active = item.href === activeItem?.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'academic-section-switcher__sheet-link',
                    active && 'academic-section-switcher__sheet-link--active',
                  )}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setContextNavOpen(false)}
                >
                  {t(`admin.academicSetup.nav.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </MobileBottomSheet>
    </nav>
  );
}
