'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import type { Student360TabId } from '../utils/student-360-tabs';
import { buildStudent360TabHref, student360TabLabelKey } from '../utils/student-360-tabs';

export function Student360Breadcrumb({
  studentId,
  studentName,
  tab,
}: {
  studentId: string | number;
  studentName: string;
  tab: Student360TabId;
}) {
  const t = useT();
  const displayName = studentName.trim() || t('admin.student360.breadcrumb.fallbackName');
  const tabLabel = t(student360TabLabelKey(tab));

  return (
    <nav className="student-360-breadcrumb" aria-label={t('admin.student360.breadcrumb.aria')}>
      <ol className="student-360-breadcrumb__list">
        <li className="student-360-breadcrumb__item">
          <Link href="/admin/students">{t('admin.student360.breadcrumb.students')}</Link>
        </li>
        <li className="student-360-breadcrumb__sep" aria-hidden="true">
          /
        </li>
        <li className="student-360-breadcrumb__item">
          {tab === 'overview' ? (
            <span aria-current="page">{displayName}</span>
          ) : (
            <Link href={buildStudent360TabHref(studentId, 'overview')}>{displayName}</Link>
          )}
        </li>
        {tab !== 'overview' ? (
          <>
            <li className="student-360-breadcrumb__sep" aria-hidden="true">
              /
            </li>
            <li className="student-360-breadcrumb__item">
              <span aria-current="page">{tabLabel}</span>
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
