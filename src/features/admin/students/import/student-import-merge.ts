import type { StudentImportRowResult } from './student-import-types';
import type { StudentImportMergedRow, StudentImportServerRow } from './student-import-server-types';

function mapServerStatus(status: string | null | undefined): StudentImportMergedRow['serverStatus'] {
  if (status === 'valid' || status === 'warning') return status;
  if (status === 'invalid' || status === 'failed') return 'invalid';
  return null;
}

function previewStatus(row: StudentImportMergedRow): StudentImportMergedRow['previewStatus'] {
  const hasErrors = row.localErrors.length > 0 || row.serverErrors.length > 0;
  if (hasErrors) return 'invalid';
  if (row.localWarnings.length > 0 || row.serverWarnings.length > 0) return 'warning';
  return 'valid';
}

export function mergeLocalAndServerRows(
  localRows: StudentImportRowResult[],
  serverRows: StudentImportServerRow[],
): StudentImportMergedRow[] {
  const serverByRow = new Map(serverRows.map((row) => [row.row_number, row]));

  return localRows.map((local) => {
    const server = serverByRow.get(local.rowNumber);
    const serverErrors = server?.errors ?? [];
    const serverWarnings = server?.warnings ?? [];
    const serverStatus = server ? mapServerStatus(server.status) : null;
    const merged: StudentImportMergedRow = {
      rowNumber: local.rowNumber,
      raw: local.raw,
      normalized: local.normalized,
      localErrors: local.errors,
      localWarnings: local.warnings,
      serverErrors,
      serverWarnings,
      serverStatus,
      previewStatus: 'valid',
      executable: false,
      resultStatus: server?.status ?? null,
      studentId: server?.student_id ?? null,
      enrollmentId: server?.enrollment_id ?? null,
      displayName: server?.display_name ?? null,
    };
    merged.previewStatus = previewStatus(merged);
    merged.executable =
      merged.localErrors.length === 0 &&
      merged.serverErrors.length === 0 &&
      serverStatus === 'valid';
    return merged;
  });
}

export function mergedRowsForPreview(rows: StudentImportMergedRow[]): StudentImportRowResult[] {
  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    raw: row.raw,
    normalized: row.normalized,
    errors: [...row.localErrors, ...row.serverErrors],
    warnings: [...row.localWarnings, ...row.serverWarnings],
    status: row.previewStatus,
  }));
}

export function collectMergedIssues(rows: StudentImportMergedRow[]): Array<{
  rowNumber: number;
  field?: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
  source: 'local' | 'server';
  originalValue?: string;
}> {
  const out: Array<{
    rowNumber: number;
    field?: string;
    severity: 'error' | 'warning';
    code: string;
    message: string;
    source: 'local' | 'server';
    originalValue?: string;
  }> = [];

  for (const row of rows) {
    for (const issue of row.localErrors) {
      out.push({
        rowNumber: row.rowNumber,
        field: issue.field,
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        source: 'local',
        originalValue: issue.field ? String(row.raw[issue.field] ?? '') : undefined,
      });
    }
    for (const issue of row.localWarnings) {
      out.push({
        rowNumber: row.rowNumber,
        field: issue.field,
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        source: 'local',
        originalValue: issue.field ? String(row.raw[issue.field] ?? '') : undefined,
      });
    }
    for (const issue of row.serverErrors) {
      out.push({
        rowNumber: row.rowNumber,
        field: issue.field,
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        source: 'server',
        originalValue: issue.field ? String(row.raw[issue.field] ?? '') : undefined,
      });
    }
    for (const issue of row.serverWarnings) {
      out.push({
        rowNumber: row.rowNumber,
        field: issue.field,
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        source: 'server',
        originalValue: issue.field ? String(row.raw[issue.field] ?? '') : undefined,
      });
    }
  }

  return out;
}
