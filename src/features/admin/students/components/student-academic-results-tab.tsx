/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { GradebookTermOption } from '@/types/gradebook';
import type { StudentDetailsData } from '@/types/student-360';
import type { StudentMultiSubjectResults } from '@/types/student-multi-subject-results';
import { getStudentMultiSubjectResults } from '../api/student-multi-subject-results-api';
import {
  buildStudentSubjectResultViews,
  isStudentNotEnrolledPayload,
} from '../utils/student-multi-subject-results-present';
import { Student360CompactEmpty } from './student-360-compact-empty';
import { StudentAcademicResultsCoverage } from './student-academic-results-coverage';
import { StudentAcademicResultsFilters } from './student-academic-results-filters';
import { StudentAcademicResultsList } from './student-academic-results-list';
import { StudentAcademicResultsWarnings } from './student-academic-results-warnings';
import '../student-academic-results.css';

function enrollmentYearId(details: StudentDetailsData): string {
  const year = details.current_enrollment?.academic_year;
  if (year && typeof year === 'object' && year.id != null) return String(year.id);
  return '';
}

export function StudentAcademicResultsTab({ details }: { details: StudentDetailsData }) {
  const t = useT();
  const studentId = details.student.id;
  const defaultYearId = enrollmentYearId(details);

  const [academicYearId, setAcademicYearId] = useState(defaultYearId);
  const [termId, setTermId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [data, setData] = useState<StudentMultiSubjectResults | null>(null);
  const [nonce, setNonce] = useState(0);

  const { options: academicYearOptions } = useAcademicYearOptions();
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);

  const allTerms = useMemo(() => {
    return (classesState.meta?.terms as GradebookTermOption[] | undefined) ?? [];
  }, [classesState.meta?.terms]);

  const terms = useMemo(() => {
    if (!academicYearId) return [] as GradebookTermOption[];
    const yearNum = Number(academicYearId);
    const filtered = allTerms.filter((term) => {
      if (term.academic_year_id == null) return true;
      return Number(term.academic_year_id) === yearNum;
    });
    return filtered.length > 0 ? filtered : allTerms;
  }, [allTerms, academicYearId]);

  const contextReady = Boolean(academicYearId && termId);

  const handleAcademicYearChange = useCallback((value: string) => {
    setAcademicYearId(value);
    setTermId('');
    setData(null);
    setError(null);
  }, []);

  const handleTermChange = useCallback((value: string) => {
    setTermId(value);
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!defaultYearId || academicYearId) return;
    setAcademicYearId(defaultYearId);
  }, [defaultYearId, academicYearId]);

  useEffect(() => {
    if (!contextReady) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void getStudentMultiSubjectResults({
      studentId,
      academicYearId,
      termId,
    }).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setData(res.data);
        setError(null);
      } else if (!res.success) {
        setError(res.error);
        setData(null);
      } else {
        setData(null);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [studentId, academicYearId, termId, contextReady, nonce]);

  const yearLabel =
    academicYearOptions.find((y) => String(y.id) === academicYearId)?.name ??
    data?.context.academic_year_name ??
    academicYearId;
  const termLabel =
    terms.find((term) => String(term.id) === termId)?.name ?? data?.context.term_name ?? termId;
  const classLabel = data?.context.class_name ?? details.current_enrollment?.class?.name ?? null;
  const levelLabel =
    data?.context.level_code ??
    details.current_enrollment?.level?.code ??
    details.current_enrollment?.level?.name ??
    null;

  const subjectRows = useMemo(
    () => (data ? buildStudentSubjectResultViews(data) : []),
    [data],
  );
  const notEnrolled = isStudentNotEnrolledPayload(data);
  const noGradebooks =
    Boolean(data) &&
    data!.subjects.length === 0 &&
    data!.results.length === 0 &&
    (data!.coverage.subjects_count === 0 ||
      data!.warnings.some((w) => String(w.code) === 'configured_subject_without_gradebook'));
  const warningsOnly =
    Boolean(data) &&
    subjectRows.length === 0 &&
    data!.warnings.length > 0 &&
    !notEnrolled;

  return (
    <div
      className="student-academic-results-tab student-360-tab-panel"
      data-testid="student-academic-results-tab"
    >
      <StudentAcademicResultsFilters
        academicYearId={academicYearId}
        termId={termId}
        academicYears={academicYearOptions}
        terms={terms}
        onAcademicYearIdChange={handleAcademicYearChange}
        onTermIdChange={handleTermChange}
      />

      {contextReady ? (
        <section
          className="student-academic-results-context card card--pad"
          data-testid="student-academic-results-context"
        >
          <h2 className="student-academic-results-section-title">
            {t('admin.student360.academic.context.title')}
          </h2>
          <dl className="student-academic-results-context__grid">
            <div>
              <dt>{t('admin.student360.academic.context.academicYear')}</dt>
              <dd>{yearLabel || t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.academic.context.term')}</dt>
              <dd>{termLabel || t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.academic.context.class')}</dt>
              <dd>{classLabel || t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.academic.context.level')}</dt>
              <dd>{levelLabel || t('common.dash')}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {!academicYearId ? (
        <EmptyState
          icon="📅"
          title={t('admin.student360.academic.empty.noYear.title')}
          description={t('admin.student360.academic.empty.noYear.description')}
        />
      ) : null}

      {academicYearId && !termId ? (
        <EmptyState
          icon="🗓️"
          title={t('admin.student360.academic.empty.noTerm.title')}
          description={t('admin.student360.academic.empty.noTerm.description')}
        />
      ) : null}

      {contextReady && loading ? (
        <LoadingState label={t('admin.student360.academic.loading')} />
      ) : null}

      {contextReady && !loading && error ? (
        <ApiErrorView error={error} onRetry={() => setNonce((n) => n + 1)} />
      ) : null}

      {contextReady && !loading && !error && data ? (
        <div className="student-academic-results-content" data-testid="student-academic-results-content">
          {notEnrolled ? (
            <Student360CompactEmpty
              title={t('admin.student360.academic.empty.noEnrollment.title')}
              description={t('admin.student360.academic.empty.noEnrollment.description')}
            />
          ) : null}

          {!notEnrolled ? (
            <>
              <StudentAcademicResultsCoverage coverage={data.coverage} />

              {noGradebooks && subjectRows.length === 0 ? (
                <Student360CompactEmpty
                  title={t('admin.student360.academic.empty.noGradebooks.title')}
                  description={t('admin.student360.academic.empty.noGradebooks.description')}
                />
              ) : (
                <StudentAcademicResultsList rows={subjectRows} />
              )}

              {warningsOnly ? (
                <p className="muted tiny" data-testid="student-academic-warnings-only">
                  {t('admin.student360.academic.empty.warningsOnly.description')}
                </p>
              ) : null}

              <StudentAcademicResultsWarnings warnings={data.warnings} />
            </>
          ) : (
            <StudentAcademicResultsWarnings warnings={data.warnings} />
          )}
        </div>
      ) : null}
    </div>
  );
}
