'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  executeStudentImportJob,
  fetchStudentImportJob,
  pollStudentImportJobUntilDone,
  validateStudentImportJob,
} from './student-import-api';
import { hasStudentImportCapability } from './student-import-capability';
import { downloadStudentImportTemplate } from './student-import-template-download';
import {
  collectMergedIssues,
  mergeLocalAndServerRows,
  mergedRowsForPreview,
} from './student-import-merge';
import {
  assertValidationPayloadKeys,
  buildStudentImportValidationRequest,
  canExecuteImport,
  canShowExecutePanel,
  hasStudentImportEligiblePayloadRows,
  isValidationExpired,
} from './student-import-payload';
import { mapServerIssueMessage } from './student-import-server-normalize';
import type {
  StudentImportExecutionState,
  StudentImportFlowPhase,
  StudentImportMergedRow,
  StudentImportServerValidationState,
} from './student-import-server-types';
import { buildStudentImportResultReportWorkbook } from './student-import-result-report';
import {
  buildStudentImportErrorReportWorkbook,
  downloadArrayBuffer,
} from './student-import-template';
import { validateStudentImportFile } from './student-import-upload';
import type {
  StudentImportPreviewFilter,
  StudentImportReferenceData,
  StudentImportRowResult,
  StudentImportValidationResult,
} from './student-import-types';
import { filterStudentImportRows, hasStudentImportFileErrors, validateStudentImportWorkbook } from './student-import-validator';
import { useSession } from '@/features/auth/session-context';

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

function phaseFromState(args: {
  phase: StudentImportFlowPhase;
  hasFile: boolean;
  localResult: StudentImportValidationResult | null;
  serverValidation: StudentImportServerValidationState | null;
  execution: StudentImportExecutionState | null;
}): StudentImportFlowPhase {
  if (args.execution) {
    if (args.execution.state === 'completed') return 'completed';
    if (args.execution.state === 'completed_with_errors') return 'completed_with_errors';
    return 'failed';
  }
  return args.phase;
}

export function hasEligibleStudentImportServerRows(validation: StudentImportValidationResult): boolean {
  if (validation.format === 'odoo_v1') {
    return hasStudentImportEligiblePayloadRows(validation.rows);
  }
  return validation.summary.invalidRows === 0;
}

export function useStudentImportFlow(
  reference: StudentImportReferenceData | null,
  options?: { academicYearId?: number | null },
) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const user = useSession();
  const { activeSchoolId } = useAdminSession();
  const hasCapability = hasStudentImportCapability(user);

  const idempotencyKeyRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<StudentImportFlowPhase>('idle');
  const [downloading, setDownloading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<StudentImportValidationResult | null>(null);
  const [serverValidation, setServerValidation] = useState<StudentImportServerValidationState | null>(null);
  const [mergedRows, setMergedRows] = useState<StudentImportMergedRow[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [execution, setExecution] = useState<StudentImportExecutionState | null>(null);
  const [resultsPage, setResultsPage] = useState(1);
  const [filter, setFilter] = useState<StudentImportPreviewFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedRow, setSelectedRow] = useState<StudentImportRowDetailsData>(null);
  const [busy, setBusy] = useState(false);

  const issueMessage = useCallback(
    (code: string, field?: string) => t(`admin.studentImport.issueCodes.${code}`, { field: field ?? '' }),
    [t],
  );

  const validationExpired = useMemo(
    () => isValidationExpired(serverValidation?.expiresAt),
    [serverValidation?.expiresAt],
  );

  const previewRows = useMemo(() => {
    const rows = mergedRows.length > 0 ? mergedRowsForPreview(mergedRows) : localResult?.rows ?? [];
    return filterStudentImportRows(rows, filter, search);
  }, [mergedRows, localResult, filter, search]);

  const activePhase = phaseFromState({ phase, hasFile: !!file, localResult, serverValidation, execution });

  const canRunServerValidation =
    hasCapability &&
    !!localResult &&
    hasStudentImportFileErrors(localResult.fileErrors) === false &&
    hasEligibleStudentImportServerRows(localResult) &&
    !busy &&
    !execution;

  const canConfirm =
    hasCapability &&
    !!serverValidation &&
    !validationExpired &&
    serverValidation.summary.invalid_rows === 0 &&
    !execution;

  const canShowExecute = canShowExecutePanel({
    jobId: serverValidation?.jobId,
    serverInvalidRows: serverValidation?.summary.invalid_rows ?? 0,
    validationExpired,
    hasCapability,
    hasExecution: !!execution,
  });

  const canExecute =
    canExecuteImport({
      jobId: serverValidation?.jobId,
      localInvalidRows: localResult?.summary.invalidRows ?? 0,
      serverInvalidRows: serverValidation?.summary.invalid_rows ?? 0,
      validationExpired,
      hasCapability,
      confirmed,
      phase,
      hasExecution: !!execution,
    }) && !busy;

  function resetServerState() {
    setServerValidation(null);
    setMergedRows([]);
    setConfirmed(false);
    setExecution(null);
    setResultsPage(1);
    idempotencyKeyRef.current = null;
  }

  const resetAll = useCallback(() => {
    setFile(null);
    setUploadError(null);
    setLocalResult(null);
    resetServerState();
    setPhase('idle');
    setFilter('all');
    setSearch('');
    setSelectedRow(null);
  }, []);

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      const result = await downloadStudentImportTemplate({
        academicYearId: options?.academicYearId,
      });
      if (!result.ok) {
        toast.error(t('admin.studentImport.errors.templateDownloadFailed'));
      }
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
      setLocalResult(null);
      resetServerState();
      setPhase('idle');
      return;
    }
    if (!reference) {
      setUploadError(t('admin.studentImport.errors.referenceUnavailable'));
      return;
    }

    setFile(next);
    setUploadError(null);
    resetServerState();
    setPhase('local_validating');
    setBusy(true);

    try {
      const buffer = await next.arrayBuffer();
      const validation = await validateStudentImportWorkbook(buffer, reference, issueMessage);
      setLocalResult(validation);
      if (validation.fileErrors.some((e) => e.code === 'invalid_template_version')) {
        toast.error(t('admin.studentImport.errors.outdatedTemplate'));
      }
      const hasFileErrors = hasStudentImportFileErrors(validation.fileErrors);
      const hasEligibleRows = hasEligibleStudentImportServerRows(validation);
      const localInvalid =
        hasFileErrors ||
        (validation.format === 'odoo_v1'
          ? validation.summary.invalidRows > 0 && !hasEligibleRows
          : validation.summary.invalidRows > 0);
      setPhase(localInvalid ? 'local_invalid' : 'local_valid');

      if (
        validation.format === 'odoo_v1' &&
        !hasFileErrors &&
        hasEligibleRows &&
        hasCapability &&
        activeSchoolId != null
      ) {
        await runServerValidation(validation, next);
      }
    } catch {
      setUploadError(t('admin.studentImport.errors.parseFailed'));
      setLocalResult(null);
      setPhase('idle');
    } finally {
      setBusy(false);
    }
  }

  async function runServerValidation(
    validationOverride?: StudentImportValidationResult,
    fileOverride?: File,
  ) {
    const validation = validationOverride ?? localResult;
    const sourceFile = fileOverride ?? file;
    const canRun =
      hasCapability &&
      !!validation &&
      !hasStudentImportFileErrors(validation.fileErrors) &&
      hasEligibleStudentImportServerRows(validation) &&
      !!sourceFile &&
      activeSchoolId != null &&
      (!busy || !!validationOverride) &&
      !execution;

    if (!canRun) return;
    setBusy(true);
    setPhase('server_validating');
    try {
      const payload = buildStudentImportValidationRequest({
        activeSchoolId,
        sourceFilename: sourceFile.name,
        rows: validation.rows,
        templateVersion: validation.templateVersion,
      });
      if (payload.rows.length === 0) {
        setPhase('local_invalid');
        return;
      }
      assertValidationPayloadKeys(payload);
      const result = await validateStudentImportJob(payload);
      if (!result.ok) {
        if (result.error.code === 'forbidden') {
          toast.error(t('admin.studentImport.server.noPermission'));
        } else if (result.error.code === 'validation_expired') {
          toast.error(t('admin.studentImport.server.validationExpired'));
        } else {
          toast.error(result.error.message);
        }
        setPhase('local_valid');
        return;
      }

      const data = result.data;
      if (!data.capabilities.can_import) {
        toast.error(t('admin.studentImport.server.noPermission'));
        setPhase('local_valid');
        return;
      }

      const merged = mergeLocalAndServerRows(validation.rows, data.rows).map((row) => ({
        ...row,
        serverErrors: row.serverErrors.map((issue) => ({
          ...issue,
          message: mapServerIssueMessage(t, issue),
        })),
        serverWarnings: row.serverWarnings.map((issue) => ({
          ...issue,
          message: mapServerIssueMessage(t, issue),
        })),
      }));

      setServerValidation({
        jobId: data.job_id,
        validationToken: data.validation_token,
        expiresAt: data.expires_at,
        summary: data.summary,
        capabilities: data.capabilities,
        rows: data.rows,
      });
      setMergedRows(merged);
      idempotencyKeyRef.current = createIdempotencyKey();
      setConfirmed(false);
      setPhase(data.summary.invalid_rows > 0 ? 'server_invalid' : 'server_valid');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadErrorReport() {
    const issues = mergedRows.length > 0 ? collectMergedIssues(mergedRows) : [];
    const pseudoResult: StudentImportValidationResult = {
      templateVersion: localResult?.templateVersion ?? null,
      fileErrors: localResult?.fileErrors ?? [],
      rows: mergedRows.length > 0 ? mergedRowsForPreview(mergedRows) : localResult?.rows ?? [],
      summary: localResult?.summary ?? {
        totalRows: 0,
        validRows: 0,
        warningRows: 0,
        invalidRows: 0,
        totalErrors: 0,
        totalWarnings: 0,
      },
      readyForImport: false,
    };

    const buffer = await buildStudentImportErrorReportWorkbook(pseudoResult, {
      rowNumber: t('admin.studentImport.report.rowNumber'),
      field: t('admin.studentImport.report.field'),
      severity: t('admin.studentImport.report.severity'),
      errorCode: t('admin.studentImport.report.errorCode'),
      message: t('admin.studentImport.report.message'),
      originalValue: t('admin.studentImport.report.originalValue'),
      status: t('admin.studentImport.report.status'),
      source: t('admin.studentImport.report.source'),
    }, issues);
    downloadArrayBuffer(buffer, 'student-import-validation-report.xlsx');
  }

  async function executeImport() {
    if (!canExecute || !serverValidation) return;
    if (validationExpired) {
      toast.error(t('admin.studentImport.server.validationExpired'));
      setPhase('server_invalid');
      return;
    }
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createIdempotencyKey();
    }

    setBusy(true);
    setPhase('executing');
    const key = idempotencyKeyRef.current;
    const jobId = serverValidation.jobId;

    try {
      const applyFromJob = (job: import('./student-import-server-types').StudentImportJob) => {
        applyExecution(job, file?.name ?? null);
      };

      let response = await executeStudentImportJob(jobId, { idempotency_key: key });
      if (!response.ok) {
        if (response.error.code === 'network_error' || response.error.code === 'duplicate_request') {
          setPhase('polling');
          const polled = await pollStudentImportJobUntilDone(jobId);
          if (!polled.ok) {
            toast.error(t('admin.studentImport.server.executeFailed'));
            setPhase('confirming');
            return;
          }
          applyFromJob(polled.data.job);
          return;
        }
        toast.error(response.error.message);
        setPhase('confirming');
        return;
      }

      if (response.data.state === 'running') {
        setPhase('polling');
        const polled = await pollStudentImportJobUntilDone(jobId);
        if (!polled.ok) {
          toast.error(t('admin.studentImport.server.executeFailed'));
          setPhase('confirming');
          return;
        }
        applyFromJob(polled.data.job);
        return;
      }

      applyFromJob({
        id: response.data.job_id,
        state: response.data.state,
        summary: response.data.summary,
        rows: response.data.rows,
        pagination: { limit: 20, offset: 0, total: response.data.rows.length },
      });
    } finally {
      setBusy(false);
    }
  }

  function applyExecution(
    job: import('./student-import-server-types').StudentImportJob,
    sourceFilename: string | null,
  ) {
    const next: StudentImportExecutionState = {
      jobId: job.id,
      state: job.state,
      summary: job.summary,
      rows: job.rows,
      pagination: job.pagination,
      sourceFilename,
    };
    setExecution(next);
    setPhase(
      job.state === 'completed'
        ? 'completed'
        : job.state === 'completed_with_errors'
          ? 'completed_with_errors'
          : 'failed',
    );
    router.refresh();
  }

  async function handleDownloadResultReport() {
    if (!execution) return;
    const buffer = await buildStudentImportResultReportWorkbook(execution, {
      filename: t('admin.studentImport.results.report.filename'),
      school: t('admin.studentImport.results.report.school'),
      date: t('admin.studentImport.results.report.date'),
      state: t('admin.studentImport.results.report.state'),
      totalRows: t('admin.studentImport.results.summary.total'),
      createdRows: t('admin.studentImport.results.summary.created'),
      failedRows: t('admin.studentImport.results.summary.failed'),
      skippedRows: t('admin.studentImport.results.summary.skipped'),
      rowNumber: t('admin.studentImport.results.report.rowNumber'),
      studentName: t('admin.fullName'),
      schoolNumber: t('admin.student360.schoolNumber'),
      massarCode: t('admin.massarCode'),
      status: t('academic.status'),
      studentId: t('admin.studentImport.results.report.studentId'),
      enrollmentId: t('admin.studentImport.results.report.enrollmentId'),
      errorCodes: t('admin.studentImport.results.report.errorCodes'),
      errorMessages: t('admin.studentImport.results.report.errorMessages'),
      warningCodes: t('admin.studentImport.results.report.warningCodes'),
      warningMessages: t('admin.studentImport.results.report.warningMessages'),
    });
    downloadArrayBuffer(buffer, `student-import-result-${execution.jobId}.xlsx`);
  }

  async function loadResultsPage(page: number) {
    if (!execution) return;
    setBusy(true);
    try {
      const result = await fetchStudentImportJob(execution.jobId, page, 20);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setResultsPage(page);
      setExecution((prev) =>
        prev
          ? {
              ...prev,
              rows: result.data.job.rows,
              pagination: result.data.job.pagination,
              summary: result.data.job.summary,
              state: result.data.job.state,
            }
          : prev,
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    hasCapability,
    activePhase,
    downloading,
    file,
    uploadError,
    localResult,
    serverValidation,
    mergedRows,
    confirmed,
    setConfirmed,
    execution,
    previewRows,
    filter,
    setFilter,
    search,
    setSearch,
    selectedRow,
    setSelectedRow,
    busy,
    validationExpired,
    canRunServerValidation,
    canConfirm,
    canShowExecute,
    canExecute,
    resultsPage,
    resetAll,
    handleDownloadTemplate,
    handleFileSelected,
    runServerValidation,
    handleDownloadErrorReport,
    executeImport,
    handleDownloadResultReport,
    loadResultsPage,
    setPhase,
  };
}

export type StudentImportRowDetailsData = StudentImportRowResult | StudentImportMergedRow | null;

export function toRowDetails(row: StudentImportRowDetailsData): StudentImportRowResult | null {
  if (!row) return null;
  if ('localErrors' in row) {
    return {
      rowNumber: row.rowNumber,
      raw: row.raw,
      normalized: row.normalized,
      errors: [...row.localErrors, ...row.serverErrors],
      warnings: [...row.localWarnings, ...row.serverWarnings],
      status: row.previewStatus,
    };
  }
  return row;
}
