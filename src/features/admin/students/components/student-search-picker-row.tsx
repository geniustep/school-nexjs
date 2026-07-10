'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import {
  studentClassLabel,
  studentLevelLabel,
} from '../utils/student-academic-labels';
import { studentSpotlightMatchedOnLabelKey } from '../utils/student-spotlight-utils';
import type { StudentSearchHit } from '@/types/student-search';

export function StudentSearchPickerRow({
  student,
  active,
  onSelect,
  onHover,
  id,
}: {
  student: StudentSearchHit;
  active?: boolean;
  onSelect: () => void;
  onHover?: () => void;
  id?: string;
}) {
  const t = useT();
  const name = getStudentDisplayName(student);
  const classLabel = studentClassLabel(student.class);
  const levelLabel = studentLevelLabel(student.level);
  const academicLine = [levelLabel, classLabel]
    .filter((label) => label && label !== '—')
    .join(' · ');
  const matchedOnKey = studentSpotlightMatchedOnLabelKey(student.matched_on);
  const matchedOnLabel = matchedOnKey ? t(matchedOnKey) : null;

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      className={[
        'student-search-picker__option',
        active ? 'student-search-picker__option--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <span className="student-search-picker__option-main">
        <strong className="student-search-picker__name" dir="auto">
          {name}
        </strong>
        {academicLine ? (
          <span className="student-search-picker__meta">{academicLine}</span>
        ) : null}
        {matchedOnLabel && student.matched_on !== 'name' ? (
          <span className="student-search-picker__match">
            {t('admin.studentSearchPicker.matchedOnPrefix', { field: matchedOnLabel })}
          </span>
        ) : null}
      </span>
      {student.status ? (
        <span className="student-search-picker__status">
          <Badge tone={student.status === 'active' ? 'green' : 'slate'}>
            {statusLabel(t, student.status)}
          </Badge>
        </span>
      ) : null}
    </button>
  );
}
