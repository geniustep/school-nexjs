'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { cleanDisplayValue } from '../utils/admission-labels';
import { localizeSiblingRelationship } from '../utils/sibling-display';
import type { SiblingLine } from '@/types/sibling-line';

function relationshipLabel(t: (key: string) => string, value: string | null | undefined): string {
  return localizeSiblingRelationship(t, value) ?? t('admin.siblings.notMentioned');
}

export function SiblingLinesTable({ lines }: { lines: SiblingLine[] }) {
  const t = useT();
  const empty = t('admin.siblings.notMentioned');

  if (!lines.length) return null;

  return (
    <div className="sibling-lines-table-wrap">
      <table className="sibling-lines-table">
        <thead>
          <tr>
            <th>{t('admin.siblings.table.name')}</th>
            <th>{t('admin.siblings.table.relationship')}</th>
            <th>{t('admin.siblings.table.birthDate')}</th>
            <th>{t('admin.siblings.table.ageAtAdmission')}</th>
            <th>{t('admin.siblings.table.level')}</th>
            <th>{t('admin.siblings.table.currentStudent')}</th>
            <th>{t('admin.siblings.table.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.sequence ?? index}>
              <td dir="auto">{cleanDisplayValue(line.name) || empty}</td>
              <td>{relationshipLabel(t, line.relationship)}</td>
              <td dir="ltr">{cleanDisplayValue(line.birth_date) || empty}</td>
              <td dir="ltr">
                {line.age_years_at_admission != null && Number.isFinite(line.age_years_at_admission)
                  ? line.age_years_at_admission
                  : empty}
              </td>
              <td dir="auto">{cleanDisplayValue(line.level_text) || empty}</td>
              <td>
                {line.is_current_student === true
                  ? t('common.yes')
                  : line.is_current_student === false
                    ? t('common.no')
                    : empty}
              </td>
              <td dir="auto">{cleanDisplayValue(line.notes) || empty}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {lines.some((line) => line.linked_student_id) ? (
        <p className="tiny muted sibling-lines-table__linked">
          {t('admin.siblings.linkedStudentHint')}{' '}
          {lines
            .filter((line) => line.linked_student_id)
            .map((line) => (
              <Link key={line.linked_student_id} href={`/admin/students/${line.linked_student_id}`}>
                #{line.linked_student_id}
              </Link>
            ))}
        </p>
      ) : null}
    </div>
  );
}
