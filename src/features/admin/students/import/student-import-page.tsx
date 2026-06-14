'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { useT } from '@/features/i18n/locale-context';
import {
  STUDENT_IMPORT_ERROR_REPORT_FILENAME,
  STUDENT_IMPORT_TEMPLATE_FILENAME,
} from './student-import-constants';
import { buildStudentImportReferenceData } from './student-import-reference';
import { buildStudentImportTemplateLabels } from './student-import-labels';
import { StudentImportPreview } from './student-import-preview';
import { StudentImportRowDetails } from './student-import-row-details';
import {
  resolveStudentImportStep,
  StudentImportStepper,
} from './student-import-stepper';
import { StudentImportSummaryCards } from './student-import-summary';
import {
  buildStudentImportErrorReportWorkbook,
  buildStudentImportTemplateWorkbook,
  downloadArrayBuffer,
} from './student-import-template';
import { StudentImportUpload, validateStudentImportFile } from './student-import-upload';
import type { StudentImportPreviewFilter, StudentImportRowResult, StudentImportValidationResult } from './student-import-types';
import { filterStudentImportRows, validateStudentImportWorkbook } from './student-import-validator';
import './student-import.css';

export function StudentImportPage() {
  const t = useT();
  const toast = useToast();
  const optionsState = useStudentOptions();
  const reference = useMemo(
    () => buildStudentImportReferenceData(optionsState.options),
    [optionsState.options],
  );

  const [downloading, setDownloading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<StudentImportValidationResult | null>(null);
  const [filter, setFilter] = useState<StudentImportPreviewFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedRow, setSelectedRow] = useState<StudentImportRowResult | null>(null);

  const issueMessage = useCallback(
    (code: string, field?: string) => t(`admin.studentImport.issueCodes.${code}`, { field: field ?? '' }),
    [t],
  );

  const filteredRows = useMemo(() => {
    if (!result) return [];
    return filterStudentImportRows(result.rows, filter, search);
  }, [result, filter, search]);

  const activeStep = resolveStudentImportStep({
    hasFile: !!file,
    validating,
    hasResult: !!result,
  });

  async function handleDownloadTemplate() {
    if (!reference) {
      toast.error(t('admin.studentImport.errors.referenceUnavailable'));
      return;
    }
    setDownloading(true);
    try {
      const labels = buildStudentImportTemplateLabels(t, reference);
      const buffer = await buildStudentImportTemplateWorkbook(reference, labels);
      downloadArrayBuffer(buffer, STUDENT_IMPORT_TEMPLATE_FILENAME);
    } catch {
      toast.error(t('admin.studentImport.errors.templateDownloadFailed'));
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileSelected(next: File) {
    const validationError = validateStudentImportFile(next, t);
    if (validationError) {
      setUploadError(validationError);
      setFile(null);
      setResult(null);
      return;
    }
    if (!reference) {
      setUploadError(t('admin.studentImport.errors.referenceUnavailable'));
      return;
    }

    setFile(next);
    setUploadError(null);
    setResult(null);
    setValidating(true);

    try {
      const buffer = await next.arrayBuffer();
      const validation = await validateStudentImportWorkbook(buffer, reference, issueMessage);
      setResult(validation);
      if (validation.fileErrors.some((e) => e.code === 'invalid_template_version')) {
        toast.error(t('admin.studentImport.errors.outdatedTemplate'));
      }
    } catch {
      setUploadError(t('admin.studentImport.errors.parseFailed'));
      setResult(null);
    } finally {
      setValidating(false);
    }
  }

  async function handleDownloadErrorReport() {
    if (!result) return;
    const buffer = await buildStudentImportErrorReportWorkbook(result, {
      rowNumber: t('admin.studentImport.report.rowNumber'),
      field: t('admin.studentImport.report.field'),
      severity: t('admin.studentImport.report.severity'),
      errorCode: t('admin.studentImport.report.errorCode'),
      message: t('admin.studentImport.report.message'),
      originalValue: t('admin.studentImport.report.originalValue'),
      status: t('admin.studentImport.report.status'),
    });
    downloadArrayBuffer(buffer, STUDENT_IMPORT_ERROR_REPORT_FILENAME);
  }

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

      <InfoBanner title={t('admin.studentImport.notPersistedNotice')} />

      <StudentImportStepper activeStep={activeStep} />

      <Card>
        <SectionHead title={t('admin.studentImport.download.title')} />
        <p className="tiny muted">{t('admin.studentImport.download.description')}</p>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={downloading || !reference}
          onClick={() => void handleDownloadTemplate()}
        >
          {downloading ? t('common.downloading') : t('admin.studentImport.download.button')}
        </button>
      </Card>

      <Card>
        <SectionHead title={t('admin.studentImport.fill.title')} />
        <p className="tiny muted">{t('admin.studentImport.fill.description')}</p>
      </Card>

      <StudentImportUpload
        file={file}
        error={uploadError}
        parsing={validating}
        onFileSelected={(next) => void handleFileSelected(next)}
        onClear={() => {
          setFile(null);
          setUploadError(null);
          setResult(null);
        }}
      />

      {result ? (
        <>
          {result.fileErrors.length > 0 ? (
            <Card>
              <SectionHead title={t('admin.studentImport.fileErrors.title')} />
              <div className="col" style={{ gap: 6 }}>
                {result.fileErrors.map((issue, index) => (
                  <div key={index} className="tiny" style={{ color: 'var(--danger)' }}>
                    {issue.message}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <StudentImportSummaryCards summary={result.summary} />

          <Card>
            <SectionHead title={t('admin.studentImport.preview.title')} />
            <StudentImportPreview
              rows={filteredRows}
              filter={filter}
              search={search}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onSelectRow={setSelectedRow}
            />
          </Card>

          <div className="student-import-actions row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(result.summary.totalErrors > 0 || result.summary.totalWarnings > 0) && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void handleDownloadErrorReport()}>
                {t('admin.studentImport.downloadErrorReport')}
              </button>
            )}
            <button type="button" className="btn btn--primary btn--sm" disabled>
              {t('admin.studentImport.executeDisabled')}
            </button>
          </div>

          {result.readyForImport ? (
            <InfoBanner title={t('admin.studentImport.readyForImport')} tone="green" />
          ) : (
            <InfoBanner title={t('admin.studentImport.fixBeforeImport')} tone="amber" />
          )}

          <p className="tiny muted">{t('admin.studentImport.importNotExecuted')}</p>
        </>
      ) : null}

      <StudentImportRowDetails row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}

export function StudentImportPageShell() {
  return (
    <RequireAdminPermission permission="manage_students">
      <StudentImportPage />
    </RequireAdminPermission>
  );
}
