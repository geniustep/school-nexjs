/** Operational tab order for Student 360 (admin). */
export const STUDENT_360_TAB_ORDER = [
  'overview',
  'enrollment',
  'guardians',
  'financial-agreement',
  'finance',
  'health',
  'documents',
] as const;

export type Student360TabId = (typeof STUDENT_360_TAB_ORDER)[number];

const TAB_SET = new Set<string>(STUDENT_360_TAB_ORDER);

export function isStudent360TabId(value: string | null | undefined): value is Student360TabId {
  return !!value && TAB_SET.has(value);
}

/** Resolve tab from URL; invalid or unavailable values fall back to overview. */
export function parseStudent360Tab(
  raw: string | null | undefined,
  available: readonly Student360TabId[],
): Student360TabId {
  if (raw && isStudent360TabId(raw) && available.includes(raw)) {
    return raw;
  }
  return 'overview';
}

export function buildStudent360TabHref(
  studentId: string | number,
  tab: Student360TabId,
): string {
  const base = `/admin/students/${studentId}`;
  if (tab === 'overview') return base;
  return `${base}?tab=${tab}`;
}

/** i18n key for tab label: admin.student360.tabs.{id} */
export function student360TabLabelKey(tab: Student360TabId): string {
  return `admin.student360.tabs.${tab}`;
}

/** i18n key for page header title: admin.student360.pages.{id}.title */
export function student360PageTitleKey(tab: Student360TabId): string {
  return `admin.student360.pages.${tab}.title`;
}

export function buildAvailableStudent360Tabs(options: {
  showFinance: boolean;
  showHealth: boolean;
  showDocuments: boolean;
}): Student360TabId[] {
  return STUDENT_360_TAB_ORDER.filter((tab) => {
    if (tab === 'finance' || tab === 'financial-agreement') return options.showFinance;
    if (tab === 'health') return options.showHealth;
    if (tab === 'documents') return options.showDocuments;
    return true;
  });
}

export function logStudent360TabError(payload: {
  student_id: string | number;
  tab_name: Student360TabId | string;
  endpoint?: string;
  error_type: string;
  request_status?: number | string;
}) {
  console.error('[student360.tab]', {
    student_id: payload.student_id,
    tab_name: payload.tab_name,
    endpoint: payload.endpoint ?? null,
    error_type: payload.error_type,
    request_status: payload.request_status ?? null,
  });
}
