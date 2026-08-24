'use client';

import Link from 'next/link';
import { AcademicCalendarsListPage } from '@/features/admin/academic-calendars/components/academic-calendars-list-page';
import { useLocale } from '@/features/i18n/locale-context';

const LABELS = {
  ar: 'المرجع الرسمي للسنة الدراسية',
  en: 'Official school-year reference',
  fr: 'Référence officielle de l’année scolaire',
  es: 'Referencia oficial del curso escolar',
} as const;

export default function AdminAcademicCalendarsPage() {
  const { locale } = useLocale();

  return (
    <>
      <div className="admin-workspace" style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 0 }}>
        <Link className="btn btn--ghost btn--sm" href="/admin/regulatory">
          {LABELS[locale]}
        </Link>
      </div>
      <AcademicCalendarsListPage />
    </>
  );
}
