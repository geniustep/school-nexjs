/**
 * Localized Stage 9 ssc_code → message key mapping.
 * Never display raw traceback or internal backend details.
 */

const STAGE9_ERROR_KEYS: Record<string, string> = {
  teaching_review_reason_required: 'teachingReviewPublication.errors.reviewReasonRequired',
  teaching_review_transition_invalid: 'teachingReviewPublication.errors.reviewTransitionInvalid',
  teaching_document_immutable: 'teachingReviewPublication.errors.documentImmutable',
  teaching_approval_required: 'teachingReviewPublication.errors.approvalRequired',
  teaching_publication_source_not_current:
    'teachingReviewPublication.errors.publicationSourceNotCurrent',
  teaching_publication_document_type_invalid:
    'teachingReviewPublication.errors.publicationDocumentTypeInvalid',
  teaching_publication_source_changed: 'teachingReviewPublication.errors.publicationSourceChanged',
  teaching_publication_duplicate: 'teachingReviewPublication.errors.publicationDuplicate',
  teaching_publication_revision_invalid:
    'teachingReviewPublication.errors.publicationRevisionInvalid',
  teaching_homework_correction_required:
    'teachingReviewPublication.errors.homeworkCorrectionRequired',
  teaching_cross_school_forbidden: 'teachingReviewPublication.errors.crossSchoolForbidden',
  teaching_publication_forbidden: 'teachingReviewPublication.errors.publicationForbidden',
  teaching_restricted_data_forbidden: 'teachingReviewPublication.errors.restrictedDataForbidden',
  teaching_homework_not_owner: 'teachingReviewPublication.errors.homeworkNotOwner',
  teaching_draft_print_forbidden: 'teachingReviewPublication.errors.draftPrintForbidden',
  teaching_official_print_forbidden: 'teachingReviewPublication.errors.officialPrintForbidden',
  teaching_export_forbidden: 'teachingReviewPublication.errors.exportForbidden',
  teaching_archive_forbidden: 'teachingReviewPublication.errors.archiveForbidden',
  teaching_print_locale_invalid: 'teachingReviewPublication.errors.printLocaleInvalid',
  teaching_print_document_type_invalid:
    'teachingReviewPublication.errors.printDocumentTypeInvalid',
  teaching_official_publication_required:
    'teachingReviewPublication.errors.officialPublicationRequired',
  teaching_official_snapshot_missing: 'teachingReviewPublication.errors.officialSnapshotMissing',
  teaching_official_snapshot_integrity_failed:
    'teachingReviewPublication.errors.officialSnapshotIntegrityFailed',
  teaching_official_attachment_integrity_failed:
    'teachingReviewPublication.errors.officialAttachmentIntegrityFailed',
  teaching_export_type_invalid: 'teachingReviewPublication.errors.exportTypeInvalid',
  teaching_export_too_large: 'teachingReviewPublication.errors.exportTooLarge',
  teaching_export_record_limit_exceeded:
    'teachingReviewPublication.errors.exportRecordLimitExceeded',
  teaching_export_not_ready: 'teachingReviewPublication.errors.exportNotReady',
  teaching_export_expired: 'teachingReviewPublication.errors.exportExpired',
  teaching_period_scope_invalid: 'teachingReviewPublication.errors.periodScopeInvalid',
  teaching_period_cross_school_forbidden:
    'teachingReviewPublication.errors.periodCrossSchoolForbidden',
  teaching_period_close_forbidden: 'teachingReviewPublication.errors.periodCloseForbidden',
  teaching_period_reopen_forbidden: 'teachingReviewPublication.errors.periodReopenForbidden',
  teaching_period_already_closed: 'teachingReviewPublication.errors.periodAlreadyClosed',
  teaching_period_not_closed: 'teachingReviewPublication.errors.periodNotClosed',
  teaching_period_hard_blockers: 'teachingReviewPublication.errors.periodHardBlockers',
  teaching_period_warnings_not_acknowledged:
    'teachingReviewPublication.errors.periodWarningsNotAcknowledged',
  teaching_period_preview_changed: 'teachingReviewPublication.errors.periodPreviewChanged',
  teaching_period_closing_in_progress: 'teachingReviewPublication.errors.periodClosingInProgress',
  teaching_period_closed: 'teachingReviewPublication.errors.periodClosedWriteForbidden',
  teaching_reopen_reason_required: 'teachingReviewPublication.errors.reopenReasonRequired',
  teaching_close_reason_required: 'teachingReviewPublication.errors.closeReasonRequired',
  teaching_exceptional_correction_forbidden:
    'teachingReviewPublication.errors.exceptionalCorrectionForbidden',
  teaching_exception_reason_required: 'teachingReviewPublication.errors.exceptionReasonRequired',
  teaching_exception_invalid: 'teachingReviewPublication.errors.exceptionInvalid',
  teaching_exception_expired: 'teachingReviewPublication.errors.exceptionExpired',
  teaching_exception_already_used: 'teachingReviewPublication.errors.exceptionAlreadyUsed',
  teaching_legacy_closed_without_snapshot:
    'teachingReviewPublication.errors.legacyClosedWithoutSnapshot',
  not_found: 'teachingReviewPublication.errors.notFound',
  permission_denied: 'teachingReviewPublication.errors.permissionDenied',
  validation_error: 'teachingReviewPublication.errors.validation',
  pdf_generation_failed: 'teachingReviewPublication.errors.pdfGenerationFailed',
};

export function teachingStage9ErrorMessageKey(code: string | null | undefined): string {
  if (!code) return 'teachingReviewPublication.errors.generic';
  return STAGE9_ERROR_KEYS[code] ?? 'teachingReviewPublication.errors.generic';
}

export function isTeachingStage9ErrorCode(code: string | null | undefined): boolean {
  return !!code && code in STAGE9_ERROR_KEYS;
}
