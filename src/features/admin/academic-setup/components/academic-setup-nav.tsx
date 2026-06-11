'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import {
  canViewAcademicSetupSection,
} from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';

const NAV = [
  { href: '/admin/settings/academic-setup', key: 'overview', section: 'overview' as const, exact: true },
  { href: '/admin/settings/academic-setup/classes', key: 'classes', section: 'classes' as const },
  { href: '/admin/settings/academic-setup/subjects', key: 'subjects', section: 'subjects' as const },
  { href: '/admin/settings/academic-setup/teachers', key: 'teachers', section: 'teachers' as const },
  { href: '/admin/settings/academic-setup/staff', key: 'staff', section: 'staff' as const },
  { href: '/admin/settings/academic-setup/assignments', key: 'assignments', section: 'assignments' as const },
];

export function AcademicSetupNav() {
  const pathname = usePathname();
  const t = useT();
  const user = useSession();

  return (
    <nav className="academic-setup-nav" aria-label={t('admin.academicSetup.navLabel')}>
      {NAV.filter((item) => canViewAcademicSetupSection(user, item.section)).map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    </nav>
  );
}
