import type {
  StudentImportExecuteResponse,
  StudentImportJob,
  StudentImportJobResponse,
  StudentImportJobSummary,
  StudentImportServerIssue,
  StudentImportServerRow,
  StudentImportValidationResponse,
} from './student-import-server-types';

export class StudentImportContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentImportContractError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asNumber(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  throw new StudentImportContractError(`Invalid ${field}`);
}

function asOptionalString(value: unknown): string | null {
  if (value == null || value === false) return null;
  if (typeof value === 'string') return value;
  return String(value);
}

function normalizeIssue(raw: unknown, source: StudentImportServerIssue['source']): StudentImportServerIssue | null {
  if (!isObject(raw)) return null;
  const code = typeof raw.code === 'string' ? raw.code : '';
  if (!code) return null;
  const severityRaw = raw.severity;
  const severity: StudentImportServerIssue['severity'] =
    severityRaw === 'warning' || code === 'student_already_exists' ? 'warning' : 'error';
  return {
    code,
    field: typeof raw.field === 'string' ? raw.field : undefined,
    message: typeof raw.message === 'string' ? raw.message : code,
    severity,
    source,
  };
}

function normalizeIssues(value: unknown, source: StudentImportServerIssue['source']): StudentImportServerIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeIssue(item, source))
    .filter((item): item is StudentImportServerIssue => item != null);
}

function normalizeSummary(raw: unknown): StudentImportJobSummary {
  if (!isObject(raw)) throw new StudentImportContractError('Missing summary');
  return {
    total_rows: asNumber(raw.total_rows ?? 0, 'summary.total_rows'),
    valid_rows: asNumber(raw.valid_rows ?? 0, 'summary.valid_rows'),
    warning_rows: asNumber(raw.warning_rows ?? 0, 'summary.warning_rows'),
    invalid_rows: asNumber(raw.invalid_rows ?? 0, 'summary.invalid_rows'),
    created_rows: raw.created_rows != null ? asNumber(raw.created_rows, 'summary.created_rows') : undefined,
    failed_rows: raw.failed_rows != null ? asNumber(raw.failed_rows, 'summary.failed_rows') : undefined,
    skipped_rows: raw.skipped_rows != null ? asNumber(raw.skipped_rows, 'summary.skipped_rows') : undefined,
  };
}

export function normalizeImportServerRow(raw: unknown): StudentImportServerRow {
  if (!isObject(raw)) throw new StudentImportContractError('Invalid row');
  const rowNumber = asNumber(raw.row_number, 'row_number');
  const status = typeof raw.status === 'string' ? raw.status : 'invalid';
  return {
    row_number: rowNumber,
    status,
    normalized: isObject(raw.normalized) ? raw.normalized : undefined,
    errors: normalizeIssues(raw.errors, 'server'),
    warnings: normalizeIssues(raw.warnings, 'server'),
    student_id: raw.student_id != null ? asNumber(raw.student_id, 'student_id') : null,
    enrollment_id: raw.enrollment_id != null ? asNumber(raw.enrollment_id, 'enrollment_id') : null,
    school_number: asOptionalString(raw.school_number),
    massar_code: asOptionalString(raw.massar_code),
    display_name: asOptionalString(raw.display_name),
  };
}

export function normalizeImportServerIssues(rows: StudentImportServerRow[]): StudentImportServerIssue[] {
  const out: StudentImportServerIssue[] = [];
  for (const row of rows) {
    out.push(...row.errors, ...row.warnings);
  }
  return out;
}

export function normalizeImportValidationResponse(raw: unknown): StudentImportValidationResponse {
  if (!isObject(raw)) throw new StudentImportContractError('Invalid validation response');
  const jobId = asNumber(raw.job_id, 'job_id');
  const tokenRaw = raw.validation_token ?? jobId;
  const token =
    typeof tokenRaw === 'string' || typeof tokenRaw === 'number' ? tokenRaw : jobId;
  const expiresAt = typeof raw.expires_at === 'string' ? raw.expires_at : '';
  if (!expiresAt) throw new StudentImportContractError('Missing expires_at');
  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
  const capabilities = isObject(raw.capabilities) ? raw.capabilities : {};
  return {
    job_id: jobId,
    validation_token: token,
    expires_at: expiresAt,
    summary: normalizeSummary(raw.summary),
    rows: rowsRaw.map(normalizeImportServerRow),
    capabilities: { can_import: capabilities.can_import === true },
  };
}

export function normalizeImportExecuteResponse(raw: unknown): StudentImportExecuteResponse {
  if (!isObject(raw)) throw new StudentImportContractError('Invalid execute response');
  const state = typeof raw.state === 'string' ? raw.state : 'failed';
  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
  return {
    job_id: asNumber(raw.job_id, 'job_id'),
    state: state as StudentImportExecuteResponse['state'],
    summary: normalizeSummary(raw.summary),
    rows: rowsRaw.map(normalizeImportServerRow),
  };
}

export function normalizeImportJobResponse(raw: unknown): StudentImportJobResponse {
  if (!isObject(raw)) throw new StudentImportContractError('Invalid job response');
  const jobObj = raw;
  const paginationRaw = isObject(jobObj.pagination) ? jobObj.pagination : {};
  const rowsRaw = Array.isArray(jobObj.rows) ? jobObj.rows : [];
  const limit = asNumber(paginationRaw.limit ?? 20, 'limit');
  const offset = asNumber(paginationRaw.offset ?? 0, 'offset');
  const job: StudentImportJob = {
    id: asNumber(jobObj.id ?? jobObj.job_id, 'job id'),
    state: typeof jobObj.state === 'string' ? (jobObj.state as StudentImportJob['state']) : 'failed',
    summary: normalizeSummary(jobObj.summary),
    rows: rowsRaw.map(normalizeImportServerRow),
    pagination: {
      page: Math.floor(offset / limit) + 1,
      limit,
      offset,
      total: asNumber(paginationRaw.total ?? rowsRaw.length, 'total'),
    },
    expires_at: typeof jobObj.expires_at === 'string' ? jobObj.expires_at : null,
    source_filename: typeof jobObj.source_filename === 'string' ? jobObj.source_filename : null,
    template_version: typeof jobObj.template_version === 'number' ? jobObj.template_version : null,
    idempotency_key: typeof jobObj.idempotency_key === 'string' ? jobObj.idempotency_key : null,
    started_at: typeof jobObj.started_at === 'string' ? jobObj.started_at : null,
    completed_at: typeof jobObj.completed_at === 'string' ? jobObj.completed_at : null,
    capabilities: isObject(jobObj.capabilities)
      ? { can_view: jobObj.capabilities.can_view === true }
      : undefined,
  };

  return { job };
}

export function mapServerIssueMessage(
  t: (key: string, params?: Record<string, string | number>) => string,
  issue: StudentImportServerIssue,
): string {
  const key = `admin.studentImport.serverIssueCodes.${issue.code}`;
  const translated = t(key, { field: issue.field ?? '' });
  return translated === key ? issue.message : translated;
}
