'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/states/states';
import { FinanceStudentSearch } from '@/features/admin/finance/finance-student-search';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceStudentSearchResult } from '@/types/finance';

export function FinanceHubStudentScope({
  studentId,
  onStudentChange,
  emptyTitleKey = 'admin.finance.hub.selectStudentTitle',
  emptyDescKey = 'admin.finance.hub.selectStudentDesc',
  children,
}: {
  studentId: number | null;
  onStudentChange: (id: number | null) => void;
  emptyTitleKey?: string;
  emptyDescKey?: string;
  children: (studentId: number) => ReactNode;
}) {
  const t = useT();

  if (!studentId) {
    return (
      <div className="form-stack">
        <EmptyState title={t(emptyTitleKey)} description={t(emptyDescKey)} />
        <FinanceStudentSearch
          showProfileLink={false}
          onSelect={(student: FinanceStudentSearchResult) => onStudentChange(student.id)}
        />
      </div>
    );
  }

  return (
    <div className="form-stack">
      <div className="finance-hub-student-bar">
        <span className="muted">{t('admin.finance.hub.selectedStudent')}</span>
        <strong>#{studentId}</strong>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onStudentChange(null)}>
          {t('admin.finance.changeStudent')}
        </button>
        <Link
          href={`/admin/students/${studentId}?tab=finance`}
          className="btn btn--ghost btn--sm"
        >
          {t('admin.finance.hub.openStudent360')}
        </Link>
      </div>
      {children(studentId)}
    </div>
  );
}

export function useFinanceHubStudentScope(
  searchParams: URLSearchParams,
  basePath: string,
): {
  studentId: number | null;
  setStudentId: (id: number | null) => void;
} {
  const router = useRouter();
  const raw = searchParams.get('student_id') ?? searchParams.get('studentId');
  const studentId = raw && /^\d+$/.test(raw) ? Number(raw) : null;

  function setStudentId(id: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set('student_id', String(id));
    } else {
      params.delete('student_id');
      params.delete('studentId');
    }
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath);
  }

  return { studentId, setStudentId };
}
