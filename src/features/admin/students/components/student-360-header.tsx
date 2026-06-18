'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { initials } from '@/lib/utils/format';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { computeProfileReadinessState } from '../utils/student-readiness-state';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import { resolveStudentPhotoUrl } from '../utils/resolve-student-photo-url';
import { isRelationshipActive } from '../utils/relationship-types';
import type { AcademicClassOption, AcademicLevelOption, StudentDetailsData } from '@/types/student-360';
import type { StudentOverviewData } from '@/types/student-overview';

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
  actions,
}: {
  details: StudentDetailsData;
  overview?: StudentOverviewData | null;
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
  const studyLine = [
    schooling?.class || enrollment?.class || s.class
      ? studentClassLabel((schooling?.class ?? enrollment?.class ?? s.class) as AcademicClassOption)
      : null,
    schooling?.level || enrollment?.level || s.level
      ? studentLevelLabel((schooling?.level ?? enrollment?.level ?? s.level) as AcademicLevelOption)
      : null,
    schooling?.academic_year || enrollment?.academic_year
      ? refOrStringLabel(schooling?.academic_year ?? enrollment?.academic_year)
      : null,
    schooling?.school || enrollment?.school || s.school
      ? refOrStringLabel(schooling?.school ?? enrollment?.school ?? s.school)
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const family = overview?.family;
  const activeGuardian = details.guardian_relationships.find(
    (r) => isRelationshipActive(r.state, r.active) && r.is_primary_contact,
  );
  const guardianLine =
    family?.primary_guardian_name?.trim() ||
    activeGuardian?.guardian.name ||
    null;

  const photo = overview?.photo;
  const photoSrc = resolveStudentPhotoUrl(photo?.thumbnail_url ?? photo?.image_url ?? s.image_url);
  const avatarInitials = initials(displayName);
  const headerBadges = buildHeaderBadges(t, details, overview);

  return (
    <header className="student-360-header card">
      <div className="student-360-header__main">
        <div className="student-360-header__identity">
          <div
            className={`student-360-header__avatar${photoSrc ? ' student-360-header__avatar--photo' : ''}`}
            aria-hidden={photoSrc ? undefined : true}
          >
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt=""
                className="student-360-header__avatar-img"
                loading="lazy"
                decoding="async"
              />
            ) : (
              avatarInitials
            )}
          </div>
          <div className="student-360-header__info">
            <h1 className="student-360-header__title">{displayName}</h1>
            <div className="student-360-header__meta">
              {ref ? (
                <span className="student-360-header__ref mono" dir="auto" title={ref}>
                  {ref}
                </span>
              ) : null}
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
              {headerBadges.map((badge) => (
                <span
                  key={badge.key}
                  className={`student-360-header__overview-badge student-360-header__overview-badge--${badge.tone}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
            {studyLine ? (
              <p className="student-360-header__study-line" dir="auto">
                {studyLine}
              </p>
            ) : null}
            {guardianLine ? (
              <p className="student-360-header__guardian-line" dir="auto">
                <span className="student-360-header__guardian-label">
                  {t('admin.student360.overview.header.guardian')}
                </span>
                {guardianLine}
              </p>
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
