import type { Tone } from '@/components/ui/primitives';
import type { AgreementLineOperationalState } from '../types';

const KNOWN_STATES = new Set<AgreementLineOperationalState>([
  'active_current',
  'cancelled_historical_only',
  'completed_historical_only',
  'historical_only',
  'unscheduled',
]);

const LIFECYCLE_I18N_BASE = 'admin.student360.financialAgreement.lineOperationalState';

export type AgreementLineOperationalStatePresentation = {
  /** Canonical known state, or null when contract missing / unknown string. */
  canonicalState: AgreementLineOperationalState | null;
  rawState: string | null;
  labelKey: string;
  descriptionKey: string | null;
  badgeTone: Tone;
  isHistoricalOnly: boolean;
  isCurrent: boolean;
  isKnown: boolean;
  /** True when Backend sent lifecycle action flags and/or operational_state. */
  lifecycleContractPresent: boolean;
};

/** Shared shape for raw JSON lines and normalized amendment options. */
export type AgreementLineLifecycleSource = {
  operational_state?: string | null;
  operationalState?: string | null;
  is_in_current_schedule?: boolean | null;
  isInCurrentSchedule?: boolean | null;
  can_modify?: boolean | null;
  canModify?: boolean | null;
  can_cancel_line?: boolean | null;
  canCancelLine?: boolean | null;
  status_reason_code?: string | null;
  statusReasonCode?: string | null;
  amendment_block_reason?: string | null;
  amendmentBlockReason?: string | null;
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStateToken(value: unknown): string | null {
  const raw = readString(value);
  if (!raw) return null;
  return raw.toLowerCase().replace(/[\s-]+/g, '_');
}

export function hasAgreementLineLifecycleActionContract(
  source: AgreementLineLifecycleSource | null | undefined,
): boolean {
  if (!source) return false;
  if (typeof source.canModify === 'boolean' || typeof source.can_modify === 'boolean') return true;
  if (typeof source.canCancelLine === 'boolean' || typeof source.can_cancel_line === 'boolean') {
    return true;
  }
  if (normalizeStateToken(source.operationalState ?? source.operational_state)) return true;
  return false;
}

function toneForState(state: AgreementLineOperationalState | null, isKnown: boolean): Tone {
  if (!isKnown || state == null) return 'slate';
  switch (state) {
    case 'active_current':
      return 'green';
    case 'cancelled_historical_only':
      return 'red';
    case 'completed_historical_only':
      return 'blue';
    case 'historical_only':
      return 'amber';
    case 'unscheduled':
      return 'slate';
    default:
      return 'slate';
  }
}

function descriptionKeyForState(state: AgreementLineOperationalState | null): string | null {
  if (!state) return `${LIFECYCLE_I18N_BASE}.unavailableDescription`;
  switch (state) {
    case 'active_current':
      return `${LIFECYCLE_I18N_BASE}.includedInCurrentSchedule`;
    case 'cancelled_historical_only':
      return `${LIFECYCLE_I18N_BASE}.cancelledHistoricalDescription`;
    case 'completed_historical_only':
      return `${LIFECYCLE_I18N_BASE}.historicalOnlyDescription`;
    case 'historical_only':
      return `${LIFECYCLE_I18N_BASE}.notIncludedInCurrentSchedule`;
    case 'unscheduled':
      return `${LIFECYCLE_I18N_BASE}.unscheduledDescription`;
    default:
      return null;
  }
}

export function resolveAgreementLineOperationalState(
  source: AgreementLineLifecycleSource | null | undefined,
): AgreementLineOperationalStatePresentation {
  const lifecycleContractPresent = hasAgreementLineLifecycleActionContract(source);
  const rawState = normalizeStateToken(source?.operationalState ?? source?.operational_state);
  const isKnown = rawState != null && KNOWN_STATES.has(rawState as AgreementLineOperationalState);
  const canonicalState = isKnown ? (rawState as AgreementLineOperationalState) : null;

  if (!lifecycleContractPresent) {
    return {
      canonicalState: null,
      rawState: null,
      labelKey: `${LIFECYCLE_I18N_BASE}.unavailable`,
      descriptionKey: `${LIFECYCLE_I18N_BASE}.unavailableDescription`,
      badgeTone: 'slate',
      isHistoricalOnly: false,
      isCurrent: false,
      isKnown: false,
      lifecycleContractPresent: false,
    };
  }

  const scheduleFlag =
    typeof source?.isInCurrentSchedule === 'boolean'
      ? source.isInCurrentSchedule
      : typeof source?.is_in_current_schedule === 'boolean'
        ? source.is_in_current_schedule
        : null;

  const isCurrent = canonicalState === 'active_current' || scheduleFlag === true;
  const isHistoricalOnly =
    canonicalState === 'cancelled_historical_only' ||
    canonicalState === 'completed_historical_only' ||
    canonicalState === 'historical_only' ||
    scheduleFlag === false;

  return {
    canonicalState,
    rawState,
    labelKey: isKnown
      ? `${LIFECYCLE_I18N_BASE}.${canonicalState}`
      : `${LIFECYCLE_I18N_BASE}.unavailable`,
    descriptionKey: isKnown
      ? descriptionKeyForState(canonicalState)
      : `${LIFECYCLE_I18N_BASE}.unavailableDescription`,
    badgeTone: toneForState(canonicalState, isKnown),
    isHistoricalOnly: isKnown ? isHistoricalOnly && !isCurrent : false,
    isCurrent: isKnown ? isCurrent : false,
    isKnown,
    lifecycleContractPresent: true,
  };
}

export function resolveAgreementLineAmendmentBlockReasonCode(
  source: AgreementLineLifecycleSource | null | undefined,
): string | null {
  if (!source) return null;
  return (
    readString(source.statusReasonCode) ??
    readString(source.status_reason_code) ??
    readString(source.amendmentBlockReason) ??
    readString(source.amendment_block_reason)
  );
}

export const AGREEMENT_LINE_LIFECYCLE_UNAVAILABLE_REASON =
  'agreement_line_lifecycle_unavailable';

export const NO_OPEN_INSTALLMENTS_TO_AMEND_REASON = 'no_open_installments_to_amend';

export function isAgreementLinePeriodAmendmentBlockingReason(
  code: string | null | undefined,
): boolean {
  if (!code?.trim()) return false;
  const normalized = code.trim().toLowerCase();
  return (
    normalized === NO_OPEN_INSTALLMENTS_TO_AMEND_REASON ||
    normalized === 'no_open_installments_to_adjust' ||
    normalized === AGREEMENT_LINE_LIFECYCLE_UNAVAILABLE_REASON
  );
}
