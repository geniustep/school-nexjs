import type { Locale } from '@/lib/i18n/config';
import type { AdmissionState } from '@/types/admission';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const ACTIVITY_TYPE_KEY = 'admin.admissions.activityTypes';

export function resolveActivityTypeLabel(activityType: string, t: TranslateFn): string {
  const normalized = activityType?.trim();
  if (!normalized) return t(`${ACTIVITY_TYPE_KEY}.unknown`);

  const key = `${ACTIVITY_TYPE_KEY}.${normalized}`;
  const label = t(key);
  if (label === key || label.startsWith('admin.admissions.')) {
    return t(`${ACTIVITY_TYPE_KEY}.unknown`);
  }
  return label;
}

const EN_STATE_LABELS: Record<string, AdmissionState | string> = {
  New: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  'Visit Pending': 'visit_pending',
  'Under Review': 'under_review',
  Accepted: 'accepted',
  Waitlisted: 'waitlisted',
  'Offer Sent': 'offer_sent',
  Confirmed: 'confirmed',
  Lost: 'lost',
  Cancelled: 'cancelled',
  Duplicate: 'duplicate',
};

function translateStateLabel(raw: string, t: TranslateFn): string {
  const trimmed = raw.trim();
  const stateKey = EN_STATE_LABELS[trimmed] ?? trimmed.toLowerCase().replace(/\s+/g, '_');
  const i18nKey = `admin.admissions.states.${stateKey}`;
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : trimmed;
}

const EN_DECISION_LABELS: Record<string, string> = {
  Accepted: 'accepted',
  'Accepted with condition': 'accepted_with_condition',
  Waitlisted: 'waitlisted',
  Rejected: 'rejected',
  'Needs reassessment': 'needs_reassessment',
};

function translateDecisionLabel(raw: string, t: TranslateFn): string {
  const trimmed = raw.trim();
  const decisionKey = EN_DECISION_LABELS[trimmed] ?? trimmed.toLowerCase().replace(/\s+/g, '_');
  const i18nKey = `admin.admissions.decisions.${decisionKey}`;
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : trimmed;
}

const EN_APPOINTMENT_LABELS: Record<string, string> = {
  'School Visit': 'schoolVisit',
  'Written Test': 'writtenTest',
  'Oral Test': 'oralTest',
  'Parent Interview': 'parentInterview',
  'Admin Meeting': 'adminMeeting',
  Other: 'other',
  school_visit: 'schoolVisit',
  written_test: 'writtenTest',
  oral_test: 'oralTest',
  parent_interview: 'parentInterview',
  admin_meeting: 'adminMeeting',
};

function translateAppointmentLabel(raw: string, t: TranslateFn): string {
  const trimmed = raw.trim();
  const typeKey = EN_APPOINTMENT_LABELS[trimmed];
  if (typeKey) {
    const i18nKey = `admin.admissions.appointments.types.${typeKey}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
  }
  return trimmed;
}

const SYSTEM_NOTE_PATTERNS: {
  match: RegExp;
  format: (groups: string[], t: TranslateFn) => string;
}[] = [
  {
    match: /^Status changed from (.+) to (.+)\.?$/i,
    format: ([from, to], t) =>
      t('admin.admissions.timeline.systemMessages.statusChanged', {
        from: translateStateLabel(from, t),
        to: translateStateLabel(to, t),
      }),
  },
  {
    match: /^Registration offer sent\.?$/i,
    format: (_g, t) => t('admin.admissions.timeline.systemMessages.offerSent'),
  },
  {
    match: /^Registration offer created\.?$/i,
    format: (_g, t) => t('admin.admissions.timeline.systemMessages.offerCreated'),
  },
  {
    match: /^Decision made:\s*(.+)\.?$/i,
    format: ([decision], t) =>
      t('admin.admissions.timeline.systemMessages.decisionMade', {
        decision: translateDecisionLabel(decision, t),
      }),
  },
  {
    match: /^Appointment scheduled:\s*(.+)\.?$/i,
    format: ([appointmentType], t) =>
      t('admin.admissions.timeline.systemMessages.appointmentScheduled', {
        type: translateAppointmentLabel(appointmentType, t),
      }),
  },
  {
    match: /^Assessment created(?:\:\s*(.+))?\.?$/i,
    format: ([assessmentType], t) =>
      assessmentType?.trim()
        ? t('admin.admissions.timeline.systemMessages.assessmentCreatedWithType', {
            type: assessmentType.trim(),
          })
        : t('admin.admissions.timeline.systemMessages.assessmentCreated'),
  },
];

export function formatAdmissionActivityNote(
  note: string | null | undefined,
  locale: Locale,
  t: TranslateFn,
): string | null {
  if (!note?.trim()) return null;
  const text = note.trim();

  if (locale === 'en') return text;

  for (const { match, format } of SYSTEM_NOTE_PATTERNS) {
    const groups = text.match(match);
    if (groups) {
      return format(groups.slice(1), t);
    }
  }

  return text;
}
