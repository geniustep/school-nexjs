export type AdmissionTabId =
  | 'overview'
  | 'timeline'
  | 'appointments'
  | 'assessments'
  | 'decision'
  | 'offers'
  | 'prefill';

export const ADMISSION_TABS: AdmissionTabId[] = [
  'overview',
  'timeline',
  'appointments',
  'assessments',
  'decision',
  'offers',
  'prefill',
];

export function parseAdmissionTab(
  value: string | null,
  showPrefill: boolean,
): AdmissionTabId {
  const allowed = showPrefill ? ADMISSION_TABS : ADMISSION_TABS.filter((t) => t !== 'prefill');
  if (value && allowed.includes(value as AdmissionTabId)) {
    return value as AdmissionTabId;
  }
  return 'overview';
}

export function buildAdmissionTabHref(admissionId: string, tab: AdmissionTabId): string {
  if (tab === 'overview') return `/admin/admissions/${admissionId}`;
  return `/admin/admissions/${admissionId}?tab=${tab}`;
}
