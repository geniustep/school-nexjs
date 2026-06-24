'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { computeProfileReadinessState } from '../utils/student-readiness-state';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import { Student360HeaderAvatar } from './student-360-header-avatar';
import { isRelationshipActive } from '../utils/relationship-types';
import type { AcademicClassOption, AcademicLevelOption, StudentDetailsData } from '@/types/student-360';
import type { StudentOverviewData } from '@/types/student-overview';
import { consentHeaderBadgeKind } from '../utils/student-consent-flags';

const MAX_VISIBLE_ALERT_BADGES = 4;

function hasBasicIdentityGap(details: StudentDetailsData): boolean {
  const s = details.student;
  return !s.date_of_birth || !s.first_name?.trim() || !s.last_name?.trim();
}

function pushConsentHeaderBadge(
  badges: { key: string; label: string; tone: 'amber' | 'red' | 'slate' }[],
  key: string,
  kind: ReturnType<typeof consentHeaderBadgeKind>,
  labels: { pending: string; blocked: string },
) {
  if (!kind) return;
  badges.push({
    key,
    label: labels[kind],
    tone: kind === 'blocked' ? 'red' : 'amber',
  });
}

function buildHeaderBadges(
  t: (key: string) => string,
  details: StudentDetailsData,
  overview: StudentOverviewData | null | undefined,
): { key: string; label: string; tone: 'amber' | 'red' | 'slate' }[] {
  const badges: { key: string; label: string; tone: 'amber' | 'red' | 'slate' }[] = [];

  const family = overview?.family;
  const hasGuardian =
    family?.has_guardian === true ||
    details.guardian_relationships.some((r) => isRelationshipActive(r.state, r.active));
  if (!hasGuardian) {
    badges.push({
      key: 'no-guardian',
      label: t('admin.student360.overview.badges.noGuardian'),
      tone: 'amber',
    });
  }

  const docs = overview?.documents_summary;
  if (docs?.available !== false && (docs?.missing ?? 0) > 0) {
    badges.push({
      key: 'missing-docs',
      label: t('admin.student360.overview.badges.missingDocs'),
      tone: 'red',
    });
  } else if (!docs && (details.document_summary?.missing_required ?? 0) > 0) {
    badges.push({
      key: 'missing-docs',
      label: t('admin.student360.overview.badges.missingDocs'),
      tone: 'red',
    });
  }

  const consents = overview?.consents_summary;
  if (consents?.can_view === true) {
    const flags = consents.important_flags;
    pushConsentHeaderBadge(badges, 'photo-consent', consentHeaderBadgeKind(flags?.photo_publish), {
      pending: t('admin.student360.overview.badges.photoConsentPending'),
      blocked: t('admin.student360.overview.badges.photoConsentDenied'),
    });
    pushConsentHeaderBadge(badges, 'trip-consent', consentHeaderBadgeKind(flags?.trip_participation), {
      pending: t('admin.student360.overview.badges.tripConsentPending'),
      blocked: t('admin.student360.overview.badges.tripConsentDenied'),
    });
  }

  const finance = overview?.finance_summary;
  if (finance?.available === true && (finance.total_overdue ?? 0) > 0) {
    badges.push({
      key: 'finance-overdue',
      label: t('admin.student360.overview.badges.financeOverdue'),
      tone: 'red',
    });
  }

  if (!details.student.massar_code?.trim()) {
    badges.push({
      key: 'missing-massar',
      label: t('admin.student360.overview.badges.missingMassar'),
      tone: 'amber',
    });
  }

  return badges;
}

export function Student360Header({
  details,
  overview,
  overviewLoading = false,
  actions,
}: {
  details: StudentDetailsData;
  overview?: StudentOverviewData | null;
  overviewLoading?: boolean;
  actions?: React.ReactNode;
}) {
  const t = useT();
  const s = details.student;
  const enrollment = details.current_enrollment;
  const displayName = overview?.profile?.full_name?.trim() || getStudentDisplayName(s);
  const ref =
    overview?.profile?.registration_number ??
    s.school_number ??
    s.matricule ??
    s.code ??
    undefined;
  const missingBasic = hasBasicIdentityGap(details);
  const profileReadiness = computeProfileReadinessState(details);
  const status = overview?.profile?.status ?? s.status;
  const statusText = overview?.profile?.status_label || statusLabel(t, status);

  const schooling = overview?.schooling;
  const classLabel = schooling?.class || enrollment?.class || s.class
    ? studentClassLabel((schooling?.class ?? enrollment?.class ?? s.class) as AcademicClassOption)
    : null;
  const levelLabel = schooling?.level || enrollment?.level || s.level
    ? studentLevelLabel((schooling?.level ?? enrollment?.level ?? s.level) as AcademicLevelOption)
    : null;
  const yearLabel = schooling?.academic_year || enrollment?.academic_year
    ? refOrStringLabel(schooling?.academic_year ?? enrollment?.academic_year)
    : null;
  const schoolLabel = schooling?.school || enrollment?.school || s.school
    ? refOrStringLabel(schooling?.school ?? enrollment?.school ?? s.school)
    : null;

  const family = overview?.family;
  const activeGuardian = details.guardian_relationships.find(
    (r) => isRelationshipActive(r.state, r.active) && r.is_primary_contact,
  );
  const guardianLine =
    family?.primary_guardian_name?.trim() ||
    activeGuardian?.guardian.name ||
    null;

  const photo = overview?.photo;
  const headerBadges = buildHeaderBadges(t, details, overview);
  const visibleAlertBadges = headerBadges.slice(0, MAX_VISIBLE_ALERT_BADGES);
  const hiddenBadgeCount = Math.max(0, headerBadges.length - MAX_VISIBLE_ALERT_BADGES);
  const showAvatarSkeleton = overviewLoading && !photo;

  const factItems = [
    schoolLabel ? { label: t('admin.finance.activeSchool'), value: schoolLabel } : null,
    classLabel || levelLabel
      ? {
          label: t('admin.student360.overview.header.study'),
          value: [classLabel, levelLabel].filter(Boolean).join(' · '),
        }
      : null,
    yearLabel ? { label: t('admin.academicYearId'), value: yearLabel } : null,
    guardianLine
      ? { label: t('admin.student360.overview.header.guardian'), value: guardianLine }
      : null,
    enrollment?.state
      ? { label: t('admin.student360.enrollmentState'), value: statusLabel(t, enrollment.state) }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <header className="student-360-header card">
      <div className="student-360-header__row student-360-header__row--primary">
        <div
          className={`student-360-header__avatar-wrap${showAvatarSkeleton ? ' student-360-header__avatar-wrap--loading' : ''}`}
        >
          <Student360HeaderAvatar
            photo={photo}
            legacyImageUrl={s.image_url}
            displayName={displayName}
          />
        </div>

        <div className="student-360-header__body">
          <div className="student-360-header__topline">
            <div className="student-360-header__title-block">
              <h1 className="student-360-header__title">{displayName}</h1>
              {ref ? (
                <span className="student-360-header__ref mono" dir="auto" title={ref}>
                  {ref}
                </span>
              ) : null}
            </div>
            {actions ? <div className="student-360-header__actions">{actions}</div> : null}
          </div>

          <div className="student-360-header__status-row">
            <Badge tone={status === 'active' ? 'green' : 'slate'}>{statusText}</Badge>
            <span
              className={`student-360-header__readiness-badge student-360-header__readiness-badge--${profileReadiness}`}
            >
              {t(`admin.student360.profileReadiness.${profileReadiness}`)}
            </span>
            {missingBasic ? (
              <span className="student-360-header__gap-badge" title={t('admin.student360.header.incompleteData')}>
                {t('admin.student360.header.incompleteData')}
              </span>
            ) : null}
          </div>

          {visibleAlertBadges.length > 0 || hiddenBadgeCount > 0 ? (
            <div className="student-360-header__alerts" role="list">
              {visibleAlertBadges.map((badge) => (
                <span
                  key={badge.key}
                  role="listitem"
                  className={`student-360-header__overview-badge student-360-header__overview-badge--${badge.tone}`}
                >
                  {badge.label}
                </span>
              ))}
              {hiddenBadgeCount > 0 ? (
                <span
                  role="listitem"
                  className="student-360-header__overview-badge student-360-header__overview-badge--slate"
                  title={headerBadges
                    .slice(MAX_VISIBLE_ALERT_BADGES)
                    .map((b) => b.label)
                    .join(' · ')}
                >
                  {t('admin.student360.overview.header.moreBadges', { count: hiddenBadgeCount })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {factItems.length > 0 ? (
        <div className="student-360-header__row student-360-header__row--secondary">
          <dl className="student-360-header__facts-grid">
            {factItems.map((item) => (
              <div key={item.label} className="student-360-header__fact-item">
                <dt>{item.label}</dt>
                <dd dir="auto">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {photo?.external_publish_allowed === true ? (
        <p className="student-360-header__photo-note muted">
          {t('admin.student360.overview.header.externalPublishAllowed')}
        </p>
      ) : null}
    </header>
  );
}
