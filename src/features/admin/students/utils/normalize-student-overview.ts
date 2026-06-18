import type {
  StudentOverviewAcademicSummary,
  StudentOverviewAlert,
  StudentOverviewAlertAction,
  StudentOverviewAllowedActions,
  StudentOverviewAttendanceSummary,
  StudentOverviewConsentsSummary,
  StudentOverviewData,
  StudentOverviewDocumentsSummary,
  StudentOverviewFamily,
  StudentOverviewFinanceSummary,
  StudentOverviewPhoto,
  StudentOverviewProfile,
  StudentOverviewQuickLink,
  StudentOverviewSchooling,
} from '@/types/student-overview';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentFinanceCurrency } from '@/types/student-finance';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return list.length ? list : undefined;
}

function normalizeAvailableSection<T extends { available?: boolean }>(
  raw: unknown,
  map: (record: Record<string, unknown>) => T,
): T | null {
  const record = asRecord(raw);
  if (!record) return null;
  const section = map(record);
  if (section.available === false) {
    return { ...section, available: false };
  }
  return section;
}

function normalizePhoto(raw: unknown): StudentOverviewPhoto | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    image_url: readString(record.image_url),
    thumbnail_url: readString(record.thumbnail_url),
    external_publish_allowed: record.external_publish_allowed === true,
    has_photo: record.has_photo === true,
  };
}

function normalizeProfile(raw: unknown): StudentOverviewProfile | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    full_name: readString(record.full_name),
    registration_number: readString(record.registration_number),
    status: readString(record.status),
    status_label: readString(record.status_label),
  };
}

function normalizeSchooling(raw: unknown): StudentOverviewSchooling | null {
  return normalizeAvailableSection(raw, (record) => ({
    available: record.available !== false,
    school: (record.school as StudentOverviewSchooling['school']) ?? null,
    academic_year: (record.academic_year as StudentOverviewSchooling['academic_year']) ?? null,
    level: (record.level as StudentOverviewSchooling['level']) ?? null,
    class: (record.class as StudentOverviewSchooling['class']) ?? null,
    enrollment_state: readString(record.enrollment_state),
    gaps: readStringList(record.gaps),
    warnings: readStringList(record.warnings),
  }));
}

function normalizeFamily(raw: unknown): StudentOverviewFamily | null {
  return normalizeAvailableSection(raw, (record) => ({
    available: record.available !== false,
    has_guardian: record.has_guardian === true,
    primary_guardian_name: readString(record.primary_guardian_name),
    primary_guardian_phone: readString(record.primary_guardian_phone),
    guardians_count: readNumber(record.guardians_count),
  }));
}

function normalizeDocumentsSummary(raw: unknown): StudentOverviewDocumentsSummary | null {
  return normalizeAvailableSection(raw, (record) => ({
    available: record.available !== false,
    total: readNumber(record.total),
    missing: readNumber(record.missing),
    pending_review: readNumber(record.pending_review),
    accepted: readNumber(record.accepted),
    rejected: readNumber(record.rejected),
  }));
}

function readConsentStatus(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  const record = asRecord(value);
  if (!record) return null;
  return readString(record.status) ?? readString(record.value) ?? readString(record.label);
}

function normalizeConsentsSummary(raw: unknown): StudentOverviewConsentsSummary | null {
  return normalizeAvailableSection(raw, (record) => ({
    available: record.available !== false,
    can_view: record.can_view === true,
    trip_participation: readConsentStatus(record.trip_participation),
    photo_publish: readConsentStatus(record.photo_publish),
    social_media_publish: readConsentStatus(record.social_media_publish),
    emergency_treatment: readConsentStatus(record.emergency_treatment),
    school_transport: readConsentStatus(record.school_transport),
    pickup_authorization: readConsentStatus(record.pickup_authorization),
  }));
}

function normalizeAttendanceSummary(raw: unknown): StudentOverviewAttendanceSummary | null {
  return normalizeAvailableSection(raw, (record) => {
    const summary: StudentOverviewAttendanceSummary = {
      available: record.available !== false,
      absences_this_month: readNumber(record.absences_this_month),
      late_this_month: readNumber(record.late_this_month),
      last_status: readString(record.last_status),
      last_status_label: readString(record.last_status_label),
      last_status_date: readString(record.last_status_date),
    };
    return summary;
  });
}

function normalizeCurrency(raw: unknown): StudentFinanceCurrency | null {
  const record = asRecord(raw);
  if (!record || typeof record.name !== 'string') return null;
  return {
    name: record.name,
    symbol: typeof record.symbol === 'string' ? record.symbol : record.name,
    position: typeof record.position === 'string' ? record.position : undefined,
  };
}

function normalizeFinanceSummary(raw: unknown): StudentOverviewFinanceSummary | null {
  return normalizeAvailableSection(raw, (record) => ({
    available: record.available === true,
    currency: normalizeCurrency(record.currency),
    total_outstanding: readNumber(record.total_outstanding) ?? null,
    total_overdue: readNumber(record.total_overdue) ?? null,
    total_paid: readNumber(record.total_paid) ?? null,
    next_due_date: readString(record.next_due_date),
    status_label: readString(record.status_label),
  }));
}

function normalizeAcademicSummary(raw: unknown): StudentOverviewAcademicSummary | null {
  return normalizeAvailableSection(raw, (record) => ({
    available: record.available !== false,
    open_homework_count: readNumber(record.open_homework_count),
    upcoming_exams_count: readNumber(record.upcoming_exams_count),
    last_result: readString(record.last_result),
    last_result_label: readString(record.last_result_label),
  }));
}

function normalizeAlertAction(raw: unknown): StudentOverviewAlertAction | null {
  const record = asRecord(raw);
  if (!record) return null;
  const action: StudentOverviewAlertAction = {
    label: readString(record.label) ?? undefined,
    type: readString(record.type) ?? undefined,
    tab: readString(record.tab) ?? undefined,
    url: readString(record.url) ?? undefined,
  };
  return action.label || action.tab || action.url ? action : null;
}

function normalizeAlert(raw: unknown): StudentOverviewAlert | null {
  const record = asRecord(raw);
  if (!record || typeof record.title !== 'string' || !record.title.trim()) return null;
  const severity = readString(record.severity) ?? 'info';
  return {
    severity,
    title: record.title.trim(),
    message: readString(record.message),
    action: normalizeAlertAction(record.action),
  };
}

function normalizeQuickLink(raw: unknown): StudentOverviewQuickLink | null {
  const record = asRecord(raw);
  if (!record || typeof record.label !== 'string' || !record.label.trim()) return null;
  return {
    label: record.label.trim(),
    tab: readString(record.tab) ?? undefined,
    url: readString(record.url) ?? undefined,
  };
}

function normalizeAllowedActions(raw: unknown): StudentOverviewAllowedActions | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const actions: StudentOverviewAllowedActions = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'boolean') actions[key] = value;
  }
  return Object.keys(actions).length ? actions : undefined;
}

function normalizeCapabilities(raw: unknown): StudentCapabilities | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  return record as unknown as StudentCapabilities;
}

/** Normalize GET /admin/students/{id}/overview — tolerant of partial payloads. */
export function normalizeStudentOverviewResponse(data: unknown): StudentOverviewData | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;

  const alerts = Array.isArray(raw.alerts)
    ? raw.alerts.map(normalizeAlert).filter((item): item is StudentOverviewAlert => item != null)
    : [];

  const quickLinks = Array.isArray(raw.quick_links)
    ? raw.quick_links.map(normalizeQuickLink).filter((item): item is StudentOverviewQuickLink => item != null)
    : [];

  return {
    available: raw.available !== false,
    student: asRecord(raw.student) as StudentOverviewData['student'],
    profile: normalizeProfile(raw.profile),
    schooling: normalizeSchooling(raw.schooling),
    family: normalizeFamily(raw.family),
    photo: normalizePhoto(raw.photo),
    documents_summary: normalizeDocumentsSummary(raw.documents_summary),
    consents_summary: normalizeConsentsSummary(raw.consents_summary),
    academic_summary: normalizeAcademicSummary(raw.academic_summary),
    attendance_summary: normalizeAttendanceSummary(raw.attendance_summary),
    finance_summary: normalizeFinanceSummary(raw.finance_summary),
    alerts,
    quick_links: quickLinks,
    allowed_actions: normalizeAllowedActions(raw.allowed_actions),
    capabilities: normalizeCapabilities(raw.capabilities),
  };
}

export function isStudentOverviewUsable(data: StudentOverviewData | null | undefined): boolean {
  return data != null && data.available !== false;
}
