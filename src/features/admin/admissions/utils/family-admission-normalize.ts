import type {
  FamilyBatchApplicationSummary,
  FamilyBatchCreateResponse,
  FamilyBatchDetail,
} from '@/types/admission';
import { formatAdmissionReference } from './admission-labels';
import {
  normalizeFamilyBatchApplication as normalizeFamilyBatchApplicationOutcome,
  normalizeFamilyBatchDetail as normalizeFamilyBatchDetailOutcome,
} from './normalize-admission-record';

export function familyBatchApplicationReference(
  app: Pick<FamilyBatchApplicationSummary, 'id' | 'name' | 'reference'>,
): string {
  const label = app.name ?? app.reference ?? undefined;
  return formatAdmissionReference(app.id, label);
}

export function normalizeFamilyBatchApplication(
  raw: FamilyBatchApplicationSummary,
): FamilyBatchApplicationSummary {
  const withNames: FamilyBatchApplicationSummary = {
    ...raw,
    name: raw.name ?? raw.reference ?? null,
    reference: raw.reference ?? raw.name ?? null,
  };
  return normalizeFamilyBatchApplicationOutcome(withNames);
}

export function normalizeFamilyBatchCreateData(
  data: FamilyBatchCreateResponse,
): FamilyBatchCreateResponse {
  const applications = (data.applications ?? []).map(normalizeFamilyBatchApplication);
  return {
    ...data,
    application_count: data.application_count ?? applications.length,
    applications,
  };
}

export function normalizeFamilyBatchDetail(data: FamilyBatchDetail): FamilyBatchDetail {
  const withOutcome = normalizeFamilyBatchDetailOutcome(data);
  const applications = (withOutcome.applications ?? []).map((app) =>
    normalizeFamilyBatchApplication(app),
  );
  const rawReason = withOutcome.allowed_actions?.edit_guardians_reason;
  const edit_guardians_reason = typeof rawReason === 'string' ? rawReason : null;

  return {
    ...withOutcome,
    application_count: withOutcome.application_count ?? applications.length,
    applications,
    allowed_actions: withOutcome.allowed_actions
      ? {
          ...withOutcome.allowed_actions,
          edit_guardians: withOutcome.allowed_actions.edit_guardians === true,
          edit_guardians_reason,
        }
      : withOutcome.allowed_actions,
  };
}
