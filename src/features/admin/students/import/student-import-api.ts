import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import {
  normalizeImportExecuteResponse,
  normalizeImportJobResponse,
  normalizeImportValidationResponse,
  StudentImportContractError,
} from './student-import-server-normalize';
import type {
  StudentImportExecuteRequest,
  StudentImportExecuteResponse,
  StudentImportJobResponse,
  StudentImportValidationRequest,
  StudentImportValidationResponse,
} from './student-import-server-types';

export type StudentImportApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorBody };

function mapContractError(error: unknown): ApiErrorBody {
  if (error instanceof StudentImportContractError) {
    return { code: 'validation_error', message: error.message, details: {} };
  }
  return { code: 'server_error', message: 'Unexpected import response.', details: {} };
}

export async function validateStudentImportJob(
  payload: StudentImportValidationRequest,
): Promise<StudentImportApiResult<StudentImportValidationResponse>> {
  const res = await api.post<unknown>(endpoints.admin.studentImportValidate, payload);
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  if (!res.data) {
    return { ok: false, error: { code: 'server_error', message: 'Empty validation response.', details: {} } };
  }
  try {
    return { ok: true, data: normalizeImportValidationResponse(res.data) };
  } catch (error) {
    return { ok: false, error: mapContractError(error) };
  }
}

export async function executeStudentImportJob(
  jobId: number,
  payload: StudentImportExecuteRequest,
): Promise<StudentImportApiResult<StudentImportExecuteResponse>> {
  const res = await api.post<unknown>(endpoints.admin.studentImportExecute(jobId), payload);
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  if (!res.data) {
    return { ok: false, error: { code: 'server_error', message: 'Empty execute response.', details: {} } };
  }
  try {
    return { ok: true, data: normalizeImportExecuteResponse(res.data) };
  } catch (error) {
    return { ok: false, error: mapContractError(error) };
  }
}

export async function fetchStudentImportJob(
  jobId: number,
  page = 1,
  limit = 20,
): Promise<StudentImportApiResult<StudentImportJobResponse>> {
  const offset = (page - 1) * limit;
  const res = await api.get<unknown>(endpoints.admin.studentImportJob(jobId), {
    page,
    limit,
    offset,
  });
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  if (!res.data) {
    return { ok: false, error: { code: 'server_error', message: 'Empty job response.', details: {} } };
  }
  try {
    return { ok: true, data: normalizeImportJobResponse(res.data) };
  } catch (error) {
    return { ok: false, error: mapContractError(error) };
  }
}

export async function pollStudentImportJobUntilDone(
  jobId: number,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<StudentImportApiResult<StudentImportJobResponse>> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 60000;
  const started = Date.now();

  while (Date.now() - started <= timeoutMs) {
    const result = await fetchStudentImportJob(jobId, 1, 20);
    if (!result.ok) return result;
    const state = result.data.job.state;
    if (state !== 'running' && state !== 'validated') {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return {
    ok: false,
    error: {
      code: 'import_failed',
      message: 'Import job polling timed out.',
      details: {},
    },
  };
}
