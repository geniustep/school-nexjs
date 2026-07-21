/**
 * Subject × level enablement — read model for school.enabled.subject.
 *
 * Write APIs (bulk enable/disable by operational subject id) are not available
 * in the current Odoo contract; see audit contract for the required release.
 */

/** Flip only after a verified Odoo enablement write contract ships. */
export const SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE = false;

export type SubjectEnablementStatus = 'enabled' | 'not_enabled';

export type SubjectEnablementSource = 'level' | 'track' | 'unknown';

/** One operational subject row in a level matrix. */
export interface SubjectLevelEnablementRow {
  /** school.subject.id */
  operationalSubjectId: number;
  name: string;
  code: string;
  status: SubjectEnablementStatus;
  source: SubjectEnablementSource;
  /** Present when enabled via subjects/options. */
  refSubjectId?: number | null;
  active: boolean;
}

export interface SubjectLevelEnablementMatrix {
  levelId: number;
  levelName: string;
  levelCode: string;
  rows: SubjectLevelEnablementRow[];
  counts: {
    operationalActive: number;
    enabled: number;
    notEnabled: number;
  };
  /** Write mutations must stay off until Odoo exposes a safe contract. */
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
  return {
    canEnableFromReferenceCatalog: true,
    canManageOperationalEnablementMatrix: SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE,
    canDisableLevelEnablement: SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE,
    canBulkUpdateEnablement: SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE,
    consumerSafetyOnDisable: SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE,
  };
}
