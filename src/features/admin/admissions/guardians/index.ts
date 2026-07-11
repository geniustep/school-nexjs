export type {
  AdmissionGuardianDocumentType,
  AdmissionGuardianIdentityDocument,
  AdmissionGuardianRead,
  AdmissionGuardianWritePayload,
  AdmissionWarningDetail,
  GuardianDraft,
  GuardianIdentityDraft,
  AdmissionGuardianValidationError,
} from './types';

export {
  createGuardianClientKey,
  createPrimaryGuardianDraft,
  emptyGuardianDraft,
  emptyGuardianIdentityDraft,
  getPrimaryGuardian,
  setPrimaryGuardian,
  removeGuardianDraft,
  updateGuardianDraft,
  canRemoveGuardian,
  guardianIdAlreadyLinked,
  pruneGuardianChildLinks,
  validateGuardiansDraft,
  validateGuardianIdentity,
} from './guardian-draft';

export {
  hydrateAdmissionGuardians,
  hydrateGuardiansFromApi,
  hydrateGuardiansFromLegacyFlat,
  hydrateGuardiansFromSharedContact,
  normalizeGuardianIdentityDocument,
} from './normalize-admission-guardians';

export {
  serializeGuardiansPayload,
  serializeGuardianDraft,
  serializeGuardianIdentity,
  deriveLegacyGuardianFields,
  deriveSharedContactFromPrimary,
} from './serialize-admission-guardians';

export {
  buildPatchFamilyBatchGuardiansPayload,
  buildFamilyBatchChildKeyMaps,
  familyBatchChildClientKey,
  familyBatchGuardiansPatchEndpoint,
  isMaskedIdentityNumber,
  validateFamilyBatchGuardiansPatchDraft,
} from './serialize-family-batch-guardians-patch';

export {
  canonicalizeFamilyGuardiansForComparison,
  familyBatchGuardiansHaveChanges,
} from './canonicalize-family-guardians-for-comparison';
export type { CanonicalFamilyGuardianForComparison } from './canonicalize-family-guardians-for-comparison';

export {
  ADMISSION_GUARDIAN_WARNING_CODES,
  admissionGuardianWarningMessageKey,
  isAdmissionGuardianWarningBlocking,
  isAdmissionGuardianWarningCode,
  translateAdmissionGuardianWarning,
} from './admission-guardian-warnings';

export { AdmissionGuardiansSection } from './admission-guardians-section';
export { AdmissionGuardianCard } from './admission-guardian-card';
export { AdmissionGuardiansDetails } from './admission-guardians-details';
export {
  normalizeAdmissionGuardiansForDisplay,
  normalizeAdmissionGuardianSectionWarnings,
  normalizeGuardianIdentityForDisplay,
  resolveGuardianIdentityAttachmentPreviewUrl,
  dedupeGuardiansByStrongId,
} from './normalize-admission-guardians-display';
export type {
  AdmissionGuardianDisplay,
  AdmissionGuardianDisplayChild,
  AdmissionGuardianDisplayIdentity,
} from './normalize-admission-guardians-display';
