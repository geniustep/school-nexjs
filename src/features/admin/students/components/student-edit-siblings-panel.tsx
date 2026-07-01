'use client';

import { useT } from '@/features/i18n/locale-context';
import { SiblingLinesCards } from '@/features/admin/admissions/components/sibling-lines-cards';
import { SiblingsFormFields } from '@/features/admin/admissions/components/siblings-form-fields';
import type { SiblingLine } from '@/types/sibling-line';
import type { StudentProfileFormState } from '../utils/student-profile';

export function StudentEditSiblingsPanel({
  state,
  originalSiblingLineCount,
  siblingCount,
  siblingsSummary,
  onChange,
}: {
  state: StudentProfileFormState;
  originalSiblingLineCount: number;
  siblingCount?: number | null;
  siblingsSummary?: string | null;
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();
  const existingLines = state.siblingLines.slice(0, originalSiblingLineCount);
  const newLines = state.siblingLines.slice(originalSiblingLineCount);

  return (
    <div className="col student-edit-siblings" style={{ gap: 16 }}>
      {(siblingCount != null && siblingCount > 0) || siblingsSummary ? (
        <div className="student-edit-readonly-summary" role="status">
          {siblingCount != null ? (
            <p className="tiny muted">
              {t('admin.student360.editPage.siblingCount', { count: siblingCount })}
            </p>
          ) : null}
          {siblingsSummary ? <p className="tiny muted">{siblingsSummary}</p> : null}
        </div>
      ) : null}

      {existingLines.length > 0 ? (
        <section className="student-edit-siblings__existing">
          <h3 className="student-edit-section__title">{t('admin.student360.editPage.existingSiblingLines')}</h3>
          <p className="tiny muted">{t('admin.student360.editPage.existingSiblingLinesHint')}</p>
          <SiblingLinesCards lines={existingLines} />
        </section>
      ) : null}

      <section>
        <h3 className="student-edit-section__title">{t('admin.student360.editPage.siblingsIntake')}</h3>
        <p className="tiny muted">{t('admin.student360.editPage.pendingSiblingLinesHint')}</p>
        <SiblingsFormFields
          hasSiblings={state.hasSiblings}
          siblingsRawText={state.siblingsRawText}
          siblingsLevels={state.siblingsLevels}
          siblingLines={newLines}
          onChange={(patch) => {
            const next: Partial<StudentProfileFormState> = {};
            if (patch.hasSiblings != null) next.hasSiblings = patch.hasSiblings;
            if (patch.siblingsRawText != null) next.siblingsRawText = patch.siblingsRawText;
            if (patch.siblingsLevels != null) next.siblingsLevels = patch.siblingsLevels;
            if (patch.siblingLines != null) {
              next.siblingLines = [...existingLines, ...patch.siblingLines];
            } else if (patch.hasSiblings === false) {
              next.siblingLines = [];
            }
            onChange(next);
          }}
        />
      </section>
    </div>
  );
}
