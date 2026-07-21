'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { updateTeacherAcademicProfile } from '@/features/admin/teachers/api/teacher-domain-api';
import { hasAllowedAction } from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { mapTeacherDomainError } from '@/features/admin/teachers/utils/teacher-domain-errors';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherAcademicProfile } from '@/types/teacher-domain';

function refNames(
  refs: Array<{ id?: number; name?: string }> | undefined,
  fallback: string,
): string {
  if (!refs?.length) return fallback;
  return refs.map((r) => r.name ?? String(r.id ?? '')).filter(Boolean).join(', ') || fallback;
}

function cycleIdsFromProfile(profile: TeacherAcademicProfile): number[] {
  const cycles = profile.eligibility?.cycles ?? [];
  return cycles
    .map((cycle) => Number(cycle.id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function cycleRefsFromProfile(
  profile: TeacherAcademicProfile,
): Array<{ id?: number; name?: string }> {
  return profile.eligibility?.cycles ?? [];
}

export function TeacherAcademicProfilePanel({
  profile,
  onProfileUpdated,
}: {
  profile: TeacherAcademicProfile;
  onProfileUpdated?: (next: TeacherAcademicProfile) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [displayProfile, setDisplayProfile] = useState(profile);

  useEffect(() => {
    setDisplayProfile(profile);
  }, [profile]);

  const eligibility = displayProfile.eligibility;
  const limits = displayProfile.limits;
  const canEdit = hasAllowedAction(displayProfile.allowed_actions, 'edit_eligibility');
  const canManageQualifications = hasAllowedAction(
    displayProfile.allowed_actions,
    'manage_qualifications',
  );
  const canManageAvailability = hasAllowedAction(
    displayProfile.allowed_actions,
    'manage_availability',
  );

  const [editingCycles, setEditingCycles] = useState(false);
  const [draftCycleIds, setDraftCycleIds] = useState<number[]>([]);
  const [savingCycles, setSavingCycles] = useState(false);
  const [cycleSaveError, setCycleSaveError] = useState<string | null>(null);

  const cycleOptionsState = useLevelOptions(editingCycles, { include_enabled: 'true' });
  const cycleOptions = cycleOptionsState.options?.cycles ?? [];

  const currentCycleRefs = cycleRefsFromProfile(displayProfile);
  const currentCycleIds = useMemo(
    () => cycleIdsFromProfile(displayProfile),
    [displayProfile],
  );

  const optionCatalog = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    for (const cycle of cycleOptions) {
      map.set(cycle.id, { id: cycle.id, name: cycle.name });
    }
    for (const cycle of currentCycleRefs) {
      const id = Number(cycle.id);
      if (!Number.isFinite(id) || id <= 0 || map.has(id)) continue;
      map.set(id, { id, name: cycle.name ?? String(id) });
    }
    return Array.from(map.values());
  }, [cycleOptions, currentCycleRefs]);

  function startCycleEdit() {
    if (!canEdit || savingCycles) return;
    setDraftCycleIds(currentCycleIds);
    setCycleSaveError(null);
    setEditingCycles(true);
  }

  function cancelCycleEdit() {
    if (savingCycles) return;
    setDraftCycleIds(currentCycleIds);
    setCycleSaveError(null);
    setEditingCycles(false);
  }

  function toggleCycle(id: number) {
    if (savingCycles) return;
    setDraftCycleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function saveCycles() {
    if (!canEdit || savingCycles) return;
    setSavingCycles(true);
    setCycleSaveError(null);
    const res = await updateTeacherAcademicProfile(displayProfile.teacher_id, {
      eligible_cycle_ids: draftCycleIds,
    });
    setSavingCycles(false);
    if (!res.success) {
      setCycleSaveError(mapTeacherDomainError(res.error, t));
      toast.error(mapTeacherDomainError(res.error, t));
      return;
    }
    setDisplayProfile(res.data);
    onProfileUpdated?.(res.data);
    setEditingCycles(false);
    toast.success(t('admin.teacherDomain.academic.cyclesSaveSuccess'));
  }

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

        <div className="teacher-domain-profile__cycles">
          <div className="teacher-domain-profile__cycles-head">
            <span className="teacher-domain-profile__cycles-label">
              {t('admin.teacherDomain.academic.eligibleCycles')}
            </span>
            {canEdit && !editingCycles ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={startCycleEdit}
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>

          {editingCycles ? (
            <div className="teacher-domain-profile__cycle-edit">
              {cycleOptionsState.loading && cycleOptions.length === 0 ? (
                <p className="tiny muted">{t('common.loading')}</p>
              ) : optionCatalog.length === 0 ? (
                <p className="tiny muted">
                  {t('admin.teacherDomain.academic.cyclesOptionsEmpty')}
                </p>
              ) : (
                <ul className="teacher-domain-profile__cycle-options" role="group">
                  {optionCatalog.map((cycle) => {
                    const checked = draftCycleIds.includes(cycle.id);
                    return (
                      <li key={cycle.id}>
                        <label className="teacher-domain-profile__cycle-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={savingCycles}
                            onChange={() => toggleCycle(cycle.id)}
                          />
                          <span dir="auto">{cycle.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              {cycleSaveError ? (
                <p className="tiny teacher-domain-profile__cycle-error" role="alert">
                  {cycleSaveError}
                </p>
              ) : null}

              <div className="teacher-domain-profile__cycle-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={savingCycles}
                  onClick={() => void saveCycles()}
                >
                  {savingCycles ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={savingCycles}
                  onClick={cancelCycleEdit}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : currentCycleRefs.length === 0 ? (
            <p className="muted tiny">
              {t('admin.teacherDomain.academic.eligibleCyclesUnset')}
            </p>
          ) : (
            <div className="teacher-domain-profile__cycle-badges">
              {currentCycleRefs.map((cycle) => (
                <Badge key={cycle.id ?? cycle.name} tone="slate">
                  <span dir="auto">{cycle.name ?? String(cycle.id ?? '')}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

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
        {(displayProfile.qualifications ?? []).length === 0 ? (
          <p className="muted tiny">
            {t('admin.teacherDomain.academic.qualificationsEmpty')}
            {displayProfile.qualifications_summary?.legacy_qualification
              ? ` — ${String(displayProfile.qualifications_summary.legacy_qualification)}`
              : ''}
          </p>
        ) : (
          <ul className="teacher-domain-profile__list">
            {(displayProfile.qualifications ?? []).map((q, index) => (
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
        {(displayProfile.availability ?? []).length === 0 ? (
          <p className="muted tiny">{t('admin.teacherDomain.academic.availabilityEmpty')}</p>
        ) : (
          <ul className="teacher-domain-profile__list">
            {(displayProfile.availability ?? []).map((slot, index) => {
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
                displayProfile.operational_derived?.current_assignments?.length ??
                  displayProfile.current_assignments?.length ??
                  0,
              ),
            },
            {
              label: t('admin.teacherDomain.academic.derivedWorkload'),
              value: String(
                (
                  displayProfile.operational_derived?.derived_workload as {
                    assigned_weekly_volume?: number;
                  }
                )?.assigned_weekly_volume ??
                  (
                    displayProfile.derived_workload as {
                      assigned_weekly_volume?: number;
                    }
                  )?.assigned_weekly_volume ??
                  t('common.dash'),
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
