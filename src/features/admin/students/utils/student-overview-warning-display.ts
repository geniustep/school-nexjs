import type { StudentOverviewAlert } from '@/types/student-overview';

export const OVERVIEW_WARNING_CODE_KEYS: Record<string, { title: string; message?: string }> = {
  missing_photo: {
    title: 'admin.student360.overview.alerts.known.missingPhoto',
    message: 'admin.student360.overview.alerts.messages.missingPhoto',
  },
  missing_required_documents: {
    title: 'admin.student360.overview.alerts.known.missingDocuments',
    message: 'admin.student360.overview.alerts.messages.missingDocuments',
  },
  missing_documents: {
    title: 'admin.student360.overview.alerts.known.missingDocuments',
    message: 'admin.student360.overview.alerts.messages.missingDocuments',
  },
  missing_guardian: {
    title: 'admin.student360.overview.alerts.known.missingGuardian',
    message: 'admin.student360.overview.alerts.messages.missingGuardian',
  },
  photo_publish_blocked: {
    title: 'admin.student360.overview.alerts.known.photoPublishBlocked',
    message: 'admin.student360.overview.alerts.messages.photoPublishBlocked',
  },
  trip_consent_pending: {
    title: 'admin.student360.overview.alerts.known.tripConsentPending',
    message: 'admin.student360.overview.alerts.messages.tripConsentPending',
  },
  finance_overdue: {
    title: 'admin.student360.overview.alerts.known.financeOverdue',
    message: 'admin.student360.overview.alerts.messages.financeOverdue',
  },
};

export const OVERVIEW_WARNING_TEXT_KEYS: Record<string, string> = {
  missing_guardian: 'admin.student360.overview.alerts.known.missingGuardian',
  'missing guardian': 'admin.student360.overview.alerts.known.missingGuardian',
  missing_photo: 'admin.student360.overview.alerts.known.missingPhoto',
  'missing photo': 'admin.student360.overview.alerts.known.missingPhoto',
  missing_required_documents: 'admin.student360.overview.alerts.known.missingDocuments',
  missing_documents: 'admin.student360.overview.alerts.known.missingDocuments',
  'missing required documents': 'admin.student360.overview.alerts.known.missingDocuments',
  'missing documents': 'admin.student360.overview.alerts.known.missingDocuments',
  'external photo publishing not allowed': 'admin.student360.overview.alerts.known.photoPublishBlocked',
  'photo publish not allowed': 'admin.student360.overview.alerts.known.photoPublishBlocked',
  'trip consent pending': 'admin.student360.overview.alerts.known.tripConsentPending',
  'finance overdue': 'admin.student360.overview.alerts.known.financeOverdue',
  'overdue balance': 'admin.student360.overview.alerts.known.financeOverdue',
  'no student photo is on file.': 'admin.student360.overview.alerts.messages.missingPhoto',
  'one or more required documents are missing.': 'admin.student360.overview.alerts.messages.missingDocuments',
};

/** Shown when a readiness/schooling token cannot be mapped to a known i18n label. */
export const OVERVIEW_UNKNOWN_WARNING_KEY = 'admin.student360.overview.alerts.unknownReview';

/** Guardian readiness is already surfaced in alerts, header badge, and status summary. */
const GUARDIAN_SCHOOLING_DEDUP_CODES = new Set(['missing_guardian']);

export function warningTokenKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '_');
}

export function isTechnicalWarningKey(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /^[a-z][a-z0-9_]*$/i.test(trimmed) && trimmed.includes('_');
}

function translateKey(t: (key: string) => string, key: string | undefined): string | null {
  if (!key) return null;
  const label = t(key);
  return label !== key ? label : null;
}

export function resolveOverviewWarningCode(
  source: Pick<StudentOverviewAlert, 'code' | 'title' | 'message'> | string,
): string | null {
  if (typeof source === 'string') {
    const slug = warningTokenKey(source);
    return OVERVIEW_WARNING_CODE_KEYS[slug] ? slug : null;
  }

  const fromCode = source.code?.trim();
  if (fromCode && OVERVIEW_WARNING_CODE_KEYS[fromCode]) return fromCode;

  for (const field of [source.title, source.message]) {
    if (!field?.trim()) continue;
    const slug = warningTokenKey(field);
    if (OVERVIEW_WARNING_CODE_KEYS[slug]) return slug;
  }

  return null;
}

export function localizeOverviewWarningToken(
  t: (key: string) => string,
  text: string,
  field: 'title' | 'message' = 'title',
): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const normalized = trimmed.toLowerCase();
  const slug = warningTokenKey(trimmed);
  const codeKeys = OVERVIEW_WARNING_CODE_KEYS[slug];
  if (codeKeys) {
    const mappedKey = field === 'title' ? codeKeys.title : codeKeys.message;
    const translated = translateKey(t, mappedKey);
    if (translated) return translated;
  }

  const fallbackKey = OVERVIEW_WARNING_TEXT_KEYS[normalized] ?? OVERVIEW_WARNING_TEXT_KEYS[slug];
  const fallback = translateKey(t, fallbackKey);
  if (fallback) return fallback;

  if (isTechnicalWarningKey(trimmed)) {
    return translateKey(t, OVERVIEW_UNKNOWN_WARNING_KEY) ?? trimmed;
  }

  return trimmed;
}

export function localizeOverviewAlertField(
  t: (key: string) => string,
  alert: StudentOverviewAlert,
  field: 'title' | 'message',
): string {
  const text = field === 'title' ? alert.title : alert.message;
  if (!text?.trim()) return '';

  const codeKey = alert.code ? OVERVIEW_WARNING_CODE_KEYS[alert.code] : undefined;
  const mappedKey = field === 'title' ? codeKey?.title : codeKey?.message;
  const translated = translateKey(t, mappedKey);
  if (translated) return translated;

  return localizeOverviewWarningToken(t, text, field);
}

export function dedupeOverviewAlerts(alerts: StudentOverviewAlert[]): StudentOverviewAlert[] {
  const seen = new Set<string>();
  const result: StudentOverviewAlert[] = [];

  for (const alert of alerts) {
    const dedupeKey = resolveOverviewWarningCode(alert) ?? warningTokenKey(alert.title);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(alert);
  }

  return result;
}

export function filterSchoolingWarningItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const code = resolveOverviewWarningCode(item) ?? warningTokenKey(item);
    if (GUARDIAN_SCHOOLING_DEDUP_CODES.has(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    result.push(item);
  }

  return result;
}
