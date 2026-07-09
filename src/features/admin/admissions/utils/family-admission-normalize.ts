import type {
  FamilyBatchApplicationSummary,
  FamilyBatchCreateResponse,
  FamilyBatchDetail,
} from '@/types/admission';
import { formatAdmissionReference } from './admission-labels';

export function familyBatchApplicationReference(
  app: Pick<FamilyBatchApplicationSummary, 'id' | 'name' | 'reference'>,
): string {
  const label = app.name ?? app.reference ?? undefined;
  return formatAdmissionReference(app.id, label);
}

export function normalizeFamilyBatchApplication(
  raw: FamilyBatchApplicationSummary,
): FamilyBatchApplicationSummary {
  return {
    ...raw,
    name: raw.name ?? raw.reference ?? null,
    reference: raw.reference ?? raw.name ?? null,
  };
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
  const applications = (data.applications ?? []).map(normalizeFamilyBatchApplication);
  return {
    ...data,
    application_count: data.application_count ?? applications.length,
    applications,
  };
}
