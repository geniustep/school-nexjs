import type { AdmissionDecision } from '@/types/admission';
import type { Ref } from '@/types/api';

function cleanText(value: unknown): string | null {
  if (value === false || value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function cleanRef(value: unknown): Ref | string | null {
  if (value === false || value == null) return null;
  if (typeof value === 'string') {
    const text = value.trim();
    return text || null;
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return value as Ref;
  }
  return null;
}

/** Raw admission payload shapes that may carry a flat or nested decision. */
export type AdmissionDecisionRawSource = {
  decision?: AdmissionDecision | string | false | null;
  decision_date?: string | false | null;
  decision_notes?: string | false | null;
  decision_user?: Ref | string | false | null;
  conditions?: string | false | null;
};

function isNestedDecision(value: unknown): value is AdmissionDecision {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize Odoo flat decision fields (and legacy nested objects) into
 * a single AdmissionDecision | null for UI consumption.
 */
export function normalizeAdmissionDecision(
  raw: AdmissionDecisionRawSource | null | undefined,
): AdmissionDecision | null {
  if (!raw) return null;

  if (isNestedDecision(raw.decision)) {
    const nested = raw.decision;
    const decision = cleanText(nested.decision);
    if (!decision) return null;
    return {
      decision,
      decision_date: cleanText(nested.decision_date) ?? cleanText(raw.decision_date),
      decision_notes: cleanText(nested.decision_notes) ?? cleanText(raw.decision_notes),
      decision_user: cleanRef(nested.decision_user) ?? cleanRef(raw.decision_user),
      conditions: cleanText(nested.conditions) ?? cleanText(raw.conditions),
    };
  }

  if (typeof raw.decision === 'string') {
    const decision = cleanText(raw.decision);
    if (!decision) return null;
    return {
      decision,
      decision_date: cleanText(raw.decision_date),
      decision_notes: cleanText(raw.decision_notes),
      decision_user: cleanRef(raw.decision_user),
      conditions: cleanText(raw.conditions),
    };
  }

  return null;
}

export function resolveNormalizedDecisionValue(
  raw: AdmissionDecisionRawSource | null | undefined,
): string | null {
  return normalizeAdmissionDecision(raw)?.decision ?? null;
}
