/**
 * Teaching planning capability gates — honors Odoo school.admin.capability codes.
 * UX only; Backend remains the authority.
 */

import { hasAnyUserCapability, hasUserCapability } from '@/lib/permissions/academic-capabilities';
import type { CurrentUser } from '@/types/user';

export const TEACHING_PLANNING_VIEW_CAPABILITY = 'teaching.planning.view';
export const TEACHING_OFFERINGS_MANAGE_CAPABILITY = 'teaching.offerings.manage';
export const TEACHING_OFFERINGS_APPROVE_CAPABILITY = 'teaching.offerings.approve';
export const TEACHING_REFERENCES_MANAGE_CAPABILITY = 'teaching.references.manage';
export const TEACHING_REFERENCES_APPROVE_CAPABILITY = 'teaching.references.approve';
export const TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY = 'teaching.distributions.manage';
export const TEACHING_DISTRIBUTIONS_APPROVE_CAPABILITY = 'teaching.distributions.approve';
export const TEACHING_SEQUENCES_MANAGE_CAPABILITY = 'teaching.sequences.manage';
export const TEACHING_SEQUENCES_APPROVE_CAPABILITY = 'teaching.sequences.approve';
export const TEACHING_REFERENCE_JATHATHAS_MANAGE_CAPABILITY =
  'teaching.reference_jathathas.manage';
export const TEACHING_REFERENCE_JATHATHAS_APPROVE_CAPABILITY =
  'teaching.reference_jathathas.approve';
export const TEACHING_JATHATHAS_VIEW_CAPABILITY = 'teaching.jathathas.view';
export const TEACHING_JATHATHAS_REVIEW_CAPABILITY = 'teaching.jathathas.review';
export const TEACHING_DELIVERIES_VIEW_CAPABILITY = 'teaching.deliveries.view';
export const TEACHING_DELIVERIES_REVIEW_CAPABILITY = 'teaching.deliveries.review';
export const TEACHING_CLASS_JOURNAL_VIEW_CAPABILITY = 'teaching.class_journal.view';
export const TEACHING_PROGRESS_VIEW_CAPABILITY = 'teaching.progress.view';
/** Odoo 221 — Assessment Support admin aggregate (no PII). */
export const TEACHING_ASSESSMENT_SUPPORT_ADMIN_SUMMARY_CAPABILITY =
  'teaching.assessment_support.admin_summary';
/** Odoo 221 — Individual learner detail (separate from summary). */
export const TEACHING_SUPPORT_INDIVIDUAL_DETAIL_CAPABILITY =
  'teaching.support.individual_detail';
export const TEACHING_MASTERY_VIEW_CAPABILITY = 'teaching.mastery.view';
export const TEACHING_SUPPORT_VIEW_CAPABILITY = 'teaching.support.view';
export const TEACHING_ASSESSMENT_BOUNDARIES_VIEW_CAPABILITY =
  'teaching.assessment_boundaries.view';

/** Odoo 224 — Teaching Stage 9 review / publication / closure. */
export const TEACHING_ADMIN_DASHBOARD_VIEW_CAPABILITY = 'teaching.admin_dashboard.view';
export const TEACHING_REVIEW_VIEW_CAPABILITY = 'teaching.review.view';
export const TEACHING_REVIEW_MANAGE_CAPABILITY = 'teaching.review.manage';
export const TEACHING_REVIEW_APPROVE_CAPABILITY = 'teaching.review.approve';
export const TEACHING_OFFICIAL_PRINT_CAPABILITY = 'teaching.official_print';
export const TEACHING_ARCHIVE_VIEW_CAPABILITY = 'teaching.archive.view';
export const TEACHING_ARCHIVE_MANAGE_CAPABILITY = 'teaching.archive.manage';
export const TEACHING_EXPORT_CAPABILITY = 'teaching.export';
export const TEACHING_RESTRICTED_SUPPORT_EXPORT_CAPABILITY =
  'teaching.restricted_support_export';
export const TEACHING_PERIOD_CLOSE_CAPABILITY = 'teaching.period_close';
export const TEACHING_PERIOD_REOPEN_CAPABILITY = 'teaching.period_reopen';
export const TEACHING_PERIOD_EXCEPTIONAL_CORRECTION_CAPABILITY =
  'teaching.period_exceptional_correction';

const TEACHING_PLANNING_ACCESS_CAPABILITIES = [
  TEACHING_PLANNING_VIEW_CAPABILITY,
  TEACHING_OFFERINGS_MANAGE_CAPABILITY,
  TEACHING_OFFERINGS_APPROVE_CAPABILITY,
  TEACHING_REFERENCES_MANAGE_CAPABILITY,
  TEACHING_REFERENCES_APPROVE_CAPABILITY,
  TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY,
  TEACHING_DISTRIBUTIONS_APPROVE_CAPABILITY,
  TEACHING_SEQUENCES_MANAGE_CAPABILITY,
  TEACHING_SEQUENCES_APPROVE_CAPABILITY,
  TEACHING_REFERENCE_JATHATHAS_MANAGE_CAPABILITY,
  TEACHING_REFERENCE_JATHATHAS_APPROVE_CAPABILITY,
  TEACHING_JATHATHAS_VIEW_CAPABILITY,
  TEACHING_JATHATHAS_REVIEW_CAPABILITY,
  TEACHING_DELIVERIES_VIEW_CAPABILITY,
  TEACHING_DELIVERIES_REVIEW_CAPABILITY,
  TEACHING_CLASS_JOURNAL_VIEW_CAPABILITY,
  TEACHING_PROGRESS_VIEW_CAPABILITY,
  TEACHING_ASSESSMENT_SUPPORT_ADMIN_SUMMARY_CAPABILITY,
  TEACHING_SUPPORT_INDIVIDUAL_DETAIL_CAPABILITY,
  TEACHING_MASTERY_VIEW_CAPABILITY,
  TEACHING_SUPPORT_VIEW_CAPABILITY,
  TEACHING_ASSESSMENT_BOUNDARIES_VIEW_CAPABILITY,
  TEACHING_ADMIN_DASHBOARD_VIEW_CAPABILITY,
  TEACHING_REVIEW_VIEW_CAPABILITY,
  TEACHING_REVIEW_MANAGE_CAPABILITY,
  TEACHING_REVIEW_APPROVE_CAPABILITY,
  TEACHING_OFFICIAL_PRINT_CAPABILITY,
  TEACHING_ARCHIVE_VIEW_CAPABILITY,
  TEACHING_ARCHIVE_MANAGE_CAPABILITY,
  TEACHING_EXPORT_CAPABILITY,
  TEACHING_PERIOD_CLOSE_CAPABILITY,
  TEACHING_PERIOD_REOPEN_CAPABILITY,
  TEACHING_PERIOD_EXCEPTIONAL_CORRECTION_CAPABILITY,
] as const;

export function canViewTeachingPlanning(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, TEACHING_PLANNING_ACCESS_CAPABILITIES);
}

export function canManageTeachingReferences(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_REFERENCES_MANAGE_CAPABILITY);
}

export function canApproveTeachingReferences(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_REFERENCES_APPROVE_CAPABILITY);
}

export function canManageTeachingOfferings(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_OFFERINGS_MANAGE_CAPABILITY);
}

export function canApproveTeachingOfferings(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_OFFERINGS_APPROVE_CAPABILITY);
}

export function canManageDidacticSequences(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_SEQUENCES_MANAGE_CAPABILITY);
}

export function canApproveDidacticSequences(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_SEQUENCES_APPROVE_CAPABILITY);
}

export function canManageAnnualDistributions(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY);
}

export function canApproveAnnualDistributions(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_DISTRIBUTIONS_APPROVE_CAPABILITY);
}

/** Any capability that should reveal the Didactic Sequences surfaces in the hub. */
export function canSeeDidacticSequences(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_PLANNING_VIEW_CAPABILITY,
    TEACHING_SEQUENCES_MANAGE_CAPABILITY,
    TEACHING_SEQUENCES_APPROVE_CAPABILITY,
  ]);
}

/** Any capability that should reveal the Annual Distribution surfaces in the hub. */
export function canSeeAnnualDistributions(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_PLANNING_VIEW_CAPABILITY,
    TEACHING_DISTRIBUTIONS_MANAGE_CAPABILITY,
    TEACHING_DISTRIBUTIONS_APPROVE_CAPABILITY,
    TEACHING_OFFERINGS_MANAGE_CAPABILITY,
    TEACHING_OFFERINGS_APPROVE_CAPABILITY,
  ]);
}

export function canManageReferenceJathathas(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_REFERENCE_JATHATHAS_MANAGE_CAPABILITY);
}

export function canApproveReferenceJathathas(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_REFERENCE_JATHATHAS_APPROVE_CAPABILITY);
}

export function canViewTeacherJathathas(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_JATHATHAS_VIEW_CAPABILITY);
}

export function canReviewTeacherJathathas(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_JATHATHAS_REVIEW_CAPABILITY);
}

/** Reveal Reference Jathatha hub card. */
export function canSeeReferenceJathathas(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_PLANNING_VIEW_CAPABILITY,
    TEACHING_REFERENCE_JATHATHAS_MANAGE_CAPABILITY,
    TEACHING_REFERENCE_JATHATHAS_APPROVE_CAPABILITY,
  ]);
}

/** Reveal Admin Teacher Jathatha review hub card. */
export function canSeeTeacherJathathaReview(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_JATHATHAS_VIEW_CAPABILITY,
    TEACHING_JATHATHAS_REVIEW_CAPABILITY,
  ]);
}

export function canViewActualDeliveries(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_DELIVERIES_VIEW_CAPABILITY);
}

export function canReviewActualDeliveries(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_DELIVERIES_REVIEW_CAPABILITY);
}

export function canViewClassJournal(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_CLASS_JOURNAL_VIEW_CAPABILITY);
}

export function canViewTeachingProgress(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_PROGRESS_VIEW_CAPABILITY);
}

/** Reveal Admin Actual Delivery review hub card. */
export function canSeeActualDeliveryReview(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_DELIVERIES_VIEW_CAPABILITY,
    TEACHING_DELIVERIES_REVIEW_CAPABILITY,
  ]);
}

/** Reveal Admin Class Journal hub card. */
export function canSeeClassJournal(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_PLANNING_VIEW_CAPABILITY,
    TEACHING_CLASS_JOURNAL_VIEW_CAPABILITY,
  ]);
}

/** Reveal Admin Teaching Progress hub card. */
export function canSeeTeachingProgress(user: CurrentUser | null | undefined): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_PLANNING_VIEW_CAPABILITY,
    TEACHING_PROGRESS_VIEW_CAPABILITY,
  ]);
}

/** Reveal Admin Assessment Support aggregate summary hub card. */
export function canSeeAssessmentSupportSummary(
  user: CurrentUser | null | undefined,
): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_ASSESSMENT_SUPPORT_ADMIN_SUMMARY_CAPABILITY,
    TEACHING_ASSESSMENT_BOUNDARIES_VIEW_CAPABILITY,
  ]);
}

/** Individual learner assessment detail — separate capability from summary. */
export function canSeeAssessmentSupportIndividualDetail(
  user: CurrentUser | null | undefined,
): boolean {
  return hasUserCapability(user, TEACHING_SUPPORT_INDIVIDUAL_DETAIL_CAPABILITY);
}

/** Reveal Admin Stage 9 review / publication workspace hub card. */
export function canSeeTeachingReviewPublication(
  user: CurrentUser | null | undefined,
): boolean {
  return hasAnyUserCapability(user, [
    TEACHING_REVIEW_VIEW_CAPABILITY,
    TEACHING_ADMIN_DASHBOARD_VIEW_CAPABILITY,
    TEACHING_ARCHIVE_VIEW_CAPABILITY,
    TEACHING_PERIOD_CLOSE_CAPABILITY,
  ]);
}

export function canViewTeachingReviewQueue(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_REVIEW_VIEW_CAPABILITY);
}

export function canManageTeachingReviews(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_REVIEW_MANAGE_CAPABILITY);
}

export function canApproveTeachingOfficialPublication(
  user: CurrentUser | null | undefined,
): boolean {
  return hasUserCapability(user, TEACHING_REVIEW_APPROVE_CAPABILITY);
}

export function canOfficialPrintTeaching(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_OFFICIAL_PRINT_CAPABILITY);
}

export function canViewTeachingArchive(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_ARCHIVE_VIEW_CAPABILITY);
}

export function canManageTeachingArchive(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_ARCHIVE_MANAGE_CAPABILITY);
}

export function canExportTeaching(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_EXPORT_CAPABILITY);
}

export function canExportRestrictedTeachingSupport(
  user: CurrentUser | null | undefined,
): boolean {
  return hasUserCapability(user, TEACHING_RESTRICTED_SUPPORT_EXPORT_CAPABILITY);
}

export function canCloseTeachingPeriod(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_PERIOD_CLOSE_CAPABILITY);
}

export function canReopenTeachingPeriod(user: CurrentUser | null | undefined): boolean {
  return hasUserCapability(user, TEACHING_PERIOD_REOPEN_CAPABILITY);
}

export function canAuthorizeTeachingPeriodException(
  user: CurrentUser | null | undefined,
): boolean {
  return hasUserCapability(user, TEACHING_PERIOD_EXCEPTIONAL_CORRECTION_CAPABILITY);
}

export function isTeachingPlanningPath(pathname: string): boolean {
  const base = pathname.split('?')[0];
  return base === '/admin/teaching-planning' || base.startsWith('/admin/teaching-planning/');
}

/** Teacher-side read-only teaching-planning surfaces (distributions / sequences). */
export function isTeacherTeachingPlanningPath(pathname: string): boolean {
  const base = pathname.split('?')[0];
  return (
    base === '/teacher/teaching-planning' || base.startsWith('/teacher/teaching-planning/')
  );
}
