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
