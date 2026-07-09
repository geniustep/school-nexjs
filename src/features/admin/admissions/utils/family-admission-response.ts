import type { ApiMeta, ApiResponse } from '@/types/api';
import type { FamilyBatchCreateResponse } from '@/types/admission';
import { normalizeFamilyBatchCreateData } from './family-admission-normalize';

export type FamilyBatchSubmitOutcome =
  | {
      kind: 'success';
      replay: boolean;
      data: FamilyBatchCreateResponse;
    }
  | {
      kind: 'idempotency_conflict';
    }
  | {
      kind: 'error';
      code: string;
      message?: string;
    };

export function isFamilyBatchReplay(
  data: FamilyBatchCreateResponse | null | undefined,
  meta?: ApiMeta,
  httpStatus?: number,
): boolean {
  if (data?.replay === true || data?.idempotent_replay === true) return true;
  if (meta?.idempotent_replay === true || meta?.replay === true) return true;
  if (typeof meta?.http_status === 'number' && meta.http_status === 200) return true;
  if (httpStatus === 200) return true;
  return false;
}

export function normalizeFamilyBatchCreateResponse(
  response: ApiResponse<FamilyBatchCreateResponse>,
  httpStatus?: number,
): FamilyBatchSubmitOutcome {
  if (response.success && response.data) {
    return {
      kind: 'success',
      replay: isFamilyBatchReplay(response.data, response.meta, httpStatus),
      data: normalizeFamilyBatchCreateData(response.data),
    };
  }

  if (!response.success) {
    const code = response.error.code ?? 'server_error';
    if (code === 'family_batch_idempotency_conflict') {
      return { kind: 'idempotency_conflict' };
    }

    return {
      kind: 'error',
      code,
      message: response.error.message,
    };
  }

  return { kind: 'error', code: 'server_error' };
}
