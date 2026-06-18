export type StudentConsentFlagState =
  | 'pending'
  | 'granted'
  | 'denied'
  | 'expired'
  | 'revoked'
  | 'missing'
  | 'not_granted'
  | string
  | null;

export interface StudentConsentFlag {
  state: StudentConsentFlagState;
  allowed: boolean;
  hasAttachment: boolean;
}

export type StudentConsentFlagKey =
  | 'trip_participation'
  | 'photo_publish'
  | 'social_media_publish'
  | 'emergency_treatment'
  | 'school_transport'
  | 'pickup_authorization';

export const CONSENT_FLAG_KEYS: StudentConsentFlagKey[] = [
  'trip_participation',
  'photo_publish',
  'social_media_publish',
  'emergency_treatment',
  'school_transport',
  'pickup_authorization',
];

export type ConsentHeaderBadgeKind = 'pending' | 'blocked';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStateValue(value: unknown): StudentConsentFlagState {
  if (value == null) return null;
  const text = readString(value);
  return text ? text.toLowerCase() : null;
}

/** Normalize API flag object, legacy string, or nested status object. */
export function normalizeConsentFlag(value: unknown): StudentConsentFlag | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    const state = normalizeStateValue(value);
    return {
      state,
      allowed: state === 'granted',
      hasAttachment: false,
    };
  }

  const record = asRecord(value);
  if (!record) return null;

  const nestedState =
    normalizeStateValue(record.state) ??
    normalizeStateValue(record.value) ??
    normalizeStateValue(record.label);

  return {
    state: nestedState,
    allowed: record.allowed === true,
    hasAttachment: record.has_attachment === true,
  };
}

export function consentHeaderBadgeKind(
  flag: StudentConsentFlag | null | undefined,
): ConsentHeaderBadgeKind | null {
  if (!flag) return null;

  const state = flag.state == null ? null : String(flag.state).toLowerCase();

  if (state == null || state === '') return null;

  if (state === 'granted' && flag.allowed) return null;

  if (state === 'pending' || state === 'missing' || state === 'not_granted') {
    return 'pending';
  }

  if (state === 'denied' || state === 'revoked' || state === 'expired') {
    return 'blocked';
  }

  return null;
}

export function consentFlagState(flag: StudentConsentFlag | null | undefined): string | null {
  if (!flag?.state) return null;
  return String(flag.state);
}
