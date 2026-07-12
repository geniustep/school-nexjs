/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentMultiSubjectCoverage } from '@/types/student-multi-subject-results';

const COVERAGE_KEYS = [
  'subjects_count',
  'available_subjects',
  'complete_subjects',
  'partial_subjects',
  'not_computable_subjects',
  'not_available_subjects',
  'missing_subjects',
] as const;

export function StudentAcademicResultsCoverage({
  coverage,
}: {
  coverage: StudentMultiSubjectCoverage;
}) {
  const t = useT();

  return (
    <section
      className="student-academic-results-coverage card card--pad"
      data-testid="student-academic-results-coverage"
    >
      <h2 className="student-academic-results-section-title">
        {t('admin.student360.academic.coverage.title')}
      </h2>
      <div className="student-academic-results-coverage__grid">
        {COVERAGE_KEYS.map((key) => (
          <div key={key} data-coverage-key={key}>
            <span className="student-academic-results-meta-label">
              {t(`admin.student360.academic.coverage.${key}`)}
            </span>
            <strong>{coverage[key]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
