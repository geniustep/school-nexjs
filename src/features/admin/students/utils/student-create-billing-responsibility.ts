import type {
  BillingResponsibilityMetadata,
  BillingResponsibilityOutcome,
  BillingResponsibilityRequest,
} from '@/types/billing-responsibility';
import type { StudentCreatePayload } from '@/types/student-360';
import type { StudentCreateBillingFormState } from '@/types/student-enrollment-finance';

export type BillingResponsibilityFieldErrors = {
  billingResponsibilitySelection?: string;
  billingStudentConfirmed?: string;
  billingStudentReason?: string;
};

export function defaultStudentCreateBillingFormState(): StudentCreateBillingFormState {
  return {
    responsibilitySelection: 'guardian',
    studentBillingConfirmed: false,
    studentBillingReason: '',
    guardianSourceMode: 'new',
    linkedGuardianPartnerId: null,
  };
}

export function isStudentBillingReasonValid(reason: string): boolean {
  return reason.trim().length > 0;
}

export function buildBillingResponsibilityRequest(
  billingState: StudentCreateBillingFormState,
): BillingResponsibilityRequest | null {
  if (billingState.responsibilitySelection === 'needs_selection') return null;
  if (billingState.responsibilitySelection === 'guardian') {
    return { mode: 'guardian' };
  }
  if (!billingState.studentBillingConfirmed || !isStudentBillingReasonValid(billingState.studentBillingReason)) {
    return null;
  }
  return {
    mode: 'student',
    confirmed: true,
    reason: billingState.studentBillingReason.trim(),
  };
}

export function validateBillingResponsibilityForm(
  billingState: StudentCreateBillingFormState,
  t: (key: string) => string,
): { valid: boolean; errors: BillingResponsibilityFieldErrors; message?: string } {
  const errors: BillingResponsibilityFieldErrors = {};

  if (billingState.responsibilitySelection === 'needs_selection') {
    const message = t('admin.student360.create.billingResponsibility.errors.selectionRequired');
    errors.billingResponsibilitySelection = message;
    return { valid: false, errors, message };
  }

  if (billingState.responsibilitySelection === 'student') {
    if (!billingState.studentBillingConfirmed) {
      const message = t('admin.student360.create.billingResponsibility.errors.confirmationRequired');
      errors.billingStudentConfirmed = message;
    }
    if (!isStudentBillingReasonValid(billingState.studentBillingReason)) {
      const message = t('admin.student360.create.billingResponsibility.errors.reasonRequired');
      errors.billingStudentReason = message;
    }
    if (Object.keys(errors).length > 0) {
      const message =
        errors.billingStudentConfirmed ??
        errors.billingStudentReason ??
        t('admin.student360.create.billingResponsibility.errors.generic');
      return { valid: false, errors, message };
    }
  }

  return { valid: true, errors: {} };
}

export function applyBillingResponsibilityToPayload(
  payload: StudentCreatePayload,
  billingState: StudentCreateBillingFormState,
): StudentCreatePayload {
  const billingResponsibility = buildBillingResponsibilityRequest(billingState);
  if (!billingResponsibility) return payload;
  return {
    ...payload,
    billing_responsibility: billingResponsibility,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readBillingResponsibilityMetadata(raw: unknown): BillingResponsibilityMetadata | null {
  const record = asRecord(raw);
  if (!record) return null;
  const mode = record.mode === 'guardian' || record.mode === 'student' ? record.mode : undefined;
  const status =
    record.status === 'resolved' || record.status === 'unresolved' ? record.status : undefined;
  const source = typeof record.source === 'string' ? record.source : undefined;
  const review_required = record.review_required === true ? true : undefined;
  if (!mode && !status && !source && review_required == null) return null;
  return { mode, status, source, review_required };
}

function readCollectionAllowed(data: Record<string, unknown>): boolean | null {
  const allowedActions = asRecord(data.allowed_actions);
  if (allowedActions?.collect_payment === false) return false;
  if (allowedActions?.collect_payment === true) return true;

  const collectionGate = asRecord(data.collection_gate);
  if (collectionGate?.collect_allowed === false) return false;
  if (collectionGate?.collect_allowed === true) return true;

  const finance = asRecord(data.finance);
  const financeAllowed = asRecord(finance?.allowed_actions);
  if (financeAllowed?.collect_payment === false) return false;
  const financeGate = asRecord(finance?.collection_gate);
  if (financeGate?.collect_allowed === false) return false;

  const billingResponsibility = readBillingResponsibilityMetadata(
    data.billing_responsibility ?? finance?.billing_responsibility,
  );
  if (billingResponsibility?.status === 'unresolved') return false;

  return null;
}

export function parseBillingResponsibilityOutcome(data: unknown): BillingResponsibilityOutcome {
  const record = asRecord(data);
  if (!record) {
    return { metadata: null, collectionAllowed: null };
  }

  const metadata =
    readBillingResponsibilityMetadata(record.billing_responsibility) ??
    readBillingResponsibilityMetadata(asRecord(record.finance)?.billing_responsibility);

  return {
    metadata,
    collectionAllowed: readCollectionAllowed(record),
  };
}

export function shouldBlockPostCreateCollectionRedirect(outcome: BillingResponsibilityOutcome): boolean {
  if (outcome.metadata?.status === 'unresolved') return true;
  if (outcome.collectionAllowed === false) return true;
  return false;
}

export function resolveBillingResponsibilitySelectionLabel(
  selection: StudentCreateBillingFormState['responsibilitySelection'],
  t: (key: string) => string,
): string {
  if (selection === 'student') return t('admin.finance.partnerStudent');
  if (selection === 'guardian') return t('admin.finance.partnerGuardian');
  return t('admin.student360.create.billingResponsibility.selectionPlaceholder');
}

export function isGuardianFinancialResponsible(
  billingState: StudentCreateBillingFormState,
): boolean {
  return billingState.responsibilitySelection === 'guardian';
}
