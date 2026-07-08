'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { buildStudentImportReferenceData } from './student-import-reference';
import {
  StudentImportConfirmationPanel,
  StudentImportExecutePanel,
} from './student-import-confirmation';
import { StudentImportPreview } from './student-import-preview';
import { RequireStudentImportCapability } from './require-student-import-capability';
import { StudentImportResultsPanel } from './student-import-results';
import { StudentImportRowDetails } from './student-import-row-details';
import { StudentImportServerValidationPanel } from './student-import-server-panel';
import {
  resolveStudentImportUiStep,
  StudentImportStepper,
} from './student-import-stepper';
import { StudentImportSummaryCards } from './student-import-summary';
import { StudentImportUpload } from './student-import-upload';
import { toRowDetails, useStudentImportFlow } from './use-student-import-flow';
import './student-import.css';

function resolveSchoolLabel(
  reference: ReturnType<typeof buildStudentImportReferenceData>,
  activeSchoolId: number | null,
): string {
  if (!reference || activeSchoolId == null) return '';
  for (const school of reference.schools.values()) {
    if (school.id === activeSchoolId) return school.name;
  }
  return String(activeSchoolId);
}

export function StudentImportPage() {
  const t = useT();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const optionsState = useStudentOptions();
  const reference = useMemo(
    () => buildStudentImportReferenceData(optionsState.options),
    [optionsState.options],
  );

  const templateAcademicYearId = useMemo(() => {
    const years = optionsState.options?.academicYears ?? [];
    return years.find((year) => year.is_current)?.id ?? years[0]?.id ?? null;
  }, [optionsState.options]);

  const flow = useStudentImportFlow(reference, { academicYearId: templateAcademicYearId });
  const activeStep = resolveStudentImportUiStep(flow.activePhase);
  const schoolName = resolveSchoolLabel(reference, activeSchoolId);
  const rowDetails = toRowDetails(flow.selectedRow);

  const executableCount = useMemo(
    () => flow.mergedRows.filter((row) => row.executable).length,
    [flow.mergedRows],
  );

  const showLocalSection =
    flow.localResult &&
    !['completed', 'completed_with_errors', 'failed'].includes(flow.activePhase);

  const showResults = flow.execution && ['completed', 'completed_with_errors', 'failed'].includes(flow.activePhase);
  const localResult = flow.localResult;

  if (optionsState.loading && !optionsState.options) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (optionsState.error) {
    return <ApiErrorView error={optionsState.error} onRetry={() => optionsState.reload()} />;
  }

  return (
    <div className="student-import-page">
      <PageHeader
        title={t('admin.studentImport.title')}
        subtitle={t('admin.studentImport.subtitle')}
        actions={
          <Link href="/admin/students" className="btn btn--ghost btn--sm">
            {t('admin.studentImport.backToStudents')}
          </Link>
        }
      />

      <InfoBanner title={t('admin.studentImport.privacyNotice')} />

      <StudentImportStepper activeStep={activeStep} />

      {!showResults ? (
        <>
          <Card>
            <SectionHead title={t('admin.studentImport.download.title')} />
            <p className="tiny muted">{t('admin.studentImport.download.description')}</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={flow.downloading}
              onClick={() => void flow.handleDownloadTemplate()}
            >
              {flow.downloading ? t('common.downloading') : t('admin.studentImport.download.button')}
            </button>
          </Card>

          <Card>
            <SectionHead title={t('admin.studentImport.fill.title')} />
            <p className="tiny muted">{t('admin.studentImport.fill.description')}</p>
          </Card>

          <StudentImportUpload
            file={flow.file}
            error={flow.uploadError}
            parsing={flow.busy && flow.activePhase === 'local_validating'}
            onFileSelected={(next) => void flow.handleFileSelected(next)}
            onClear={() => flow.resetAll()}
          />
        </>
      ) : null}

      {showLocalSection && localResult ? (
        <>
          {localResult.fileErrors.length > 0 ? (
            <Card>
              <SectionHead title={t('admin.studentImport.fileErrors.title')} />
              <div className="col" style={{ gap: 6 }}>
                {localResult.fileErrors.map((issue, index) => (
                  <div key={index} className="tiny" style={{ color: 'var(--danger)' }}>
                    {issue.message}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <StudentImportSummaryCards summary={localResult.summary} />

          {(localResult.fileErrors.length === 0 &&
            (localResult.format === 'odoo_v1'
              ? localResult.rows.length > 0
              : localResult.summary.invalidRows === 0)) ? (
            <StudentImportServerValidationPanel
              busy={flow.busy && flow.activePhase === 'server_validating'}
              canRun={flow.canRunServerValidation}
              validation={flow.serverValidation}
              validationExpired={flow.validationExpired}
              onValidate={() => void flow.runServerValidation()}
            />
          ) : null}

          <Card>
            <SectionHead title={t('admin.studentImport.preview.title')} />
            <StudentImportPreview
              rows={flow.previewRows}
              filter={flow.filter}
              search={flow.search}
              onFilterChange={flow.setFilter}
              onSearchChange={flow.setSearch}
              onSelectRow={(row) => {
                const merged = flow.mergedRows.find((m) => m.rowNumber === row.rowNumber);
                flow.setSelectedRow(merged ?? row);
              }}
            />
          </Card>

          {(localResult.summary.totalErrors > 0 ||
            localResult.summary.totalWarnings > 0 ||
            flow.mergedRows.some((r) => r.serverErrors.length > 0 || r.serverWarnings.length > 0)) && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void flow.handleDownloadErrorReport()}
            >
              {t('admin.studentImport.downloadErrorReport')}
            </button>
          )}

          {flow.canConfirm ? (
            <StudentImportConfirmationPanel
              fileName={flow.file?.name ?? null}
              schoolName={schoolName}
              rowCount={executableCount}
              warningCount={flow.serverValidation?.summary.warning_rows ?? 0}
              confirmed={flow.confirmed}
              canConfirm={flow.canConfirm}
              onConfirmedChange={flow.setConfirmed}
              onContinue={() => flow.setPhase('confirming')}
            />
          ) : null}

          {flow.canShowExecute ? (
            <StudentImportExecutePanel
              busy={flow.busy && (flow.activePhase === 'executing' || flow.activePhase === 'polling')}
              canExecute={flow.canExecute}
              onExecute={() => void flow.executeImport()}
            />
          ) : null}

          {flow.serverValidation && flow.serverValidation.summary.invalid_rows > 0 ? (
            <InfoBanner title={t('admin.studentImport.server.fixBeforeExecute')} tone="amber" />
          ) : null}

          {flow.validationExpired && flow.serverValidation ? (
            <InfoBanner title={t('admin.studentImport.server.validationExpired')} tone="amber" />
          ) : null}

          {flow.activePhase === 'executing' || flow.activePhase === 'polling' ? (
            <InfoBanner title={t('admin.studentImport.execute.doNotClose')} tone="blue" />
          ) : null}
        </>
      ) : null}

      {showResults && flow.execution ? (
        <StudentImportResultsPanel
          execution={flow.execution}
          page={flow.resultsPage}
          busy={flow.busy}
          onPageChange={(page) => void flow.loadResultsPage(page)}
          onDownloadReport={() => void flow.handleDownloadResultReport()}
          onBackToList={() => router.push('/admin/students')}
          onStartNew={() => flow.resetAll()}
        />
      ) : null}

      <StudentImportRowDetails row={rowDetails} onClose={() => flow.setSelectedRow(null)} />
    </div>
  );
}

export function StudentImportPageShell() {
  return (
    <RequireStudentImportCapability>
      <StudentImportPage />
    </RequireStudentImportCapability>
  );
}
