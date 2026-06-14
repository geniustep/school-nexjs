'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/states/states';
import { FinanceStudentSearch } from '@/features/admin/finance/finance-student-search';
import { useStudentDetails } from '@/features/admin/students/hooks/use-student-details';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceStudentSearchResult } from '@/types/finance';
import { refName } from '@/lib/utils/finance';
import { getStudentDisplayName } from '@/lib/utils/student';

export type FinanceHubStudentScopeContext = {
  studentId: number;
  studentName: string;
  studentCode: string | null;
};

function resolveStudentCode(student: {
  code?: string | null;
  school_number?: string | null;
  matricule?: string | null;
  massar_code?: string | null;
}): string | null {
  return (
    student.code?.trim() ||
    student.school_number?.trim() ||
    student.matricule?.trim() ||
    student.massar_code?.trim() ||
    null
  );
}

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
  children: (scope: FinanceHubStudentScopeContext) => ReactNode;
}) {
  const t = useT();
  const detailsState = useStudentDetails(studentId);

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

  const student = detailsState.data?.student;
  const enrollment = detailsState.data?.current_enrollment;
  const studentName = student
    ? getStudentDisplayName(student)
    : detailsState.loading
      ? t('common.loading')
      : `#${studentId}`;
  const studentCode = student ? resolveStudentCode(student) : null;
  const classLabel = refName(enrollment?.class);
  const meta = [classLabel, studentCode].filter(Boolean).join(' · ');

  return (
    <div className="form-stack">
      <div className="finance-hub-student-bar">
        <div className="finance-hub-student-bar__identity">
          <span className="muted finance-hub-student-bar__label">
            {t('admin.finance.hub.selectedStudent')}
          </span>
          <strong className="finance-hub-student-bar__name">{studentName}</strong>
          {meta ? <span className="muted finance-hub-student-bar__meta">{meta}</span> : null}
        </div>
        <div className="finance-hub-student-bar__actions">
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
      </div>
      {children({
        studentId,
        studentName: student ? getStudentDisplayName(student) : `#${studentId}`,
        studentCode,
      })}
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
