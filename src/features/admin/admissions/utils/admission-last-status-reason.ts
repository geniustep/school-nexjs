import type { AdmissionLastAction } from '@/types/admission';
import { APPLICATION_STATUS_VALUES, applicationStatusLabelKey } from './admission-modern-status';
import { cleanDisplayValue } from './admission-labels';
import {
  resolveAdmissionTerminalReasonPanel,
  type AdmissionTerminalReasonSource,
} from './admission-terminal-reason';

/** Actions whose `note` is a status-change / lifecycle reason. */
const STATUS_REASON_ACTION_CODES = new Set([
  'change_status',
  'return_to_status',
  'close',
  'reject',
  'rejected',
  'reopen',
]);

const KNOWN_STATUS_CODES = new Set<string>(APPLICATION_STATUS_VALUES);

/** `new → in_assessment: reason` */
const ARROW_TRANSITION_RE =
  /^([a-z][a-z0-9_]*)\s*(?:→|->)\s*([a-z][a-z0-9_]*)\s*:?\s*(.*)$/is;

/** `(previous_status=accepted → new_status=ready_for_registration)` */
const PREV_NEW_STATUS_RE =
  /\(\s*previous_status\s*=\s*([a-z][a-z0-9_]*)\s*(?:→|->)\s*new_status\s*=\s*([a-z][a-z0-9_]*)\s*\)/i;

export type AdmissionLastStatusReasonSource = AdmissionTerminalReasonSource;

export type PresentLastStatusReasonOptions = {
  /** Resolve `admin.admissions.applicationStatus.*` (or equivalent). */
  t: (key: string, vars?: Record<string, string | number>) => string;
};

function cleanReasonText(value: unknown): string {
  return cleanDisplayValue(value);
}

function isKnownStatusCode(value: string): boolean {
  return KNOWN_STATUS_CODES.has(value.trim().toLowerCase());
}

function resolveStatusActionNote(action: AdmissionLastAction | null | undefined): string {
  if (!action || typeof action !== 'object') return '';
  const code = cleanReasonText(action.code).toLowerCase();
  if (!STATUS_REASON_ACTION_CODES.has(code)) return '';
  return cleanReasonText(action.note);
}

/**
 * Raw latest reason text (may still contain machine transition markers).
 */
export function resolveLastStatusReason(
  record: AdmissionLastStatusReasonSource | null | undefined,
): string {
  const terminal = resolveAdmissionTerminalReasonPanel(record);
  if (terminal?.reason) return terminal.reason;

  const fromStatusAction = resolveStatusActionNote(record?.last_action);
  if (fromStatusAction) return fromStatusAction;

  const anyNote = cleanReasonText(record?.last_action?.note);
  if (anyNote) return anyNote;

  return cleanReasonText(record?.lost_reason);
}

export function hasLastStatusReason(
  record: AdmissionLastStatusReasonSource | null | undefined,
): boolean {
  return Boolean(resolveLastStatusReason(record));
}

function statusLabel(
  code: string,
  t: PresentLastStatusReasonOptions['t'],
): string {
  const normalized = code.trim().toLowerCase();
  if (!isKnownStatusCode(normalized)) return code.trim();
  return t(applicationStatusLabelKey(normalized));
}

function humanNoteLooksEmpty(note: string): boolean {
  const trimmed = note.trim();
  if (!trimmed) return true;
  // QA / accidental leftovers after automated "status → status:"
  if ([...trimmed].length <= 1) return true;
  if (/^\d{1,3}$/.test(trimmed)) return true;
  return false;
}

/**
 * Turn Backend machine notes into readable copy:
 * - `new → in_assessment: غ` → «نقل من جديد إلى قيد التقييم» (+ note when meaningful)
 * - English system phrases → localized labels when known
 */
export function presentLastStatusReasonNote(
  rawNote: string,
  options: PresentLastStatusReasonOptions,
): string {
  const { t } = options;
  let note = cleanReasonText(rawNote);
  if (!note) return '';

  const prevNew = note.match(PREV_NEW_STATUS_RE);
  if (prevNew && isKnownStatusCode(prevNew[1]) && isKnownStatusCode(prevNew[2])) {
    const transition = t('admin.admissions.lastStatusReason.transition', {
      from: statusLabel(prevNew[1], t),
      to: statusLabel(prevNew[2], t),
    });
    const remainder = cleanReasonText(note.replace(PREV_NEW_STATUS_RE, ''))
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s.]+|[\s.]+$/g, '');
    const localizedRemainder = localizeKnownSystemPhrase(remainder, t);
    if (localizedRemainder && !humanNoteLooksEmpty(localizedRemainder)) {
      return `${localizedRemainder} — ${transition}`;
    }
    return transition;
  }

  const arrow = note.match(ARROW_TRANSITION_RE);
  if (arrow && isKnownStatusCode(arrow[1]) && isKnownStatusCode(arrow[2])) {
    const transition = t('admin.admissions.lastStatusReason.transition', {
      from: statusLabel(arrow[1], t),
      to: statusLabel(arrow[2], t),
    });
    const human = cleanReasonText(arrow[3]);
    if (human && !humanNoteLooksEmpty(human)) {
      return t('admin.admissions.lastStatusReason.transitionWithNote', {
        from: statusLabel(arrow[1], t),
        to: statusLabel(arrow[2], t),
        note: human,
      });
    }
    return transition;
  }

  return localizeKnownSystemPhrase(note, t) || note;
}

function localizeKnownSystemPhrase(
  note: string,
  t: PresentLastStatusReasonOptions['t'],
): string {
  const trimmed = note.trim();
  if (!trimmed) return '';

  const catalog: Array<{ match: RegExp; key: string }> = [
    {
      match: /^family approved registration\.?$/i,
      key: 'admin.admissions.lastStatusReason.phrases.familyApproved',
    },
    {
      match: /^accepted by school and family approval recorded\.?$/i,
      key: 'admin.admissions.lastStatusReason.phrases.acceptedAndFamilyApproved',
    },
    {
      match: /^decision made:\s*accepted\.?$/i,
      key: 'admin.admissions.lastStatusReason.phrases.decisionAccepted',
    },
    {
      match: /^decision made:\s*accepted with condition\.?$/i,
      key: 'admin.admissions.lastStatusReason.phrases.decisionAcceptedWithCondition',
    },
  ];

  for (const entry of catalog) {
    if (entry.match.test(trimmed)) return t(entry.key);
  }

  // "Decision made: Accepted with Condition.\nتجربة…"
  const decisionSplit = trimmed.match(
    /^(Decision made:\s*Accepted with Condition\.?)\s*([\s\S]*)$/i,
  );
  if (decisionSplit) {
    const rest = cleanReasonText(decisionSplit[2]);
    const head = t('admin.admissions.lastStatusReason.phrases.decisionAcceptedWithCondition');
    return rest ? `${head} — ${rest}` : head;
  }

  const decisionAcceptedSplit = trimmed.match(
    /^(Decision made:\s*Accepted\.?)\s*([\s\S]*)$/i,
  );
  if (decisionAcceptedSplit) {
    const rest = cleanReasonText(decisionAcceptedSplit[2]);
    const head = t('admin.admissions.lastStatusReason.phrases.decisionAccepted');
    return rest ? `${head} — ${rest}` : head;
  }

  const familySplit = trimmed.match(
    /^(Family approved registration\.?)\s*([\s\S]*)$/i,
  );
  if (familySplit) {
    const rest = cleanReasonText(familySplit[2]);
    const head = t('admin.admissions.lastStatusReason.phrases.familyApproved');
    return rest ? `${head} — ${rest}` : head;
  }

  return trimmed;
}

/** Resolve + present for UI. */
export function presentLastStatusReason(
  record: AdmissionLastStatusReasonSource | null | undefined,
  options: PresentLastStatusReasonOptions,
): string {
  const raw = resolveLastStatusReason(record);
  if (!raw) return '';
  return presentLastStatusReasonNote(raw, options);
}
