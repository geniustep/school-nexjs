'use client';

import Link from 'next/link';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { buildFinanceStudentProfileLink } from '@/lib/utils/finance-navigation';
import type { Ref } from '@/types/api';

export function CollectionStudentCell({
  student,
  studentId,
  studentName,
  code,
  returnTo,
  unavailableLabel,
}: {
  student?: Ref | null;
  studentId?: number | null;
  studentName?: string | null;
  code?: string | null;
  returnTo?: string;
  unavailableLabel: string;
}) {
  const sid = studentId ?? student?.id;
  const name =
    studentName?.trim() ||
    financeStudentDisplayName(
      student ? { name: typeof student.name === 'string' ? student.name : undefined } : {},
    );
  const displayName = name !== '—' ? name : unavailableLabel;
  const codeLine = code?.trim() || null;

  const content = (
    <span className="collection-student-cell" dir="auto" title={displayName}>
      <span className="collection-student-cell__name">{displayName}</span>
      {codeLine ? (
        <span className="collection-student-cell__code mono muted" title={codeLine}>
          {codeLine}
        </span>
      ) : null}
    </span>
  );

  if (!sid) return content;
  return (
    <Link
      href={buildFinanceStudentProfileLink(sid, returnTo)}
      onClick={(e) => e.stopPropagation()}
      className="collection-student-cell__link"
      prefetch={false}
    >
      {content}
    </Link>
  );
}
