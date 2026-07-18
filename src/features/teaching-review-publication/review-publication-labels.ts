/**
 * Central label keys for Teaching Stage 9 enums — never render raw enums in UI.
 */

import type {
  TeachingClosureState,
  TeachingDocumentType,
  TeachingExportStatus,
  TeachingPublicationStatus,
  TeachingReviewState,
} from '@/types/teaching-review-publication';

export function documentTypeMessageKey(type: TeachingDocumentType | string | null | undefined): string {
  switch (type) {
    case 'teacher_jathatha':
      return 'teachingReviewPublication.documentTypes.teacherJathatha';
    case 'actual_delivery':
      return 'teachingReviewPublication.documentTypes.actualDelivery';
    case 'class_journal':
      return 'teachingReviewPublication.documentTypes.classJournal';
    case 'homework':
      return 'teachingReviewPublication.documentTypes.homework';
    case 'annual_distribution':
      return 'teachingReviewPublication.documentTypes.annualDistribution';
    case 'didactic_sequence':
      return 'teachingReviewPublication.documentTypes.didacticSequence';
    default:
      return 'teachingReviewPublication.documentTypes.unknown';
  }
}

export function reviewStateMessageKey(state: TeachingReviewState | null | undefined): string {
  switch (state) {
    case 'not_reviewed':
      return 'teachingReviewPublication.reviewStates.notReviewed';
    case 'reviewed':
      return 'teachingReviewPublication.reviewStates.reviewed';
    case 'correction_requested':
      return 'teachingReviewPublication.reviewStates.correctionRequested';
    default:
      return 'teachingReviewPublication.reviewStates.unknown';
  }
}

export function publicationStatusMessageKey(
  status: TeachingPublicationStatus | null | undefined,
): string {
  switch (status) {
    case 'approved':
      return 'teachingReviewPublication.publicationStatuses.approved';
    case 'superseded':
      return 'teachingReviewPublication.publicationStatuses.superseded';
    case 'archived':
      return 'teachingReviewPublication.publicationStatuses.archived';
    default:
      return 'teachingReviewPublication.publicationStatuses.unknown';
  }
}

export function exportStatusMessageKey(status: TeachingExportStatus | null | undefined): string {
  switch (status) {
    case 'pending':
      return 'teachingReviewPublication.exportStatuses.pending';
    case 'processing':
      return 'teachingReviewPublication.exportStatuses.processing';
    case 'ready':
      return 'teachingReviewPublication.exportStatuses.ready';
    case 'failed':
      return 'teachingReviewPublication.exportStatuses.failed';
    case 'expired':
      return 'teachingReviewPublication.exportStatuses.expired';
    default:
      return 'teachingReviewPublication.exportStatuses.unknown';
  }
}

export function exportFormatMessageKey(format: string | null | undefined): string {
  switch (format) {
    case 'pdf':
      return 'teachingReviewPublication.exportFormats.pdf';
    case 'csv':
      return 'teachingReviewPublication.exportFormats.csv';
    case 'zip':
      return 'teachingReviewPublication.exportFormats.zip';
    case 'json_audit':
      return 'teachingReviewPublication.exportFormats.jsonAudit';
    default:
      return 'teachingReviewPublication.exportFormats.unknown';
  }
}

export function closureStateMessageKey(state: TeachingClosureState | null | undefined): string {
  switch (state) {
    case 'open':
      return 'teachingReviewPublication.closureStates.open';
    case 'closing':
      return 'teachingReviewPublication.closureStates.closing';
    case 'closed':
      return 'teachingReviewPublication.closureStates.closed';
    case 'reopened':
      return 'teachingReviewPublication.closureStates.reopened';
    default:
      return 'teachingReviewPublication.closureStates.unknown';
  }
}

export function closureScopeMessageKey(scope: string | null | undefined): string {
  switch (scope) {
    case 'term':
      return 'teachingReviewPublication.closureScopes.term';
    case 'academic_year':
      return 'teachingReviewPublication.closureScopes.academicYear';
    default:
      return 'teachingReviewPublication.closureScopes.unknown';
  }
}

export function printLocaleMessageKey(locale: string | null | undefined): string {
  switch (locale) {
    case 'ar':
      return 'teachingReviewPublication.locales.ar';
    case 'fr':
      return 'teachingReviewPublication.locales.fr';
    default:
      return 'teachingReviewPublication.locales.unknown';
  }
}
