/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useT } from '@/features/i18n/locale-context';
import type { ClassMultiSubjectWarning } from '@/types/class-multi-subject-results';
import { classWarningTitleKey } from '../utils/class-results-present';

export function ClassResultsWarnings({ warnings }: { warnings: ClassMultiSubjectWarning[] }) {
  const t = useT();

  return (
    <section className="class-results-warnings card card--pad" data-testid="class-results-warnings">
      <h2 className="class-results-section-title">{t('admin.classResults.warnings.title')}</h2>
      {warnings.length === 0 ? (
        <p className="muted tiny" data-testid="class-results-warnings-empty">
          {t('admin.classResults.warnings.empty')}
        </p>
      ) : (
        <ul className="class-results-warnings__list">
          {warnings.map((warning, index) => (
            <li
              key={`${warning.code}-${warning.subject_id ?? ''}-${warning.gradebook_id ?? ''}-${index}`}
              className="class-results-warnings__item"
              data-warning-code={warning.code}
            >
              <strong>{t(classWarningTitleKey(String(warning.code)))}</strong>
              <p>{warning.message}</p>
              <div className="muted tiny class-results-warnings__meta">
                {warning.subject_code ? (
                  <span>
                    {t('admin.classResults.warnings.subjectCode')}: {warning.subject_code}
                  </span>
                ) : null}
                {warning.gradebook_id != null ? (
                  <span>
                    {t('admin.classResults.warnings.gradebookId')}: {warning.gradebook_id}
                  </span>
                ) : null}
                {warning.student_id != null ? (
                  <span>
                    {t('admin.classResults.warnings.studentId')}: {warning.student_id}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
