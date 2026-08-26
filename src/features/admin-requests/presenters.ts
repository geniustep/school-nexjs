import type { Locale } from '@/lib/i18n/config';
import { adminRequestMessage, type AdminRequestMessageKey } from './i18n';

const STATE_KEYS: Record<string, AdminRequestMessageKey> = {
  draft: 'state.draft',
  submitted: 'state.submitted',
  under_review: 'state.underReview',
  in_review: 'state.underReview',
  waiting_requester: 'state.waitingRequester',
  wait_requester: 'state.waitingRequester',
  referred: 'state.referred',
  resolved: 'state.resolved',
  cancelled: 'state.cancelled',
  canceled: 'state.cancelled',
  rejected: 'state.rejected',
  closed: 'state.closed',
};

const REVIEW_STATE_KEYS: Record<string, AdminRequestMessageKey> = {
  pending_review: 'review.pending',
  approved: 'review.approved',
  changes_requested: 'review.changesRequested',
};

const ACTION_KEYS: Record<string, AdminRequestMessageKey> = {
  submit: 'action.submit',
  start_review: 'action.startReview',
  start_processing: 'action.startProcessing',
  refer: 'action.refer',
  wait_requester: 'action.waitRequester',
  waiting_requester: 'action.waitRequester',
  resolve: 'action.resolve',
  reject: 'action.reject',
  cancel: 'action.cancel',
  reopen: 'action.reopen',
  reply: 'action.reply',
  requester_reply: 'action.requesterReply',
  staff_reply: 'action.staffReply',
  approve_reply: 'action.approveReply',
  request_reply_changes: 'action.requestReplyChanges',
};

const ROLE_KEYS: Record<string, AdminRequestMessageKey> = {
  parent: 'role.parent',
  guardian: 'role.parent',
  student: 'role.student',
  admin: 'role.admin',
  teacher: 'role.teacher',
  staff: 'role.staff',
  employee: 'role.staff',
  requester: 'role.requester',
  system: 'role.system',
};

const TYPE_KEYS: Record<string, AdminRequestMessageKey> = {
  complaint: 'type.complaint',
  inquiry: 'type.inquiry',
  appointment: 'type.appointment',
  'appointment request': 'type.appointment',
  certificate: 'type.certificate',
  'certificate request': 'type.certificate',
  'lost and found': 'type.lostFound',
  lost_found: 'type.lostFound',
  'administrative request': 'type.adminRequest',
  'admin request': 'type.adminRequest',
};

const ERROR_KEYS: Record<string, AdminRequestMessageKey> = {
  admin_request_resolution_required: 'error.resolutionRequired',
  admin_request_forbidden: 'error.forbidden',
  admin_request_confidential_forbidden: 'error.confidentialForbidden',
  admin_request_not_found: 'error.notFound',
  admin_request_invalid_transition: 'error.invalidTransition',
  admin_request_review_required: 'error.reviewRequired',
  admin_request_stale_action: 'error.staleAction',
  admin_request_review_outcome_required: 'error.reviewOutcomeRequired',
  admin_request_review_reason_required: 'error.reviewReasonRequired',
  admin_request_reply_not_found: 'error.replyNotFound',
  admin_request_student_not_allowed: 'error.studentNotAllowed',
  admin_request_student_required: 'error.studentNotAllowed',
  admin_request_type_not_available: 'error.typeNotAvailable',
  admin_request_attachment_ids_forbidden: 'error.attachmentForbidden',
  admin_request_appointment_required: 'error.appointmentRequired',
  admin_request_appointment_missing: 'error.appointmentMissing',
  admin_request_appointment_subject_required: 'error.appointmentSubjectRequired',
  admin_request_appointment_subject_not_eligible: 'error.appointmentSubjectNotEligible',
  admin_request_appointment_identity_forbidden: 'error.appointmentIdentityForbidden',
  admin_request_appointment_target_invalid: 'error.appointmentTargetInvalid',
  admin_request_appointment_period_invalid: 'error.appointmentPeriodInvalid',
  admin_request_appointment_date_required: 'error.appointmentDateRequired',
  admin_request_appointment_schedule_required: 'error.appointmentScheduleRequired',
  admin_request_appointment_schedule_incomplete: 'error.appointmentScheduleRequired',
  admin_request_appointment_schedule_invalid: 'error.appointmentScheduleInvalid',
  admin_request_appointment_already_confirmed: 'error.appointmentAlreadyConfirmed',
  validation_error: 'error.validation',
  unauthorized: 'error.unauthorized',
};

const ERROR_MESSAGE_KEYS: Record<string, AdminRequestMessageKey> = {
  'resolution summary is required.': 'error.resolutionRequired',
  'not allowed to perform this action.': 'error.forbidden',
  'administrative request not found.': 'error.notFound',
};

function normalizedKey(value: string): string {
  return value.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
}

export function adminRequestStateLabel(state?: string | null, locale: Locale = 'ar'): string {
  if (!state?.trim()) return '—';
  return adminRequestMessage(locale, STATE_KEYS[normalizedKey(state)] ?? 'state.unknown');
}

export function adminRequestReviewStateLabel(state?: string | null, locale: Locale = 'ar'): string {
  if (!state?.trim()) return '—';
  return adminRequestMessage(locale, REVIEW_STATE_KEYS[normalizedKey(state)] ?? 'review.unknown');
}

export function adminRequestActionLabel(action?: string | null, locale: Locale = 'ar'): string {
  if (!action?.trim()) return adminRequestMessage(locale, 'action.unknown');
  return adminRequestMessage(locale, ACTION_KEYS[normalizedKey(action)] ?? 'action.unknown');
}

export function adminRequestRoleLabel(role?: string | null, locale: Locale = 'ar'): string {
  if (!role?.trim()) return '—';
  return adminRequestMessage(locale, ROLE_KEYS[normalizedKey(role)] ?? 'role.unknown');
}

export function adminRequestTypeLabel(name?: string | null, locale: Locale = 'ar'): string {
  const value = name?.trim();
  if (!value) return '—';

  // Seed/QA markers are operational metadata and must never leak into family/admin UI.
  const qaMatch = value.match(/^QA\s+(Complaint|Inquiry|Appointment)(?:\s+.+)?$/i);
  if (qaMatch) {
    const key = TYPE_KEYS[qaMatch[1].toLowerCase()];
    return key ? adminRequestMessage(locale, key) : qaMatch[1];
  }

  const key = TYPE_KEYS[value.toLowerCase()];
  return key ? adminRequestMessage(locale, key) : value;
}

export function adminRequestErrorLabel(
  error?: { code?: string | null; message?: string | null } | null,
  locale: Locale = 'ar',
): string {
  const code = error?.code?.trim();
  if (code && ERROR_KEYS[code]) return adminRequestMessage(locale, ERROR_KEYS[code]);

  const message = error?.message?.trim();
  if (!message) return adminRequestMessage(locale, 'error.generic');
  const messageKey = ERROR_MESSAGE_KEYS[message.toLowerCase()];
  if (messageKey) return adminRequestMessage(locale, messageKey);

  // Arabic backend text may be shown only while the UI itself is Arabic.
  if (locale === 'ar' && /\p{Script=Arabic}/u.test(message)) return message;
  return adminRequestMessage(locale, 'error.genericCheckData');
}

export function adminRequestPriorityLabel(value?: string | null, locale: Locale = 'ar'): string {
  if (value === 'urgent') return adminRequestMessage(locale, 'priority.urgent');
  if (value === 'important') return adminRequestMessage(locale, 'priority.important');
  return adminRequestMessage(locale, 'priority.normal');
}

export interface AdminRequestStaffOption {
  id: number;
  name: string;
  detail?: string;
}

function numberFrom(value: unknown): number | null {
  if (Array.isArray(value)) return numberFrom(value[0]);
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return parsed > 0 ? parsed : null;
  }
  if (value && typeof value === 'object' && 'id' in value) {
    return numberFrom((value as { id?: unknown }).id);
  }
  return null;
}

function textFrom(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[1] === 'string' && value[1].trim()) return value[1].trim();
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['name', 'display_name', 'full_name', 'label']) {
      const text = textFrom(record[key]);
      if (text) return text;
    }
  }
  return null;
}

function rawStaffRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  for (const key of ['items', 'staff', 'employees', 'options', 'staff_options', 'results']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  if (record.data && typeof record.data === 'object') return rawStaffRows(record.data);
  return [];
}

/** Normalize the existing /admin/staff/options response without changing its server contract. */
export function staffOptionRows(value: unknown): AdminRequestStaffOption[] {
  return rawStaffRows(value).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const id =
      numberFrom(record.user_id) ??
      numberFrom(record.value) ??
      numberFrom(record.user) ??
      numberFrom(record.id) ??
      numberFrom(record.staff_id);
    const name =
      textFrom(record.name) ??
      textFrom(record.display_name) ??
      textFrom(record.full_name) ??
      textFrom(record.label) ??
      textFrom(record.employee_name) ??
      textFrom(record.user_name) ??
      textFrom(record.user) ??
      textFrom(record.user_id);
    if (!id || !name) return [];

    const detail =
      textFrom(record.job_title) ??
      textFrom(record.position) ??
      textFrom(record.role_name) ??
      textFrom(record.function);

    return [{ id, name, ...(detail ? { detail } : {}) }];
  });
}
