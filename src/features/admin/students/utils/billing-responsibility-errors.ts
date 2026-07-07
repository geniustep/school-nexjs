import type { ApiErrorBody } from '@/types/api';
import {
  BILLING_RESPONSIBILITY_STABLE_ERROR_CODES,
  type BillingResponsibilityStableErrorCode,
} from '@/types/billing-responsibility';
import type { BillingResponsibilityFieldErrors } from './student-create-billing-responsibility';

export interface BillingResponsibilityApiErrorContext {
  message: string;
  fieldErrors?: BillingResponsibilityFieldErrors;
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
};

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

  return {
    message,
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}
