import type { ApiErrorBody } from '@/types/api';

function normalizeMessage(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/^\.+/, '');
}

/** Backend may return `.note is required to close` / `note is required to close`. */
export function isCloseNoteRequiredMessage(message: string): boolean {
  const normalized = normalizeMessage(message);
  if (!normalized) return false;
  return (
    normalized.includes('note is required to close') ||
    (normalized.includes('note is required') && normalized.includes('close')) ||
    (normalized.includes('note') &&
      normalized.includes('required') &&
      normalized.includes('close'))
  );
}

function isTechnicalFieldPathMessage(message: string): boolean {
  const trimmed = message.trim();
  if (isCloseNoteRequiredMessage(trimmed)) return true;
  if (/\.note\b/i.test(trimmed)) return true;
  if (/required to close/i.test(trimmed)) return true;
  // Dotted / snake_case machine codes (no spaces) — not human permission phrases.
  if (/^[a-z][a-z0-9_.]+$/i.test(trimmed)) return true;
  return false;
}

function collectMessages(error: ApiErrorBody & {
  status?: number;
  blocking_reasons?: Array<{ message?: string; code?: string }>;
  details?: {
    status?: number;
    blocking_reasons?: Array<{ message?: string; code?: string }>;
    code?: string;
    message?: string;
  };
}): string[] {
  const out: string[] = [];
  if (typeof error?.message === 'string' && error.message.trim()) out.push(error.message);
  if (typeof error?.details?.message === 'string' && error.details.message.trim()) {
    out.push(error.details.message);
  }
  const blocking =
    error?.blocking_reasons ??
    error?.details?.blocking_reasons ??
    null;
  if (Array.isArray(blocking)) {
    for (const reason of blocking) {
      if (reason?.message?.trim()) out.push(reason.message);
      if (reason?.code?.trim()) out.push(reason.code);
    }
  }
  return out;
}

export function mapAdmissionActionError(error: unknown): string {
  const value = error as ApiErrorBody & {
    status?: number;
    blocking_reasons?: Array<{ message?: string; code?: string }>;
    details?: {
      status?: number;
      blocking_reasons?: Array<{ message?: string; code?: string }>;
      code?: string;
      message?: string;
    };
  };

  const status = value?.status ?? value?.details?.status;
  const code = String(value?.code ?? value?.details?.code ?? '').trim();
  const codeLower = code.toLowerCase();
  const messages = collectMessages(value);

  if (
    messages.some(isCloseNoteRequiredMessage) ||
    codeLower === 'note_required' ||
    codeLower === 'close_note_required'
  ) {
    return 'admin.admissions.closeDialog.noteRequired';
  }

  const mentionsClose = messages.some((m) => /close|إغلاق/i.test(m)) || /close/i.test(codeLower);

  if (
    mentionsClose &&
    (status === 403 ||
      codeLower === 'forbidden' ||
      codeLower === 'permission_denied' ||
      messages.some((m) => /permission denied|forbidden/i.test(m)))
  ) {
    return 'admin.admissions.closeDialog.permissionDenied';
  }

  if (
    mentionsClose &&
    (status === 404 ||
      codeLower === 'not_found' ||
      messages.some((m) => /application not found|not found/i.test(m)))
  ) {
    return 'admin.admissions.closeDialog.notFound';
  }

  if (
    mentionsClose &&
    (codeLower === 'invalid_state' ||
      messages.some((m) => /invalid state|cannot close/i.test(m)))
  ) {
    return 'admin.admissions.closeDialog.invalidState';
  }

  if (
    mentionsClose &&
    (codeLower === 'network_error' ||
      codeLower === 'failed_to_fetch' ||
      messages.some((m) => /network|failed to fetch|offline/i.test(m)))
  ) {
    return 'admin.admissions.closeDialog.networkError';
  }

  const blocking =
    value?.blocking_reasons ??
    value?.details?.blocking_reasons ??
    (Array.isArray((value?.details as { blocking_reasons?: unknown } | undefined)?.blocking_reasons)
      ? (value.details as { blocking_reasons: Array<{ message?: string }> }).blocking_reasons
      : null);
  if (Array.isArray(blocking) && blocking.length) {
    const blockingMessages = blocking
      .map((reason) => reason.message)
      .filter((msg): msg is string => Boolean(msg?.trim()));
    if (blockingMessages.some(isCloseNoteRequiredMessage)) {
      return 'admin.admissions.closeDialog.noteRequired';
    }
    const safe = blockingMessages.filter((msg) => !isTechnicalFieldPathMessage(msg));
    if (safe.length) return safe.join(', ');
    if (blockingMessages.length) {
      return 'admin.admissions.closeDialog.unknownError';
    }
  }

  if (code === 'FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION') {
    return 'admin.admissions.actionErrors.FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION';
  }
  if (code === 'not_ready_for_registration') {
    return 'admin.admissions.actionErrors.not_ready_for_registration';
  }
  if (code === 'invalid_action') return 'admin.admissions.actionErrors.invalid_action';
  if (code === 'conflict' || codeLower === 'conflict' || status === 409) {
    return 'admin.admissions.actionErrors.conflict';
  }

  if (typeof value?.message === 'string' && value.message.trim()) {
    if (isCloseNoteRequiredMessage(value.message)) {
      return 'admin.admissions.closeDialog.noteRequired';
    }
    if (value.message.includes('FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION')) {
      return 'admin.admissions.actionErrors.FAMILY_APPROVAL_REQUIRES_ACCEPTED_DECISION';
    }
    if (value.message.includes('not_ready_for_registration')) {
      return 'admin.admissions.actionErrors.not_ready_for_registration';
    }
    if (isTechnicalFieldPathMessage(value.message)) {
      return 'admin.admissions.closeDialog.unknownError';
    }
    return value.message;
  }

  if (mentionsClose && (status === 403 || status === 404 || status === 0)) {
    if (status === 403) return 'admin.admissions.closeDialog.permissionDenied';
    if (status === 404) return 'admin.admissions.closeDialog.notFound';
    return 'admin.admissions.closeDialog.networkError';
  }

  return 'admin.admissions.actionErrors.invalid_action';
}

export function mapAdmissionCloseActionError(error: unknown): string {
  const value = error as ApiErrorBody & {
    status?: number;
    details?: { status?: number; code?: string; message?: string };
  };
  const status = value?.status ?? value?.details?.status;
  const codeLower = String(value?.code ?? value?.details?.code ?? '').trim().toLowerCase();
  const message = String(value?.message ?? value?.details?.message ?? '');

  if (isCloseNoteRequiredMessage(message)) {
    return 'admin.admissions.closeDialog.noteRequired';
  }
  if (
    status === 403 ||
    codeLower === 'forbidden' ||
    codeLower === 'permission_denied' ||
    /permission denied|forbidden/i.test(message)
  ) {
    return 'admin.admissions.closeDialog.permissionDenied';
  }
  if (status === 404 || codeLower === 'not_found' || /application not found|not found/i.test(message)) {
    return 'admin.admissions.closeDialog.notFound';
  }
  if (codeLower === 'invalid_state' || /invalid state|cannot close/i.test(message)) {
    return 'admin.admissions.closeDialog.invalidState';
  }
  if (
    codeLower === 'network_error' ||
    codeLower === 'failed_to_fetch' ||
    /network|failed to fetch|offline/i.test(message)
  ) {
    return 'admin.admissions.closeDialog.networkError';
  }

  const mapped = mapAdmissionActionError(error);
  if (mapped === 'admin.admissions.closeDialog.noteRequired') return mapped;
  if (mapped.startsWith('admin.admissions.closeDialog.')) return mapped;
  if (
    mapped.startsWith('admin.') &&
    (mapped.includes('FAMILY_APPROVAL') ||
      mapped.includes('not_ready') ||
      mapped.includes('conflict'))
  ) {
    return mapped;
  }
  return 'admin.admissions.closeDialog.unknownError';
}

export function isReturnToStatusNoteRequiredMessage(message: string): boolean {
  const normalized = normalizeMessage(message);
  if (!normalized) return false;
  return (
    (normalized.includes('note') &&
      normalized.includes('required') &&
      (normalized.includes('return') || normalized.includes('return_to_status'))) ||
    normalized.includes('note is required') ||
    normalized.includes('reason is required') ||
    normalized.includes('return reason')
  );
}

export function mapAdmissionReturnToStatusActionError(error: unknown): string {
  const mapped = mapAdmissionChangeStatusActionError(error);
  return mapped.replace(
    'admin.admissions.changeStatusDialog.',
    'admin.admissions.returnToStatusDialog.',
  );
}

export function mapAdmissionChangeStatusActionError(error: unknown): string {
  const value = error as ApiErrorBody & {
    status?: number;
    details?: { status?: number; code?: string; message?: string };
  };
  const status = value?.status ?? value?.details?.status;
  const codeLower = String(value?.code ?? value?.details?.code ?? '').trim().toLowerCase();
  const message = String(value?.message ?? value?.details?.message ?? '');
  const messageLower = message.toLowerCase();

  if (isReturnToStatusNoteRequiredMessage(message)) {
    return 'admin.admissions.changeStatusDialog.noteRequired';
  }
  if (
    /family.?approval|confirm_family_approval/i.test(messageLower) ||
    codeLower.includes('family_approval')
  ) {
    return 'admin.admissions.changeStatusDialog.familyApprovalRequired';
  }
  if (
    codeLower.includes('target') ||
    /target[_ ]?status|not allowed|invalid target|disallowed target/i.test(message)
  ) {
    return 'admin.admissions.changeStatusDialog.targetNotAllowed';
  }
  if (
    codeLower.includes('registered') ||
    /already registered|cannot (return|change).*registered|status is registered/i.test(
      messageLower,
    )
  ) {
    return 'admin.admissions.changeStatusDialog.registeredBlocked';
  }
  if (
    status === 409 ||
    codeLower === 'conflict' ||
    codeLower === 'stale_state' ||
    /updated elsewhere|stale|conflict|changed by another/i.test(messageLower)
  ) {
    return 'admin.admissions.changeStatusDialog.conflict';
  }
  if (
    status === 403 ||
    codeLower === 'forbidden' ||
    codeLower === 'permission_denied' ||
    /permission denied|forbidden/i.test(message)
  ) {
    return 'admin.admissions.changeStatusDialog.permissionDenied';
  }
  if (status === 404 || codeLower === 'not_found' || /application not found|not found/i.test(message)) {
    return 'admin.admissions.changeStatusDialog.notFound';
  }
  if (
    codeLower === 'invalid_state' ||
    /invalid state|cannot (return|change)/i.test(messageLower)
  ) {
    return 'admin.admissions.changeStatusDialog.invalidState';
  }
  if (
    codeLower === 'network_error' ||
    codeLower === 'failed_to_fetch' ||
    /network|failed to fetch|offline/i.test(message)
  ) {
    return 'admin.admissions.changeStatusDialog.networkError';
  }

  const mapped = mapAdmissionActionError(error);
  if (mapped === 'admin.admissions.actionErrors.conflict') {
    return 'admin.admissions.changeStatusDialog.conflict';
  }
  if (mapped.startsWith('admin.admissions.changeStatusDialog.')) return mapped;
  if (typeof value?.message === 'string' && value.message.trim() && !isTechnicalFieldPathMessage(value.message)) {
    return value.message;
  }
  return 'admin.admissions.changeStatusDialog.unknownError';
}
