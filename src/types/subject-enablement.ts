/**
 * Subject × level enablement — Odoo 18.0.1.0.236 contract.
 * Source: NEXTJS_CONTRACT_BRIEF.md (SHA dd87c692be0542369715e2e90fb5b47ed0421899)
 */

/**
 * Env / build-time write gate.
 *
 * - Name: `NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE`
 * - Default: on (unset) — all four production tenants are on Odoo 236
 * - Explicit opt-out: `0` / `false` / `off`
 * - Explicit opt-in: `1` / `true` / `on`
 * - Mutations remain gated by server `can_manage` + active-role; this flag only
 *   controls whether the UI exposes write controls.
 */
export function isSubjectLevelEnablementWriteAvailable(): boolean {
  const raw = (process.env.NEXT_PUBLIC_SUBJECT_LEVEL_ENABLEMENT_WRITE ?? '').trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  if (raw === '' || raw === '1' || raw === 'true' || raw === 'on') return true;
  return false;
}

/** @deprecated Prefer `isSubjectLevelEnablementWriteAvailable()` — kept for N4-I tests. */
export const SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE = false;

export type SubjectEnablementStatus = 'enabled' | 'not_enabled';

export type SubjectEnablementSource = 'level' | 'track' | 'unknown';

export type SubjectEnablementCellState = 'enabled' | 'archived' | 'not_enabled';

export interface SubjectEnablementConsumerCounts {
  assignments?: number;
  offerings?: number;
  timetable_requirements?: number;
  timetable_slots?: number;
  timetable_occurrences?: number;
  homework?: number;
  homeworks?: number;
  exams?: number;
  gradebooks?: number;
  deliveries?: number;
  jathatha?: number;
  journal_entries?: number;
  progress?: number;
  [key: string]: number | undefined;
}

export interface SubjectEnablementConsumerSummary {
  can_disable: boolean;
  disable_block_code: string | null;
  active_consumer_counts: SubjectEnablementConsumerCounts;
  historical_consumer_counts: SubjectEnablementConsumerCounts;
}

export interface SubjectEnablementAllowedActions {
  view: boolean;
  enable: boolean;
  disable: boolean;
  update: boolean;
}

export interface SubjectEnablementPlan {
  weekly_minutes: number | null;
  assessment_coefficient: number | null;
  legacy_coefficient: number | null;
}

export interface SubjectEnablementItem {
  enabled_record_id: number | null;
  operational_subject_id: number;
  subject: {
    id: number;
    name?: string;
    code: string;
    ref_subject_id?: number | null;
    ref_subject_code?: string | null;
    active: boolean;
  };
  level: { id: number; code?: string; name?: string };
  academic_year: { id: number };
  enabled: boolean;
  is_active: boolean;
  state: SubjectEnablementCellState | string;
  plan?: SubjectEnablementPlan;
  consumer_summary?: SubjectEnablementConsumerSummary;
  allowed_actions?: SubjectEnablementAllowedActions;
  write_date?: string | null;
}

export interface SubjectEnablementMatrixPayload {
  school: { id: number; name: string; code?: string };
  academic_year: {
    id: number;
    name: string;
    code?: string;
    is_current?: boolean;
    state?: string;
  };
  levels: Array<{
    id: number;
    name: string;
    code?: string;
    ref_level_id?: number | null;
    active?: boolean;
  }>;
  operational_subjects: Array<{
    id: number;
    name: string;
    code: string;
    ref_subject_id?: number | null;
    ref_subject_code?: string | null;
    active: boolean;
  }>;
  items: SubjectEnablementItem[];
  counts: {
    levels: number;
    operational_subjects: number;
    enabled: number;
    by_level?: unknown[];
  };
  version: string;
  permissions: {
    can_view: boolean;
    can_manage: boolean;
  };
}

/** Strict POST body allowlist — no school_id, no extra fields. */
export interface SubjectEnablementUpdateRequest {
  academic_year_id: number;
  level_id: number;
  enable_subject_ids: number[];
  disable_subject_ids: number[];
  expected_version: string;
}

export interface SubjectEnablementUpdateResults {
  created: number[];
  reactivated: number[];
  disabled: number[];
  noop: number[];
}

export interface SubjectEnablementUpdateResponse extends SubjectEnablementMatrixPayload {
  results: SubjectEnablementUpdateResults;
}

/** One operational subject row in a level matrix (UI model). */
export interface SubjectLevelEnablementRow {
  /** school.subject.id */
  operationalSubjectId: number;
  name: string;
  code: string;
  status: SubjectEnablementStatus;
  source: SubjectEnablementSource;
  /** Present when enabled via subjects/options (legacy read path). */
  refSubjectId?: number | null;
  active: boolean;
  enabledRecordId?: number | null;
  state?: SubjectEnablementCellState | string;
  consumerSummary?: SubjectEnablementConsumerSummary | null;
  allowedActions?: SubjectEnablementAllowedActions | null;
}

export interface SubjectLevelEnablementMatrix {
  levelId: number;
  levelName: string;
  levelCode: string;
  academicYearId: number | null;
  version: string | null;
  rows: SubjectLevelEnablementRow[];
  counts: {
    operationalActive: number;
    enabled: number;
    notEnabled: number;
  };
  permissions: {
    canView: boolean;
    canManage: boolean;
  };
  /** Write mutations gated by env flag + server can_manage. */
  writeAvailable: boolean;
}

export interface SubjectEnabledLevelSummary {
  operationalSubjectId: number;
  enabledLevelIds: number[];
  enabledLevelCodes: string[];
  enabledCount: number;
}

export type SubjectEnablementWriteCapability = {
  canEnableFromReferenceCatalog: boolean;
  canManageOperationalEnablementMatrix: boolean;
  canDisableLevelEnablement: boolean;
  canBulkUpdateEnablement: boolean;
  consumerSafetyOnDisable: boolean;
};

export function getSubjectEnablementWriteCapability(): SubjectEnablementWriteCapability {
  const write = isSubjectLevelEnablementWriteAvailable();
  return {
    canEnableFromReferenceCatalog: true,
    canManageOperationalEnablementMatrix: write,
    canDisableLevelEnablement: write,
    canBulkUpdateEnablement: write,
    consumerSafetyOnDisable: write,
  };
}

/** Contract error codes (HTTP mapping documented in NEXTJS_CONTRACT_BRIEF.md). */
export const SUBJECT_ENABLEMENT_ERROR_CODES = {
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  schoolOutOfScope: 'school_out_of_scope',
  levelOutOfScope: 'level_out_of_scope',
  notFound: 'not_found',
  invalidJson: 'invalid_json',
  invalidPayload: 'invalid_payload',
  validationError: 'validation_error',
  overlap: 'subject_level_enablement_enable_disable_overlap',
  hasActiveConsumers: 'subject_level_enablement_has_active_consumers',
  versionConflict: 'subject_level_enablement_version_conflict',
  duplicateConflict: 'subject_level_enablement_duplicate_conflict',
} as const;
