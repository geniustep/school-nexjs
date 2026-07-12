/**
 * Detail tabs (max 6) + legacy ?tab= mapping.
 */

export type AdmissionTabId =
  | 'summary'
  | 'family_data'
  | 'assessments_appointments'
  | 'decision'
  | 'offer_registration'
  | 'history';

/** Canonical tab list shown in the detail nav. */
export const ADMISSION_TABS: AdmissionTabId[] = [
  'summary',
  'family_data',
  'assessments_appointments',
  'decision',
  'offer_registration',
  'history',
];

/** Legacy query values still accepted and canonicalized. */
const LEGACY_TAB_MAP: Record<string, AdmissionTabId> = {
  overview: 'summary',
  summary: 'summary',
  guardians: 'family_data',
  family: 'family_data',
  family_data: 'family_data',
  appointments: 'assessments_appointments',
  assessments: 'assessments_appointments',
  assessments_appointments: 'assessments_appointments',
  decision: 'decision',
  offers: 'offer_registration',
  offer: 'offer_registration',
  registration: 'offer_registration',
  prefill: 'offer_registration',
  offer_registration: 'offer_registration',
  timeline: 'history',
  activity: 'history',
  history: 'history',
};

export function mapLegacyAdmissionTab(
  value: string | null | undefined,
): AdmissionTabId | null {
  if (!value) return null;
  return LEGACY_TAB_MAP[value] ?? null;
}

export function parseAdmissionTab(
  value: string | null,
  _showPrefill = true,
): AdmissionTabId {
  const mapped = mapLegacyAdmissionTab(value);
  if (mapped && ADMISSION_TABS.includes(mapped)) return mapped;
  return 'summary';
}

export function buildAdmissionTabHref(
  admissionId: string,
  tab: AdmissionTabId,
): string {
  if (tab === 'summary') return `/admin/admissions/${admissionId}`;
  return `/admin/admissions/${admissionId}?tab=${tab}`;
}

/** True when URL tab should be rewritten to the canonical tab id. */
export function shouldCanonicalizeAdmissionTab(
  raw: string | null,
  resolved: AdmissionTabId,
): boolean {
  if (!raw) return resolved !== 'summary';
  if (raw === resolved) return false;
  // Legacy alias that maps to a different canonical id
  return mapLegacyAdmissionTab(raw) === resolved;
}
