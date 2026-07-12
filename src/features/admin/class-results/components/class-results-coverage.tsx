/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useT } from '@/features/i18n/locale-context';
import type { ClassMultiSubjectCoverage } from '@/types/class-multi-subject-results';

export function ClassResultsCoverage({ coverage }: { coverage: ClassMultiSubjectCoverage }) {
  const t = useT();
  const stateEntries = Object.entries(coverage.gradebooks_by_state ?? {});

  return (
    <section className="class-results-coverage card card--pad" data-testid="class-results-coverage">
      <h2 className="class-results-section-title">{t('admin.classResults.coverage.title')}</h2>
      <div className="class-results-coverage__grid">
        <div>
          <span className="class-results-meta-label">{t('admin.classResults.coverage.gradebooks')}</span>
          <strong>{coverage.gradebooks_count}</strong>
        </div>
        <div>
          <span className="class-results-meta-label">{t('admin.classResults.coverage.subjects')}</span>
          <strong>{coverage.subjects_count}</strong>
        </div>
        <div>
          <span className="class-results-meta-label">{t('admin.classResults.coverage.roster')}</span>
          <strong>{coverage.roster_count}</strong>
        </div>
        <div>
          <span className="class-results-meta-label">
            {t('admin.classResults.coverage.studentsWithAllSubjects')}
          </span>
          <strong>{coverage.students_with_all_subjects}</strong>
        </div>
        <div>
          <span className="class-results-meta-label">
            {t('admin.classResults.coverage.studentsWithMissingSubjects')}
          </span>
          <strong>{coverage.students_with_missing_subjects}</strong>
        </div>
        <div>
          <span className="class-results-meta-label">{t('admin.classResults.coverage.warnings')}</span>
          <strong>{coverage.warnings_count}</strong>
        </div>
      </div>
      {stateEntries.length > 0 ? (
        <div className="class-results-coverage__states" data-testid="class-results-coverage-states">
          <span className="class-results-meta-label">
            {t('admin.classResults.coverage.gradebooksByState')}
          </span>
          <ul className="class-results-coverage__state-list">
            {stateEntries.map(([state, count]) => (
              <li key={state}>
                {state}: {count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
