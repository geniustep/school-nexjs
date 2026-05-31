'use client';

import Link from 'next/link';
import { PageHeader, Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';

const LINKS = [
  { href: '/admin/homeworks', icon: '📝', key: 'nav.homework' as const },
  { href: '/admin/resources', icon: '📚', key: 'nav.resources' as const },
  { href: '/admin/timetable', icon: '📅', key: 'nav.timetable' as const },
  { href: '/admin/exams', icon: '📋', key: 'nav.exams' as const },
  { href: '/admin/exam-results', icon: '📊', key: 'nav.results' as const },
];

export default function AdminAcademicPage() {
  const t = useT();

  return (
    <>
      <PageHeader title={t('admin.academicCenter')} subtitle={t('admin.academicCenterDesc')} />
      <div className="grid grid--cards">
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="row-link">
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <strong className="mt-2">{t(item.key)}</strong>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
