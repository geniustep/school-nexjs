'use client';

import { track } from '@vercel/analytics';
import type { FamilyBatchSubmitOutcome } from './family-admission-response';

export const FAMILY_ADMISSION_ANALYTICS_EVENTS = {
  STARTED: 'family_admission_started',
  STEP_COMPLETED: 'family_admission_step_completed',
  SUBMIT_RESULT: 'family_admission_submit_result',
  PANEL_OPENED: 'family_panel_opened',
  SIBLING_LINK_CLICKED: 'family_sibling_link_clicked',
} as const;

export type FamilyAdmissionAnalyticsEventName =
  (typeof FAMILY_ADMISSION_ANALYTICS_EVENTS)[keyof typeof FAMILY_ADMISSION_ANALYTICS_EVENTS];

export type FamilyAdmissionWizardStepEvent = 'family' | 'children' | 'review';

export type FamilyAdmissionCountBucket = '2' | '3' | '4_plus';

export type FamilyAdmissionSubmitResultEvent =
  | 'success'
  | 'validation_error'
  | 'conflict'
  | 'network_error'
  | 'server_error';

/** Per-wizard-mount guards — owned by the create page instance, never module-global. */
export type FamilyAdmissionWizardAnalyticsGuards = {
  startedSent: boolean;
  completedSteps: Set<FamilyAdmissionWizardStepEvent>;
};

type FamilyAdmissionStepCompletedProperties = {
  step: FamilyAdmissionWizardStepEvent;
  children_count_bucket: FamilyAdmissionCountBucket;
};

type FamilyAdmissionSubmitResultProperties = {
  result: FamilyAdmissionSubmitResultEvent;
  children_count_bucket: FamilyAdmissionCountBucket;
};

type FamilyPanelOpenedProperties = {
  family_size_bucket: FamilyAdmissionCountBucket;
};

const ALLOWED_PROPERTY_KEYS = new Set([
  'step',
  'children_count_bucket',
  'result',
  'family_size_bucket',
]);

/** Keys that must never reach analytics payloads (defense in depth). */
export const FAMILY_ADMISSION_FORBIDDEN_PROPERTY_KEYS = [
  'student_name',
  'guardian_name',
  'phone',
  'whatsapp',
  'email',
  'massar',
  'address',
  'admission_id',
  'student_id',
  'guardian_id',
  'family_batch_id',
  'batch_id',
  'family_reference',
  'school_id',
  'tenant',
  'tenant_code',
  'error_message',
  'message',
  'search',
] as const;

export function isFamilyAdmissionAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NEXT_PUBLIC_FAMILY_ADMISSIONS_ANALYTICS === 'off') return false;
  if (typeof process !== 'undefined') {
    if (process.env.VITEST === 'true') return false;
    if (process.env.NODE_ENV === 'test') return false;
  }
  return true;
}

export function toChildrenCountBucket(count: number): FamilyAdmissionCountBucket {
  if (count <= 2) return '2';
  if (count === 3) return '3';
  return '4_plus';
}

export function toFamilySizeBucket(size: number): FamilyAdmissionCountBucket {
  return toChildrenCountBucket(size);
}

export function mapFamilyAdmissionSubmitResult(
  outcome: FamilyBatchSubmitOutcome | 'validation_error',
): FamilyAdmissionSubmitResultEvent {
  if (outcome === 'validation_error') return 'validation_error';
  if (outcome.kind === 'success') return 'success';
  if (outcome.kind === 'idempotency_conflict') return 'conflict';
  if (outcome.kind === 'error') {
    if (outcome.code === 'network_error') return 'network_error';
    return 'server_error';
  }
  return 'server_error';
}

export function buildFamilyAdmissionAnalyticsProperties(
  input: Record<string, unknown>,
): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) continue;
    if (
      FAMILY_ADMISSION_FORBIDDEN_PROPERTY_KEYS.includes(
        key as (typeof FAMILY_ADMISSION_FORBIDDEN_PROPERTY_KEYS)[number],
      )
    ) {
      continue;
    }
    if (typeof value !== 'string') continue;
    output[key] = value;
  }
  return output;
}

function emitEvent(
  name: FamilyAdmissionAnalyticsEventName,
  properties?:
    | FamilyAdmissionStepCompletedProperties
    | FamilyAdmissionSubmitResultProperties
    | FamilyPanelOpenedProperties,
): void {
  if (!isFamilyAdmissionAnalyticsEnabled()) return;
  try {
    track(name, properties);
  } catch {
    // Analytics must never block UX.
  }
}

export function createFamilyAdmissionWizardAnalyticsGuards(): FamilyAdmissionWizardAnalyticsGuards {
  return {
    startedSent: false,
    completedSteps: new Set(),
  };
}

export function resetFamilyAdmissionWizardAnalyticsGuards(
  guards: FamilyAdmissionWizardAnalyticsGuards,
): void {
  guards.startedSent = false;
  guards.completedSteps.clear();
}

export function trackFamilyAdmissionStarted(
  guards: FamilyAdmissionWizardAnalyticsGuards,
): void {
  if (guards.startedSent) return;
  guards.startedSent = true;
  emitEvent(FAMILY_ADMISSION_ANALYTICS_EVENTS.STARTED);
}

export function trackFamilyAdmissionStepCompleted(
  guards: FamilyAdmissionWizardAnalyticsGuards,
  step: FamilyAdmissionWizardStepEvent,
  childrenCount: number,
): void {
  if (guards.completedSteps.has(step)) return;
  guards.completedSteps.add(step);

  const properties: FamilyAdmissionStepCompletedProperties = {
    step,
    children_count_bucket: toChildrenCountBucket(childrenCount),
  };

  emitEvent(FAMILY_ADMISSION_ANALYTICS_EVENTS.STEP_COMPLETED, properties);
}

export function trackFamilyAdmissionSubmitResult(
  result: FamilyAdmissionSubmitResultEvent,
  childrenCount: number,
): void {
  const properties: FamilyAdmissionSubmitResultProperties = {
    result,
    children_count_bucket: toChildrenCountBucket(childrenCount),
  };

  emitEvent(FAMILY_ADMISSION_ANALYTICS_EVENTS.SUBMIT_RESULT, properties);
}

/** Emit panel opened — once-per-mount guard lives in the panel component ref. */
export function trackFamilyPanelOpened(familySize: number): void {
  const properties: FamilyPanelOpenedProperties = {
    family_size_bucket: toFamilySizeBucket(familySize),
  };

  emitEvent(FAMILY_ADMISSION_ANALYTICS_EVENTS.PANEL_OPENED, properties);
}

export function trackFamilySiblingLinkClicked(): void {
  emitEvent(FAMILY_ADMISSION_ANALYTICS_EVENTS.SIBLING_LINK_CLICKED);
}
