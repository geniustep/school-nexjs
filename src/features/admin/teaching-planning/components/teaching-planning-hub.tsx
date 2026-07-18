'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { InfoBanner } from '@/components/ui/primitives';
import { EmptyState } from '@/components/states/states';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  canManageAnnualDistributions,
  canManageDidacticSequences,
  canManageReferenceJathathas,
  canManageTeachingOfferings,
  canManageTeachingReferences,
  canReviewTeacherJathathas,
  canSeeAnnualDistributions,
  canSeeActualDeliveryReview,
  canSeeClassJournal,
  canSeeDidacticSequences,
  canSeeReferenceJathathas,
  canSeeAssessmentSupportSummary,
  canSeeTeacherJathathaReview,
  canSeeTeachingProgress,
  canViewTeachingPlanning,
} from '@/lib/permissions/teaching-planning';
import {
  TEACHING_PLANNING_COMING_SOON_CARDS,
  TEACHING_PLANNING_HUB_CARDS,
  TEACHING_PLANNING_HUB_SECTIONS,
  type TeachingPlanningHubCapability,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { RequireTeachingPlanningAccess } from './require-teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning-hub.css';

function cardVisible(
  capability: TeachingPlanningHubCapability,
  checks: Record<TeachingPlanningHubCapability, boolean>,
): boolean {
  return checks[capability];
}

export function TeachingPlanningHubPage() {
  const t = useT();
  const user = useSession();
  const canView = canViewTeachingPlanning(user);
  const canManageRefs = canManageTeachingReferences(user);
  const canManageOffers = canManageTeachingOfferings(user);
  const canManageSeq = canManageDidacticSequences(user);
  const canManageDist = canManageAnnualDistributions(user);
  const canManageJath = canManageReferenceJathathas(user);
  const canReviewJath = canReviewTeacherJathathas(user);

  const visibility: Record<TeachingPlanningHubCapability, boolean> = {
    offerings: true,
    references: true,
    sequences: canSeeDidacticSequences(user),
    distributions: canSeeAnnualDistributions(user),
    referenceJathathas: canSeeReferenceJathathas(user),
    teacherJathathaReview: canSeeTeacherJathathaReview(user),
    actualDeliveries: canSeeActualDeliveryReview(user),
    classJournal: canSeeClassJournal(user),
    progress: canSeeTeachingProgress(user),
    assessmentSupport: canSeeAssessmentSupportSummary(user),
  };

  const visibleCards = TEACHING_PLANNING_HUB_CARDS.filter((card) =>
    cardVisible(card.capability, visibility),
  );

  const featuredCards = visibleCards.filter((card) => card.featured);
  const canManageAnything =
    canManageOffers ||
    canManageRefs ||
    canManageSeq ||
    canManageDist ||
    canManageJath ||
    canReviewJath;

  return (
    <RequireTeachingPlanningAccess>
      <div className="admin-workspace teaching-planning-hub">
        <Link
          href="/admin/academic"
          className="teaching-planning-hub__back"
          aria-label={t('admin.teachingPlanning.hub.backToAcademic')}
        >
          <span className="teaching-planning-hub__back-icon" aria-hidden="true">
            ←
          </span>
          {t('admin.teachingPlanning.hub.backToAcademic')}
        </Link>

        {!canView ? (
          <EmptyState
            title={t('errors.forbiddenTitle')}
            description={t('admin.pageForbidden')}
          />
        ) : (
          <>
            <header className="teaching-planning-hub__hero">
              <div className="teaching-planning-hub__hero-main">
                <p className="teaching-planning-hub__eyebrow">
                  {t('admin.teachingPlanning.hub.eyebrow')}
                </p>
                <h1 className="teaching-planning-hub__title">
                  {t('admin.teachingPlanning.hub.title')}
                </h1>
                <p className="teaching-planning-hub__subtitle">
                  {t('admin.teachingPlanning.hub.subtitle')}
                </p>
                <div className="teaching-planning-hub__hero-actions">
                  {canManageOffers ? (
                    <Link
                      href="/admin/teaching-planning/offerings?create=1"
                      className="teaching-planning-hub__hero-btn teaching-planning-hub__hero-btn--primary"
                    >
                      {t('admin.teachingPlanning.hub.ctaCreateOffering')}
                    </Link>
                  ) : visibility.offerings ? (
                    <Link
                      href="/admin/teaching-planning/offerings"
                      className="teaching-planning-hub__hero-btn teaching-planning-hub__hero-btn--primary"
                    >
                      {t('admin.teachingPlanning.hub.ctaOpenOfferings')}
                    </Link>
                  ) : null}
                  {visibility.distributions ? (
                    <Link
                      href="/admin/teaching-planning/distributions"
                      className="teaching-planning-hub__hero-btn teaching-planning-hub__hero-btn--ghost"
                    >
                      {t('admin.teachingPlanning.hub.ctaOpenDistributions')}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="teaching-planning-hub__workflow">
                <p className="teaching-planning-hub__workflow-title">
                  {t('admin.teachingPlanning.hub.workflowTitle')}
                </p>
                <ol className="teaching-planning-hub__workflow-steps">
                  <li className="teaching-planning-hub__workflow-step">
                    <span className="teaching-planning-hub__workflow-index">1</span>
                    <span className="teaching-planning-hub__workflow-label">
                      {t('admin.teachingPlanning.hub.workflow.plan')}
                    </span>
                  </li>
                  <li className="teaching-planning-hub__workflow-step">
                    <span className="teaching-planning-hub__workflow-index">2</span>
                    <span className="teaching-planning-hub__workflow-label">
                      {t('admin.teachingPlanning.hub.workflow.jathatha')}
                    </span>
                  </li>
                  <li className="teaching-planning-hub__workflow-step">
                    <span className="teaching-planning-hub__workflow-index">3</span>
                    <span className="teaching-planning-hub__workflow-label">
                      {t('admin.teachingPlanning.hub.workflow.delivery')}
                    </span>
                  </li>
                </ol>
              </div>
            </header>

            <InfoBanner
              tone={canManageAnything ? 'blue' : 'amber'}
              icon={canManageAnything ? '✦' : '👁'}
              title={
                canManageAnything
                  ? t('admin.teachingPlanning.hub.manageHint')
                  : t('admin.teachingPlanning.hub.viewHint')
              }
            />

            {featuredCards.length > 0 ? (
              <section className="teaching-planning-hub__section" aria-labelledby="tp-hub-featured">
                <div className="teaching-planning-hub__section-head">
                  <h2 id="tp-hub-featured" className="teaching-planning-hub__section-title">
                    {t('admin.teachingPlanning.hub.sections.featuredTitle')}
                  </h2>
                  <p className="teaching-planning-hub__section-desc">
                    {t('admin.teachingPlanning.hub.sections.featuredDesc')}
                  </p>
                </div>
                <div className="teaching-planning-hub__featured">
                  {featuredCards.map((card) => (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="teaching-planning-hub__card teaching-planning-hub__card--featured"
                    >
                      <div className="teaching-planning-hub__card-top">
                        <span className="teaching-planning-hub__card-icon" aria-hidden>
                          {card.icon}
                        </span>
                        <span className="teaching-planning-hub__card-arrow" aria-hidden>
                          →
                        </span>
                      </div>
                      <strong className="teaching-planning-hub__card-title">{t(card.titleKey)}</strong>
                      <p className="teaching-planning-hub__card-desc">{t(card.descKey)}</p>
                      <p className="teaching-planning-hub__card-cta">
                        {t('admin.teachingPlanning.hub.openSurface')}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {TEACHING_PLANNING_HUB_SECTIONS.map((section) => {
              const cards = visibleCards.filter(
                (card) => card.section === section.id && !card.featured,
              );
              if (cards.length === 0) return null;
              return (
                <section
                  key={section.id}
                  className="teaching-planning-hub__section"
                  aria-labelledby={`tp-hub-${section.id}`}
                >
                  <div className="teaching-planning-hub__section-head">
                    <h2 id={`tp-hub-${section.id}`} className="teaching-planning-hub__section-title">
                      {t(section.titleKey)}
                    </h2>
                    <p className="teaching-planning-hub__section-desc">{t(section.descKey)}</p>
                  </div>
                  <div className="teaching-planning-hub__grid">
                    {cards.map((card) => (
                      <Link
                        key={card.href}
                        href={card.href}
                        className="teaching-planning-hub__card"
                      >
                        <div className="teaching-planning-hub__card-top">
                          <span className="teaching-planning-hub__card-icon" aria-hidden>
                            {card.icon}
                          </span>
                          <span className="teaching-planning-hub__card-arrow" aria-hidden>
                            →
                          </span>
                        </div>
                        <strong className="teaching-planning-hub__card-title">
                          {t(card.titleKey)}
                        </strong>
                        <p className="teaching-planning-hub__card-desc">{t(card.descKey)}</p>
                        <p className="teaching-planning-hub__card-cta">
                          {t('admin.teachingPlanning.hub.openSurface')}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}

            {TEACHING_PLANNING_COMING_SOON_CARDS.length > 0 ? (
              <section className="teaching-planning-hub__section" aria-labelledby="tp-hub-soon">
                <div className="teaching-planning-hub__section-head">
                  <h2 id="tp-hub-soon" className="teaching-planning-hub__section-title">
                    {t('admin.teachingPlanning.hub.comingSoon')}
                  </h2>
                </div>
                <div className="teaching-planning-hub__grid">
                  {TEACHING_PLANNING_COMING_SOON_CARDS.map((card) => (
                    <div
                      key={card.titleKey}
                      className="teaching-planning-hub__card teaching-planning-hub__coming"
                    >
                      <strong className="teaching-planning-hub__card-title">
                        {t(card.titleKey)}
                      </strong>
                      <p className="teaching-planning-hub__card-desc">{t(card.descKey)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </RequireTeachingPlanningAccess>
  );
}
