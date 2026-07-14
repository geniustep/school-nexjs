import type { ApiErrorBody } from '@/types/api';

export function mapAdmissionActionError(error: unknown): string {
  const value = error as ApiErrorBody & {
    status?: number;
    blocking_reasons?: Array<{ message?: string; code?: string }>;
    details?: {
      status?: number;
      blocking_reasons?: Array<{ message?: string; code?: string }>;
      code?: string;
    };
  };

  const blocking =
    value?.blocking_reasons ??
    value?.details?.blocking_reasons ??
    (Array.isArray((value?.details as { blocking_reasons?: unknown } | undefined)?.blocking_reasons)
      ? (value.details as { blocking_reasons: Array<{ message?: string }> }).blocking_reasons
      : null);
  if (Array.isArray(blocking) && blocking.length) {
    const messages = blocking.map((reason) => reason.message).filter(Boolean);
    if (messages.length) return messages.join(', ');
  }

  const code = value?.code ?? value?.details?.code;
  if (code === 'FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION') {
    return 'admin.admissions.actionErrors.FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION';
  }
  if (code === 'not_ready_for_registration') {
    return 'admin.admissions.actionErrors.not_ready_for_registration';
  }
  if (code === 'invalid_action') return 'admin.admissions.actionErrors.invalid_action';
  if (code === 'conflict' || value?.status === 409 || value?.details?.status === 409) {
    return 'admin.admissions.actionErrors.conflict';
  }

  if (typeof value?.message === 'string' && value.message.trim()) {
    if (value.message.includes('FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION')) {
      return 'admin.admissions.actionErrors.FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION';
    }
    if (value.message.includes('not_ready_for_registration')) {
      return 'admin.admissions.actionErrors.not_ready_for_registration';
    }
    return value.message;
  }

  return 'admin.admissions.actionErrors.invalid_action';
}
