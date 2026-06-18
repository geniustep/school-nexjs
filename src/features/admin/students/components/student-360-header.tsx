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

const MAX_VISIBLE_BADGES = 3;

function hasBasicIdentityGap(details: StudentDetailsData): boolean {
  const s = details.student;
  return !s.date_of_birth || !s.first_name?.trim() || !s.last_name?.trim();
}

function isConsentPending(status: string | null | undefined): boolean {
  if (!status) return true;
  const normalized = status.toLowerCase();
  return normalized === 'pending' || normalized === 'missing' || normalized === 'not_granted';
}

function isPhotoPublishBlocked(consents: StudentOverviewData['consents_summary']): boolean {
  if (!consents || consents.can_view !== true) return false;
  return isConsentPending(consents.photo_publish);
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
  if (isPhotoPublishBlocked(consents)) {
    badges.push({
      key: 'photo-consent',
      label: t('admin.student360.overview.badges.photoConsent'),
      tone: 'amber',
    });
  }

  if (consents?.can_view === true && isConsentPending(consents.trip_participation)) {
    badges.push({
      key: 'trip-consent',
      label: t('admin.student360.overview.badges.tripConsent'),
      tone: 'amber',
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
  const visibleBadges = headerBadges.slice(0, MAX_VISIBLE_BADGES);
  const hiddenBadgeCount = Math.max(0, headerBadges.length - MAX_VISIBLE_BADGES);
  const showAvatarSkeleton = overviewLoading && !photo;

  const factItems = [
    classLabel ? { label: t('nav.classes'), value: classLabel } : null,
    levelLabel ? { label: t('nav.levels'), value: levelLabel } : null,
    yearLabel ? { label: t('admin.academicYearId'), value: yearLabel } : null,
    schoolLabel ? { label: t('admin.finance.activeSchool'), value: schoolLabel } : null,
    guardianLine
      ? { label: t('admin.student360.overview.header.guardian'), value: guardianLine }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <header className="student-360-header card">
      <div className="student-360-header__main">
        <div className="student-360-header__identity">
          <div
            className={`student-360-header__avatar-wrap${showAvatarSkeleton ? ' student-360-header__avatar-wrap--loading' : ''}`}
          >
            <Student360HeaderAvatar
              photo={photo}
              legacyImageUrl={s.image_url}
              displayName={displayName}
            />
          </div>
          <div className="student-360-header__info">
            <div className="student-360-header__title-row">
              <h1 className="student-360-header__title">{displayName}</h1>
              {ref ? (
                <span className="student-360-header__ref mono" dir="auto" title={ref}>
                  {ref}
                </span>
              ) : null}
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

            {factItems.length > 0 ? (
              <dl className="student-360-header__facts-grid">
                {factItems.map((item) => (
                  <div key={item.label} className="student-360-header__fact-item">
                    <dt>{item.label}</dt>
                    <dd dir="auto">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {visibleBadges.length > 0 ? (
              <div className="student-360-header__badges">
                {visibleBadges.map((badge) => (
                  <span
                    key={badge.key}
                    className={`student-360-header__overview-badge student-360-header__overview-badge--${badge.tone}`}
                  >
                    {badge.label}
                  </span>
                ))}
                {hiddenBadgeCount > 0 ? (
                  <span
                    className="student-360-header__overview-badge student-360-header__overview-badge--slate"
                    title={headerBadges
                      .slice(MAX_VISIBLE_BADGES)
                      .map((b) => b.label)
                      .join(' · ')}
                  >
                    {t('admin.student360.overview.header.moreBadges', { count: hiddenBadgeCount })}
                  </span>
                ) : null}
              </div>
            ) : null}

            {photo?.external_publish_allowed === true ? (
              <p className="student-360-header__photo-note muted">
                {t('admin.student360.overview.header.externalPublishAllowed')}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="student-360-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
