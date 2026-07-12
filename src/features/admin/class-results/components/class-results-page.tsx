/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { ClassMultiSubjectResults } from '@/types/class-multi-subject-results';
import type { GradebookTermOption } from '@/types/gradebook';
import { getClassMultiSubjectResults } from '../api/class-results-api';
import '../class-results-workspace.css';
import { ClassResultsCoverage } from './class-results-coverage';
import { ClassResultsFilters } from './class-results-filters';
import { ClassResultsMatrix } from './class-results-matrix';
import { ClassResultsWarnings } from './class-results-warnings';

export function ClassResultsPage() {
  const t = useT();
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [data, setData] = useState<ClassMultiSubjectResults | null>(null);
  const [nonce, setNonce] = useState(0);

  const { options: academicYearOptions } = useAcademicYearOptions();
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);

  const allTerms = useMemo(() => {
    const fromMeta =
      (classesState.meta?.terms as GradebookTermOption[] | undefined) ??
      ([] as GradebookTermOption[]);
    return fromMeta;
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

  const contextReady = Boolean(academicYearId && termId && classId);

  const handleAcademicYearChange = useCallback((value: string) => {
    setAcademicYearId(value);
    setTermId('');
    setClassId('');
    setData(null);
    setError(null);
  }, []);

  const handleTermChange = useCallback((value: string) => {
    setTermId(value);
    setData(null);
    setError(null);
  }, []);

  const handleClassChange = useCallback((value: string) => {
    setClassId(value);
    setData(null);
    setError(null);
  }, []);

  const resetFilters = useCallback(() => {
    setAcademicYearId('');
    setTermId('');
    setClassId('');
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!contextReady) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void getClassMultiSubjectResults({
      classId,
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
  }, [academicYearId, termId, classId, contextReady, nonce]);

  const subtitle = data?.context?.class_name
    ? t('admin.classResults.subtitleWithClass', { className: data.context.class_name })
    : t('admin.classResults.subtitle');

  return (
    <div className="admin-workspace class-results-workspace" data-testid="class-results-workspace">
      <PageHeader title={t('admin.classResults.title')} subtitle={subtitle} />

      <ClassResultsFilters
        academicYearId={academicYearId}
        termId={termId}
        classId={classId}
        academicYears={academicYearOptions}
        terms={terms}
        classes={classesState.data ?? []}
        onAcademicYearIdChange={handleAcademicYearChange}
        onTermIdChange={handleTermChange}
        onClassIdChange={handleClassChange}
        onReset={resetFilters}
        hasSelection={Boolean(academicYearId || termId || classId)}
      />

      {!contextReady ? (
        <EmptyState
          icon="📊"
          title={t('admin.classResults.empty.noContext.title')}
          description={t('admin.classResults.empty.noContext.description')}
        />
      ) : null}

      {contextReady && loading ? (
        <LoadingState label={t('admin.classResults.loading')} />
      ) : null}

      {contextReady && !loading && error ? (
        <ApiErrorView error={error} onRetry={() => setNonce((n) => n + 1)} />
      ) : null}

      {contextReady && !loading && !error && data ? (
        <ClassResultsContent data={data} />
      ) : null}
    </div>
  );
}

function ClassResultsContent({ data }: { data: ClassMultiSubjectResults }) {
  const t = useT();
  const hasSubjects = data.subjects.length > 0;
  const hasRoster = data.roster.length > 0;
  const noGradebooks = data.coverage.gradebooks_count === 0 || !hasSubjects;

  return (
    <div className="class-results-content" data-testid="class-results-content">
      <div className="class-results-context muted tiny" data-testid="class-results-context">
        {data.context.class_name}
        {data.context.level_code ? ` · ${data.context.level_code}` : ''}
      </div>

      <ClassResultsCoverage coverage={data.coverage} />
      <ClassResultsWarnings warnings={data.warnings} />

      {noGradebooks && hasRoster ? (
        <EmptyState
          icon="📒"
          title={t('admin.classResults.empty.noGradebooks.title')}
          description={t('admin.classResults.empty.noGradebooks.description')}
        />
      ) : null}

      {!hasRoster ? (
        <EmptyState
          icon="👥"
          title={t('admin.classResults.empty.emptyRoster.title')}
          description={t('admin.classResults.empty.emptyRoster.description')}
        />
      ) : null}

      {hasRoster && !hasSubjects ? (
        <EmptyState
          icon="📚"
          title={t('admin.classResults.empty.noSubjects.title')}
          description={t('admin.classResults.empty.noSubjects.description')}
        />
      ) : null}

      {hasRoster && hasSubjects ? (
        <ClassResultsMatrix roster={data.roster} subjects={data.subjects} matrix={data.matrix} />
      ) : null}

      {/* Explicit absence of overall average / ranking / mutations */}
      <div hidden data-testid="class-results-no-average" data-has-average="false" />
      <div hidden data-testid="class-results-no-ranking" data-has-ranking="false" />
    </div>
  );
}
