import type { ApiErrorBody } from '@/types/api';
import {
  BILLING_RESPONSIBILITY_STABLE_ERROR_CODES,
  type BillingResponsibilityStableErrorCode,
} from '@/types/billing-responsibility';
import type { BillingResponsibilityFieldErrors } from './student-create-billing-responsibility';

export interface BillingResponsibilityApiErrorContext {
  message: string;
  fieldErrors?: BillingResponsibilityFieldErrors;
  stayOnGuardianStep?: boolean;
}

const ERROR_MESSAGE_KEYS: Record<BillingResponsibilityStableErrorCode, string> = {
  billing_responsibility_contract_conflict:
    'admin.student360.create.billingResponsibility.errors.contractConflict',
  billing_responsibility_required:
    'admin.student360.financeWorkspace.billingResponsibility.errors.required',
  student_billing_confirmation_required:
    'admin.student360.create.billingResponsibility.errors.confirmationRequired',
  student_billing_reason_required:
    'admin.student360.create.billingResponsibility.errors.reasonRequired',
  student_billing_scope_mismatch:
    'admin.student360.financeWorkspace.billingResponsibility.errors.scopeMismatch',
  billing_responsibility_unresolved:
    'admin.student360.financeWorkspace.billingResponsibility.unresolved.message',
  billing_responsibility_existing_agreement_conflict:
    'admin.student360.create.billingResponsibility.errors.existingAgreementConflict',
  invalid_billing_responsibility:
    'admin.student360.create.billingResponsibility.errors.invalid',
  invalid_billing_responsibility_mode:
    'admin.student360.create.billingResponsibility.errors.invalidMode',
  billing_guardian_required:
    'admin.student360.create.billingResponsibility.errors.guardianRequired',
  billing_guardian_ambiguous:
    'admin.student360.create.billingResponsibility.errors.billingGuardianSelectionRequired',
  billing_guardian_not_linked:
    'admin.student360.create.billingResponsibility.errors.billingGuardianNotLinked',
  billing_guardian_relationship_inactive:
    'admin.student360.create.billingResponsibility.errors.billingGuardianRelationshipInactive',
};

const GUARDIAN_ATOMIC_ERROR_MESSAGE_KEYS = {
  guardian_identity_candidate_exists:
    'admin.student360.create.billingResponsibility.errors.guardianIdentityCandidateExists',
  guardian_identity_conflict:
    'admin.student360.create.billingResponsibility.errors.guardianIdentityCandidateExists',
  guardian_identity_mismatch:
    'admin.student360.create.billingResponsibility.errors.guardianIdentityCandidateExists',
  identity_document_conflict:
    'admin.student360.create.billingResponsibility.errors.guardianIdentityCandidateExists',
  guardian_login_conflict:
    'admin.student360.create.billingResponsibility.errors.guardianLoginConflict',
} as const;

export function isBillingResponsibilityStableErrorCode(
  code: string,
): code is BillingResponsibilityStableErrorCode {
  return (BILLING_RESPONSIBILITY_STABLE_ERROR_CODES as readonly string[]).includes(code);
}

export function resolveBillingResponsibilityErrorMessageKey(code: string): string | null {
  if (!isBillingResponsibilityStableErrorCode(code)) return null;
  return ERROR_MESSAGE_KEYS[code];
}

export function resolveBillingResponsibilityErrorMessage(
  code: string | undefined,
  t: (key: string) => string,
  fallbackMessage?: string,
): string {
  const key = code ? resolveBillingResponsibilityErrorMessageKey(code) : null;
  if (key) {
    const label = t(key);
    if (label !== key) return label;
  }
  if (fallbackMessage?.trim()) return fallbackMessage.trim();
  return t('admin.student360.create.billingResponsibility.errors.generic');
}

export function mapBillingResponsibilityApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): BillingResponsibilityApiErrorContext | null {
  const code = String(error.code ?? '');
  if (!isBillingResponsibilityStableErrorCode(code)) return null;

  const message = resolveBillingResponsibilityErrorMessage(code, t, error.message);
  const fieldErrors: BillingResponsibilityFieldErrors = {};

  if (code === 'student_billing_confirmation_required') {
    fieldErrors.billingStudentConfirmed = message;
  }
  if (code === 'student_billing_reason_required') {
    fieldErrors.billingStudentReason = message;
  }
  if (code === 'billing_responsibility_required') {
    fieldErrors.billingResponsibilitySelection = message;
  }
  if (
    code === 'invalid_billing_responsibility' ||
    code === 'invalid_billing_responsibility_mode' ||
    code === 'billing_responsibility_contract_conflict' ||
    code === 'student_billing_scope_mismatch'
  ) {
    fieldErrors.billingResponsibilitySelection = message;
  }
  if (
    code === 'billing_guardian_required' ||
    code === 'billing_guardian_not_linked' ||
    code === 'billing_guardian_relationship_inactive'
  ) {
    fieldErrors.guardianRequired = message;
  }
  if (code === 'billing_guardian_ambiguous') {
    fieldErrors.billingGuardianSelection = message;
  }

  return {
    message,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}

export function mapStudentCreateGuardianAtomicApiError(
  error: ApiErrorBody,
  t: (key: string) => string,
): BillingResponsibilityApiErrorContext | null {
  const code = String(error.code ?? '');
  const key =
    GUARDIAN_ATOMIC_ERROR_MESSAGE_KEYS[
      code as keyof typeof GUARDIAN_ATOMIC_ERROR_MESSAGE_KEYS
    ];
  if (!key) return null;

  const label = t(key);
  const message = label !== key ? label : error.message?.trim() || t('admin.student360.create.billingResponsibility.errors.generic');
  const fieldErrors: BillingResponsibilityFieldErrors = {};

  if (
    code === 'guardian_identity_candidate_exists' ||
    code === 'guardian_identity_conflict' ||
    code === 'guardian_identity_mismatch' ||
    code === 'identity_document_conflict' ||
    code === 'guardian_login_conflict'
  ) {
    fieldErrors.guardianRequired = message;
  }

  return {
    message,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    stayOnGuardianStep: true,
  };
}
