/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useEffect, useState } from 'react';
import { AcademicContextFilters } from '@/features/academic-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import { GRADEBOOK_LIST_STATES } from '@/features/admin/gradebooks/utils/gradebook-list-present';
import { useT } from '@/features/i18n/locale-context';
import type { AcademicContextSelection } from '@/types/academic-context';

export function GradebooksListFilters({
  academicYearId,
  termId,
  classId,
  subjectId,
  offeringId,
  stateFilter,
  hasActiveFilters,
  onTermIdChange,
  onClassIdChange,
  onSubjectIdChange,
  onOfferingIdChange,
  onStateFilterChange,
  onReset,
}: {
  academicYearId: string;
  termId: string;
  classId: string;
  subjectId: string;
  offeringId?: string;
  stateFilter: string;
  hasActiveFilters: boolean;
  onTermIdChange: (value: string) => void;
  onClassIdChange: (value: string) => void;
  onSubjectIdChange: (value: string) => void;
  onOfferingIdChange?: (value: string) => void;
  onStateFilterChange: (value: string) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [selection, setSelection] = useState<AcademicContextSelection>({
    ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
    academicYearId,
    termId,
    classId,
    subjectId,
    offeringId: offeringId ?? '',
  });

  useEffect(() => {
    setSelection((prev) => ({
      ...prev,
      academicYearId,
      termId,
      classId,
      subjectId,
      offeringId: offeringId ?? '',
    }));
  }, [academicYearId, termId, classId, subjectId, offeringId]);

  return (
    <div className="gradebooks-list-filters toolbar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <AcademicContextFilters
        scope="gradebook"
        layout="compact"
        selection={selection}
        onSelectionChange={(next) => {
          // The year comes exclusively from the global header context. Keep the
          // hidden academic-context controller from replacing it with a local/default year.
          const lockedNext = { ...next, academicYearId };
          setSelection(lockedNext);
          if (lockedNext.termId !== termId) onTermIdChange(lockedNext.termId);
          if (lockedNext.classId !== classId) onClassIdChange(lockedNext.classId);
          if (lockedNext.subjectId !== subjectId) onSubjectIdChange(lockedNext.subjectId);
          if (onOfferingIdChange && lockedNext.offeringId !== (offeringId ?? '')) {
            onOfferingIdChange(lockedNext.offeringId);
          }
        }}
        showAcademicYear={false}
        showTerm
        showCycle={false}
        showLevel={false}
        showTrack={false}
        showClass
        classBeforeSubject
        showSubject
        showTeachingLanguage={false}
        showOffering
        showReference={false}
      />

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <select
          className="input"
          value={stateFilter}
          onChange={(event) => onStateFilterChange(event.target.value)}
          aria-label={t('academic.status')}
        >
          <option value="">{t('admin.allStates')}</option>
          {GRADEBOOK_LIST_STATES.map((state) => (
            <option key={state} value={state}>
              {t(`states.${state}`)}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.gradebooks.resetFilters')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
