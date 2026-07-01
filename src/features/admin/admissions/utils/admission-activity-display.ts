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

const ASSESSMENT_TYPE_VALUE_KEYS: Record<string, string> = {
  written: 'written',
  oral: 'oral',
  interview: 'interview',
  level_check: 'levelCheck',
  behavior_observation: 'behaviorObservation',
  other: 'other',
};

function translateAssessmentTypeLabel(raw: string, t: TranslateFn): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, '_');
  const valueKey = ASSESSMENT_TYPE_VALUE_KEYS[normalized] ?? ASSESSMENT_TYPE_VALUE_KEYS[trimmed];
  if (valueKey) {
    const i18nKey = `admin.admissions.assessments.types.${valueKey}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
  }

  const writtenTest = /written/i.test(trimmed);
  const oralTest = /oral/i.test(trimmed);
  if (writtenTest) {
    const label = t('admin.admissions.assessments.types.written');
    if (label !== 'admin.admissions.assessments.types.written') return label;
  }
  if (oralTest) {
    const label = t('admin.admissions.assessments.types.oral');
    if (label !== 'admin.admissions.assessments.types.oral') return label;
  }

  return trimmed;
}

const ASSESSMENT_RESULT_VALUE_KEYS: Record<string, string> = {
  suitable: 'suitable',
  suitable_with_support: 'suitableWithSupport',
  needs_lower_level: 'needsLowerLevel',
  needs_reassessment: 'needsReassessment',
  not_suitable: 'notSuitable',
};

function translateAssessmentResultLabel(raw: string, t: TranslateFn): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const key = ASSESSMENT_RESULT_VALUE_KEYS[trimmed.toLowerCase()] ?? trimmed.toLowerCase();
  const i18nKey = `admin.admissions.assessments.results.${key}`;
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : trimmed;
}

const ASSESSMENT_RECOMMENDATION_VALUE_KEYS: Record<string, string> = {
  accept: 'accept',
  accept_with_condition: 'acceptWithCondition',
  waitlist: 'waitlist',
  reject: 'reject',
  reassess: 'reassess',
};

function translateAssessmentRecommendationLabel(raw: string, t: TranslateFn): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const key =
    ASSESSMENT_RECOMMENDATION_VALUE_KEYS[trimmed.toLowerCase()] ?? trimmed.toLowerCase();
  const i18nKey = `admin.admissions.assessments.recommendations.${key}`;
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
    match: /^Admission application linked to official student[:\s]+(.+?)\.?$/i,
    format: ([student], t) =>
      t('admin.admissions.timeline.systemMessages.linkedToStudent', {
        student: student.trim().replace(/\.$/, ''),
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
            type: translateAssessmentTypeLabel(assessmentType, t),
          })
        : t('admin.admissions.timeline.systemMessages.assessmentCreated'),
  },
  {
    match: /^Written assessment added\.? Evaluator:\s*(.+)\. Result:\s*(.+)\.?$/i,
    format: ([evaluator, result], t) =>
      t('admin.admissions.timeline.systemMessages.writtenAssessmentAdded', {
        evaluator: evaluator.trim(),
        result: translateAssessmentResultLabel(result, t),
      }),
  },
  {
    match: /^Written (?:test |assessment )?added(?: in| for) subject[:\s]+(.+)\.? Evaluator:\s*(.+)\. Result:\s*(.+)\.?$/i,
    format: ([subject, evaluator, result], t) =>
      t('admin.admissions.timeline.systemMessages.writtenAssessmentWithSubject', {
        subject: subject.trim(),
        evaluator: evaluator.trim(),
        result: translateAssessmentResultLabel(result, t),
      }),
  },
  {
    match: /^Oral assessment added\.? Evaluator:\s*(.+)\. Result:\s*(.+)\.?$/i,
    format: ([evaluator, result], t) =>
      t('admin.admissions.timeline.systemMessages.oralAssessmentAdded', {
        evaluator: evaluator.trim(),
        result: translateAssessmentResultLabel(result, t),
      }),
  },
  {
    match: /^Oral (?:test |assessment )?added(?: in| for) subject[:\s]+(.+)\.? Evaluator:\s*(.+)\. Result:\s*(.+)\.?$/i,
    format: ([subject, evaluator, result], t) =>
      t('admin.admissions.timeline.systemMessages.oralAssessmentWithSubject', {
        subject: subject.trim(),
        evaluator: evaluator.trim(),
        result: translateAssessmentResultLabel(result, t),
      }),
  },
  {
    match: /^تمت إضافة اختبار كتابي في مادة (.+)\.?$/i,
    format: ([subject], t) =>
      t('admin.admissions.timeline.systemMessages.writtenAssessmentWithSubjectShort', {
        subject: subject.trim(),
      }),
  },
  {
    match: /^تمت إضافة اختبار شفوي في مادة (.+)\.?$/i,
    format: ([subject], t) =>
      t('admin.admissions.timeline.systemMessages.oralAssessmentWithSubjectShort', {
        subject: subject.trim(),
      }),
  },
  {
    match: /^Assessment added:\s*(.+)\. Evaluator:\s*(.+)\. Result:\s*(.+)\.?$/i,
    format: ([type, evaluator, result], t) =>
      t('admin.admissions.timeline.systemMessages.assessmentAddedDetail', {
        type: translateAssessmentTypeLabel(type, t),
        evaluator: evaluator.trim(),
        result: translateAssessmentResultLabel(result, t),
      }),
  },
];

function tryTranslateStandaloneKnownLabel(text: string, t: TranslateFn): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (EN_STATE_LABELS[trimmed]) {
    return translateStateLabel(trimmed, t);
  }

  const snakeKey = trimmed.toLowerCase().replace(/\s+/g, '_');
  const stateI18nKey = `admin.admissions.states.${snakeKey}`;
  const stateLabel = t(stateI18nKey);
  if (stateLabel !== stateI18nKey) return stateLabel;

  if (EN_DECISION_LABELS[trimmed]) {
    return translateDecisionLabel(trimmed, t);
  }

  const activityKey = `${ACTIVITY_TYPE_KEY}.${snakeKey}`;
  const activityLabel = t(activityKey);
  if (activityLabel !== activityKey && !activityLabel.startsWith('admin.admissions.')) {
    return activityLabel;
  }

  return null;
}

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

  const standalone = tryTranslateStandaloneKnownLabel(text, t);
  if (standalone) return standalone;

  return text;
}
