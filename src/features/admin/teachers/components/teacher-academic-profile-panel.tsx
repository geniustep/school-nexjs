'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { hasAllowedAction } from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherAcademicProfile } from '@/types/teacher-domain';

function refNames(
  refs: Array<{ id?: number; name?: string }> | undefined,
  fallback: string,
): string {
  if (!refs?.length) return fallback;
  return refs.map((r) => r.name ?? String(r.id ?? '')).filter(Boolean).join(', ') || fallback;
}

export function TeacherAcademicProfilePanel({
  profile,
}: {
  profile: TeacherAcademicProfile;
}) {
  const t = useT();
  const eligibility = profile.eligibility;
  const limits = profile.limits;
  const canEdit = hasAllowedAction(profile.allowed_actions, 'edit_eligibility');
  const canManageQualifications = hasAllowedAction(
    profile.allowed_actions,
    'manage_qualifications',
  );
  const canManageAvailability = hasAllowedAction(
    profile.allowed_actions,
    'manage_availability',
  );

  return (
    <div className="teacher-domain-profile__stack">
      <Card>
        <SectionHead
          title={t('admin.teacherDomain.academic.eligibilityTitle')}
          action={
            canEdit ? (
              <Badge tone="blue">{t('admin.teacherDomain.academic.editable')}</Badge>
            ) : (
              <Badge tone="slate">{t('admin.teacherDomain.academic.readOnly')}</Badge>
            )
          }
        />
        <p className="tiny muted">{t('admin.teacherDomain.academic.eligibilityBoundary')}</p>
        <DefinitionList
          items={[
            {
              label: t('admin.teacherDomain.academic.specialization'),
              value: eligibility?.specialization?.trim() || t('common.dash'),
            },
            {
              label: t('admin.teacherDomain.academic.eligibleSubjects'),
              value: refNames(
                eligibility?.eligible_subjects ?? eligibility?.subjects,
                t('common.dash'),
              ),
            },
            {
              label: t('admin.teacherDomain.academic.eligibleLevels'),
              value: refNames(eligibility?.levels, t('common.dash')),
            },
            {
              label: t('admin.teacherDomain.academic.teachingLanguages'),
              value: refNames(eligibility?.teaching_languages, t('common.dash')),
            },
            {
              label: t('admin.teacherDomain.academic.coordination'),
              value: [
                eligibility?.eligible_as_head_teacher
                  ? t('admin.teacherDomain.academic.headTeacher')
                  : null,
                eligibility?.eligible_as_subject_coordinator
                  ? t('admin.teacherDomain.academic.subjectCoordinator')
                  : null,
                eligibility?.eligible_as_level_coordinator
                  ? t('admin.teacherDomain.academic.levelCoordinator')
                  : null,
              ]
                .filter(Boolean)
                .join(' · ') || t('common.dash'),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHead title={t('admin.teacherDomain.academic.limitsTitle')} />
        <DefinitionList
          items={[
            {
              label: t('admin.teacherDomain.academic.weeklyTarget'),
              value:
                limits?.weekly_hours_target != null
                  ? String(limits.weekly_hours_target)
                  : t('common.dash'),
            },
            {
              label: t('admin.teacherDomain.academic.weeklyMax'),
              value:
                limits?.weekly_hours_max != null
                  ? String(limits.weekly_hours_max)
                  : t('common.dash'),
            },
            {
              label: t('admin.teacherDomain.academic.maxContinuous'),
              value:
                limits?.max_continuous_minutes != null
                  ? String(limits.max_continuous_minutes)
                  : t('common.dash'),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHead
          title={t('admin.teacherDomain.academic.qualificationsTitle')}
          action={
            canManageQualifications ? (
              <Badge tone="blue">{t('admin.teacherDomain.academic.manageable')}</Badge>
            ) : null
          }
        />
        {(profile.qualifications ?? []).length === 0 ? (
          <p className="muted tiny">
            {t('admin.teacherDomain.academic.qualificationsEmpty')}
            {profile.qualifications_summary?.legacy_qualification
              ? ` — ${String(profile.qualifications_summary.legacy_qualification)}`
              : ''}
          </p>
        ) : (
          <ul className="teacher-domain-profile__list">
            {(profile.qualifications ?? []).map((q, index) => (
              <li key={q.id ?? index} dir="auto">
                <strong>{q.title || q.type || t('common.dash')}</strong>
                <span className="muted">
                  {[q.institution, q.specialization, q.verification_state]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHead
          title={t('admin.teacherDomain.academic.availabilityTitle')}
          action={
            canManageAvailability ? (
              <Badge tone="blue">{t('admin.teacherDomain.academic.manageable')}</Badge>
            ) : null
          }
        />
        <p className="tiny muted">{t('admin.teacherDomain.academic.availabilityNotTimetable')}</p>
        {(profile.availability ?? []).length === 0 ? (
          <p className="muted tiny">{t('admin.teacherDomain.academic.availabilityEmpty')}</p>
        ) : (
          <ul className="teacher-domain-profile__list">
            {(profile.availability ?? []).map((slot, index) => {
              const type = slot.availability_type || slot.type || t('common.dash');
              const start = slot.start || slot.start_time;
              const end = slot.end || slot.end_time;
              return (
                <li key={slot.id ?? index}>
                  <span dir="auto">{String(slot.day ?? slot.day_of_week ?? '—')}</span>
                  <span className="mono" dir="ltr">
                    {start && end ? `${start}–${end}` : t('common.dash')}
                  </span>
                  <Badge tone="slate">{String(type)}</Badge>
                  {slot.reason ? (
                    <span className="muted" dir="auto">
                      {slot.reason}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHead title={t('admin.teacherDomain.academic.operationalTitle')} />
        <p className="tiny muted">{t('admin.teacherDomain.academic.operationalReadOnly')}</p>
        <DefinitionList
          items={[
            {
              label: t('admin.teacherDomain.academic.currentAssignments'),
              value: String(
                profile.operational_derived?.current_assignments?.length ??
                  profile.current_assignments?.length ??
                  0,
              ),
            },
            {
              label: t('admin.teacherDomain.academic.derivedWorkload'),
              value: String(
                (profile.operational_derived?.derived_workload as { assigned_weekly_volume?: number })
                  ?.assigned_weekly_volume ??
                  (profile.derived_workload as { assigned_weekly_volume?: number })
                    ?.assigned_weekly_volume ??
                  t('common.dash'),
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
