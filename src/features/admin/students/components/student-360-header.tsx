'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { computeProfileReadinessState } from '../utils/student-readiness-state';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import {
  buildStudent360AcademicContextLine,
  shouldShowStudent360HeaderAttentionCue,
} from '../utils/build-student-360-header-shell';
import { resolveStudentHeaderBilingualNames } from '../utils/resolve-student-header-names';
import { Student360HeaderAvatar } from './student-360-header-avatar';
import { isRelationshipActive } from '../utils/relationship-types';
import type { AcademicClassOption, AcademicLevelOption, StudentDetailsData } from '@/types/student-360';
import type { StudentOverviewData } from '@/types/student-overview';
import { consentHeaderBadgeKind } from '../utils/student-consent-flags';

function hasBasicIdentityGap(details: StudentDetailsData): boolean {
  const s = details.student;
  return !s.date_of_birth || !s.first_name?.trim() || !s.last_name?.trim();
}

function countHeaderAttentionSignals(
  details: StudentDetailsData,
  overview: StudentOverviewData | null | undefined,
): number {
  let count = 0;

  const family = overview?.family;
  const hasGuardian =
    family?.has_guardian === true ||
    details.guardian_relationships.some((r) => isRelationshipActive(r.state, r.active));
  if (!hasGuardian) count += 1;

  const docs = overview?.documents_summary;
  if (docs?.available !== false && (docs?.missing ?? 0) > 0) count += 1;
  else if (!docs && (details.document_summary?.missing_required ?? 0) > 0) count += 1;

  const consents = overview?.consents_summary;
  if (consents?.can_view === true) {
    const flags = consents.important_flags;
    if (consentHeaderBadgeKind(flags?.photo_publish)) count += 1;
    if (consentHeaderBadgeKind(flags?.trip_participation)) count += 1;
  }

  const finance = overview?.finance_summary;
  if (finance?.available === true && (finance.total_overdue ?? 0) > 0) count += 1;

  if (!details.student.massar_code?.trim()) count += 1;

  return count;
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
  const fallbackDisplay = overview?.profile?.full_name?.trim() || getStudentDisplayName(s);
  const names = resolveStudentHeaderBilingualNames({
    nameAr: s.name_ar,
    nameLatin: s.name_latin,
    fallbackDisplay,
  });
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
  const academicContext = buildStudent360AcademicContextLine({ classLabel, levelLabel });

  const photo = overview?.photo;
  const alertCount = countHeaderAttentionSignals(details, overview);
  const showAttentionCue = shouldShowStudent360HeaderAttentionCue({
    alertCount,
    missingBasicIdentity: missingBasic,
    profileReadiness,
  });
  const showAvatarSkeleton = overviewLoading && !photo;
  const statusAccent = status === 'active' ? 'active' : 'default';
  const overviewHref = `/admin/students/${s.id}`;

  return (
    <header
      className={`student-360-header student-360-header--compact student-360-header--${statusAccent}${showAttentionCue ? ' student-360-header--has-attention' : ''}`}
    >
      <div className="student-360-header__accent" aria-hidden="true" />

      <div className="student-360-header__inner">
        <div className="student-360-header__row student-360-header__row--primary">
          <div
            className={`student-360-header__avatar-wrap student-360-header__avatar-wrap--${statusAccent}${showAvatarSkeleton ? ' student-360-header__avatar-wrap--loading' : ''}`}
          >
            <Student360HeaderAvatar
              photo={photo}
              legacyImageUrl={s.image_url}
              displayName={names.displayName}
            />
          </div>

          <div className="student-360-header__body">
            <div className="student-360-header__topline">
              <div className="student-360-header__title-block">
                <div className="student-360-header__names">
                  <h1
                    className="student-360-header__title student-360-header__title--primary"
                    dir={names.primaryDir}
                    lang={names.primaryDir === 'rtl' ? 'ar' : 'fr'}
                  >
                    <span className="visually-hidden">
                      {names.primaryDir === 'rtl'
                        ? t('admin.student360.nameAr')
                        : t('admin.student360.nameLatin')}
                      :{' '}
                    </span>
                    {names.primary}
                  </h1>
                  {names.secondary ? (
                    <p
                      className="student-360-header__title student-360-header__title--secondary"
                      dir={names.secondaryDir ?? 'ltr'}
                      lang="fr"
                    >
                      <span className="visually-hidden">{t('admin.student360.nameLatin')}: </span>
                      {names.secondary}
                    </p>
                  ) : null}
                </div>
                {ref ? (
                  <span className="student-360-header__ref mono" dir="ltr" title={ref}>
                    {ref}
                  </span>
                ) : null}
              </div>
              {actions ? <div className="student-360-header__actions">{actions}</div> : null}
            </div>

            <div className="student-360-header__meta-strip">
              <div className="student-360-header__status-row">
                <Badge tone={status === 'active' ? 'green' : 'slate'}>{statusText}</Badge>
                {academicContext ? (
                  <span
                    className="student-360-header__academic-context"
                    dir="auto"
                    title={academicContext}
                  >
                    {academicContext}
                  </span>
                ) : null}
                {showAttentionCue ? (
                  <Link
                    href={overviewHref}
                    className="student-360-header__attention-cue"
                    title={t('admin.student360.header.attentionCueHint')}
                  >
                    {t('admin.student360.header.attentionCue')}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
