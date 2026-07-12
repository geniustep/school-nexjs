/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { StudentMultiSubjectWarning } from '@/types/student-multi-subject-results';
import { studentWarningTitleKey } from '../utils/student-multi-subject-results-present';

const SUMMARY_THRESHOLD = 3;

export function StudentAcademicResultsWarnings({
  warnings,
}: {
  warnings: StudentMultiSubjectWarning[];
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(warnings.length <= SUMMARY_THRESHOLD);
  const showToggle = warnings.length > SUMMARY_THRESHOLD;
  const visible = expanded ? warnings : warnings.slice(0, SUMMARY_THRESHOLD);

  return (
    <section
      className="student-academic-results-warnings card card--pad"
      data-testid="student-academic-results-warnings"
    >
      <div className="student-academic-results-warnings__head">
        <h2 className="student-academic-results-section-title">
          {t('admin.student360.academic.warnings.title')}
        </h2>
        {warnings.length > 0 ? (
          <span className="student-academic-results-warnings__count" data-testid="student-academic-warnings-count">
            {t('admin.student360.academic.warnings.summary', { count: warnings.length })}
          </span>
        ) : null}
      </div>

      {warnings.length === 0 ? (
        <p className="muted tiny" data-testid="student-academic-warnings-empty">
          {t('admin.student360.academic.warnings.empty')}
        </p>
      ) : (
        <>
          <ul className="student-academic-results-warnings__list">
            {visible.map((warning, index) => (
              <li
                key={`${warning.code}-${warning.subject_id ?? ''}-${warning.gradebook_id ?? ''}-${index}`}
                className="student-academic-results-warnings__item"
                data-warning-code={warning.code}
              >
                <strong>{t(studentWarningTitleKey(String(warning.code)))}</strong>
                <p>{warning.message}</p>
                <div className="muted tiny student-academic-results-warnings__meta">
                  {warning.subject_code ? (
                    <span>
                      {t('admin.student360.academic.warnings.subjectCode')}: {warning.subject_code}
                    </span>
                  ) : null}
                  {warning.gradebook_id != null ? (
                    <span>
                      {t('admin.student360.academic.warnings.gradebookId')}: {warning.gradebook_id}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {showToggle ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setExpanded((prev) => !prev)}
              data-testid="student-academic-warnings-toggle"
            >
              {expanded
                ? t('admin.student360.academic.warnings.collapse')
                : t('admin.student360.academic.warnings.expand')}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
