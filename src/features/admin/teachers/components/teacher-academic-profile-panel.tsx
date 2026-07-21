'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Badge, Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useTeacherOptions } from '@/features/admin/academic-setup/hooks/use-teacher-options';
import { fetchAdminAcademicContextOptions } from '@/features/academic-context/api/academic-context-api';
import { updateTeacherAcademicProfile } from '@/features/admin/teachers/api/teacher-domain-api';
import {
  canEditAcademicLimits,
  canEditAcademicProfile,
  hasAllowedAction,
} from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { mapTeacherDomainError } from '@/features/admin/teachers/utils/teacher-domain-errors';
import {
  countSpecifiedDimensions,
  completenessStateLabelKey,
  eligibleLevelsFromProfile,
  eligibleSubjectsFromProfile,
  enrichMismatchWithAssignment,
  refIds,
  resolveAcademicCompleteness,
  resolveAssignmentMismatchSummary,
  resolveEligibilityDimensions,
  translateCompletenessWarning,
  translateMismatchReason,
  validateWorkloadDraft,
} from '@/features/admin/teachers/utils/teacher-academic-profile-present';
import { resolveTeacherTypeLabelFromCode } from '@/features/admin/staff/utils/staff-center-present';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { Level, Subject } from '@/types/class';
import type { TeachingLanguageOption } from '@/types/academic-context';
import type {
  TeacherAcademicProfile,
  TeacherAcademicProfileWritePayload,
} from '@/types/teacher-domain';

type OptionItem = { id: number; name: string; group?: string };

function cycleIdsFromProfile(profile: TeacherAcademicProfile): number[] {
  return refIds(profile.eligibility?.cycles);
}

function cycleRefsFromProfile(
  profile: TeacherAcademicProfile,
): Array<{ id?: number; name?: string }> {
  return profile.eligibility?.cycles ?? [];
}

function mergeOptionCatalog(
  options: OptionItem[],
  current: Array<{ id?: number | null; name?: string | null }>,
): OptionItem[] {
  const map = new Map<number, OptionItem>();
  for (const option of options) map.set(option.id, option);
  for (const row of current) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0 || map.has(id)) continue;
    map.set(id, { id, name: row.name?.trim() || String(id) });
  }
  return Array.from(map.values());
}

function BadgeList({
  items,
  emptyLabel,
}: {
  items: Array<{ id?: number | null; name?: string | null }>;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="muted tiny">{emptyLabel}</p>;
  }
  return (
    <div className="teacher-domain-profile__dim-badges">
      {items.map((item) => (
        <Badge key={item.id ?? item.name} tone="slate">
          <span dir="auto">{item.name ?? String(item.id ?? '')}</span>
        </Badge>
      ))}
    </div>
  );
}

function MultiSelectEditor({
  catalog,
  selectedIds,
  disabled,
  loading,
  emptyOptionsLabel,
  onToggle,
}: {
  catalog: OptionItem[];
  selectedIds: number[];
  disabled: boolean;
  loading: boolean;
  emptyOptionsLabel: string;
  onToggle: (id: number) => void;
}) {
  const t = useT();
  if (loading && catalog.length === 0) {
    return <p className="tiny muted">{t('common.loading')}</p>;
  }
  if (catalog.length === 0) {
    return <p className="tiny muted">{emptyOptionsLabel}</p>;
  }

  const grouped = new Map<string | null, OptionItem[]>();
  for (const item of catalog) {
    const key = item.group ?? null;
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  return (
    <ul className="teacher-domain-profile__dim-options" role="group">
      {Array.from(grouped.entries()).map(([group, items]) => (
        <li key={group ?? '__all'} className="teacher-domain-profile__dim-group">
          {group ? (
            <p className="tiny muted teacher-domain-profile__dim-group-label" dir="auto">
              {group}
            </p>
          ) : null}
          <ul className="teacher-domain-profile__dim-options">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <li key={item.id}>
                  <label className="teacher-domain-profile__dim-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggle(item.id)}
                    />
                    <span dir="auto">{item.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
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
  const saveGenerationRef = useRef(0);

  useEffect(() => {
    setDisplayProfile(profile);
  }, [profile]);

  const eligibility = displayProfile.eligibility;
  const limits = displayProfile.limits;
  const dims = resolveEligibilityDimensions(displayProfile);
  const completeness = resolveAcademicCompleteness(displayProfile);
  const completenessWarnings = displayProfile.completeness_warnings ?? [];
  const mismatch = resolveAssignmentMismatchSummary(displayProfile);

  const canEdit = canEditAcademicProfile(displayProfile.allowed_actions);
  const canEditLimits = canEditAcademicLimits(displayProfile.allowed_actions);
  const canManageQualifications = hasAllowedAction(
    displayProfile.allowed_actions,
    'manage_qualifications',
  ) || hasAllowedAction(displayProfile.allowed_actions, 'can_manage_qualifications');
  const canManageAvailability = hasAllowedAction(
    displayProfile.allowed_actions,
    'manage_availability',
  ) || hasAllowedAction(displayProfile.allowed_actions, 'can_manage_availability');

  const specialization =
    displayProfile.specialization ?? eligibility?.specialization ?? null;
  const teacherType = displayProfile.teacher_type ?? eligibility?.teacher_type ?? null;
  const subjectRefs = eligibleSubjectsFromProfile(eligibility);
  const levelRefs = eligibleLevelsFromProfile(eligibility);
  const languageRefs = eligibility?.teaching_languages ?? [];
  const currentCycleRefs = cycleRefsFromProfile(displayProfile);
  const currentCycleIds = useMemo(
    () => cycleIdsFromProfile(displayProfile),
    [displayProfile],
  );
  const currentSubjectIds = useMemo(() => refIds(subjectRefs), [subjectRefs]);
  const currentLevelIds = useMemo(() => refIds(levelRefs), [levelRefs]);
  const currentLanguageIds = useMemo(() => refIds(languageRefs), [languageRefs]);

  // --- Identity ---
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [draftSpecialization, setDraftSpecialization] = useState('');
  const [draftTeacherType, setDraftTeacherType] = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const teacherOptionsState = useTeacherOptions(editingIdentity);
  const teacherTypeOptions = teacherOptionsState.options?.teacherTypes ?? [];
  const specializationMax =
    teacherOptionsState.options?.constraints.specialization?.max ?? undefined;

  // --- Subjects ---
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [draftSubjectIds, setDraftSubjectIds] = useState<number[]>([]);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [subjectSaveError, setSubjectSaveError] = useState<string | null>(null);
  const subjectsState = useAdminResource<Subject[]>(
    editingSubjects ? endpoints.admin.subjects : null,
    editingSubjects ? { page_size: 200, active: 'true' } : undefined,
  );

  // --- Cycles ---
  const [editingCycles, setEditingCycles] = useState(false);
  const [draftCycleIds, setDraftCycleIds] = useState<number[]>([]);
  const [savingCycles, setSavingCycles] = useState(false);
  const [cycleSaveError, setCycleSaveError] = useState<string | null>(null);
  const cycleOptionsState = useLevelOptions(editingCycles, { include_enabled: 'true' });
  const cycleOptions = cycleOptionsState.options?.cycles ?? [];

  // --- Levels ---
  const [editingLevels, setEditingLevels] = useState(false);
  const [draftLevelIds, setDraftLevelIds] = useState<number[]>([]);
  const [savingLevels, setSavingLevels] = useState(false);
  const [levelSaveError, setLevelSaveError] = useState<string | null>(null);
  const levelsState = useAdminResource<Level[]>(
    editingLevels ? endpoints.admin.levels : null,
    editingLevels ? { page_size: 200, active: 'true' } : undefined,
  );

  // --- Languages ---
  const [editingLanguages, setEditingLanguages] = useState(false);
  const [draftLanguageIds, setDraftLanguageIds] = useState<number[]>([]);
  const [savingLanguages, setSavingLanguages] = useState(false);
  const [languageSaveError, setLanguageSaveError] = useState<string | null>(null);
  const [languageOptions, setLanguageOptions] = useState<TeachingLanguageOption[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);

  // --- Limits ---
  const [editingLimits, setEditingLimits] = useState(false);
  const [draftWeeklyTarget, setDraftWeeklyTarget] = useState('');
  const [draftWeeklyMax, setDraftWeeklyMax] = useState('');
  const [draftDailyMax, setDraftDailyMax] = useState('');
  const [draftContinuous, setDraftContinuous] = useState('');
  const [draftPreferCompact, setDraftPreferCompact] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);

  // --- Roles ---
  const [editingRoles, setEditingRoles] = useState(false);
  const [draftHead, setDraftHead] = useState(false);
  const [draftSubjectCoord, setDraftSubjectCoord] = useState(false);
  const [draftLevelCoord, setDraftLevelCoord] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingLanguages) return;
    let active = true;
    setLanguagesLoading(true);
    void fetchAdminAcademicContextOptions().then((res) => {
      if (!active) return;
      setLanguagesLoading(false);
      if (!res.success) {
        setLanguageOptions([]);
        return;
      }
      setLanguageOptions(res.data.teaching_languages ?? []);
    });
    return () => {
      active = false;
    };
  }, [editingLanguages]);

  const subjectCatalog = useMemo(() => {
    const rows = (subjectsState.data ?? []).filter((s) => s.active !== false);
    return mergeOptionCatalog(
      rows.map((s) => ({ id: s.id, name: s.name })),
      subjectRefs,
    );
  }, [subjectsState.data, subjectRefs]);

  const cycleCatalog = useMemo(() => {
    return mergeOptionCatalog(
      cycleOptions.map((c) => ({ id: c.id, name: c.name })),
      currentCycleRefs,
    );
  }, [cycleOptions, currentCycleRefs]);

  const levelCatalog = useMemo(() => {
    const rows = (levelsState.data ?? []).filter((l) => l.active !== false);
    return mergeOptionCatalog(
      rows.map((l) => ({
        id: l.id,
        name: l.display_name || l.name,
        group: l.cycle?.name,
      })),
      levelRefs,
    );
  }, [levelsState.data, levelRefs]);

  const languageCatalog = useMemo(() => {
    return mergeOptionCatalog(
      languageOptions.map((l) => ({
        id: l.id,
        name: l.display_label || l.name,
      })),
      languageRefs,
    );
  }, [languageOptions, languageRefs]);

  async function applyPartialUpdate(
    payload: TeacherAcademicProfileWritePayload,
    opts: {
      successKey: string;
      setSaving: (v: boolean) => void;
      setError: (v: string | null) => void;
      onSuccess: () => void;
      generation: number;
    },
  ) {
    opts.setSaving(true);
    opts.setError(null);
    const res = await updateTeacherAcademicProfile(displayProfile.teacher_id, payload);
    opts.setSaving(false);
    if (opts.generation !== saveGenerationRef.current) return;
    if (!res.success) {
      const message = mapTeacherDomainError(res.error, t);
      opts.setError(message);
      toast.error(message);
      return;
    }
    setDisplayProfile(res.data);
    onProfileUpdated?.(res.data);
    opts.onSuccess();
    toast.success(t(opts.successKey));
  }

  function startIdentityEdit() {
    if (!canEdit || savingIdentity) return;
    setDraftSpecialization(specialization ?? '');
    setDraftTeacherType(teacherType ?? '');
    setIdentityError(null);
    setEditingIdentity(true);
  }

  function cancelIdentityEdit() {
    if (savingIdentity) return;
    setEditingIdentity(false);
    setIdentityError(null);
  }

  async function saveIdentity() {
    if (!canEdit || savingIdentity) return;
    const generation = ++saveGenerationRef.current;
    const payload: TeacherAcademicProfileWritePayload = {
      specialization: draftSpecialization.trim() || null,
    };
    if (draftTeacherType.trim()) {
      payload.teacher_type = draftTeacherType.trim();
    }
    await applyPartialUpdate(payload, {
      successKey: 'admin.teacherDomain.academic.identitySaveSuccess',
      setSaving: setSavingIdentity,
      setError: setIdentityError,
      onSuccess: () => setEditingIdentity(false),
      generation,
    });
  }

  function startSubjectsEdit() {
    if (!canEdit || savingSubjects) return;
    setDraftSubjectIds(currentSubjectIds);
    setSubjectSaveError(null);
    setEditingSubjects(true);
  }

  function cancelSubjectsEdit() {
    if (savingSubjects) return;
    setDraftSubjectIds(currentSubjectIds);
    setSubjectSaveError(null);
    setEditingSubjects(false);
  }

  async function saveSubjects() {
    if (!canEdit || savingSubjects) return;
    const generation = ++saveGenerationRef.current;
    await applyPartialUpdate(
      { eligible_subject_ids: draftSubjectIds },
      {
        successKey: 'admin.teacherDomain.academic.subjectsSaveSuccess',
        setSaving: setSavingSubjects,
        setError: setSubjectSaveError,
        onSuccess: () => setEditingSubjects(false),
        generation,
      },
    );
  }

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

  async function saveCycles() {
    if (!canEdit || savingCycles) return;
    const generation = ++saveGenerationRef.current;
    await applyPartialUpdate(
      { eligible_cycle_ids: draftCycleIds },
      {
        successKey: 'admin.teacherDomain.academic.cyclesSaveSuccess',
        setSaving: setSavingCycles,
        setError: setCycleSaveError,
        onSuccess: () => setEditingCycles(false),
        generation,
      },
    );
  }

  function startLevelsEdit() {
    if (!canEdit || savingLevels) return;
    setDraftLevelIds(currentLevelIds);
    setLevelSaveError(null);
    setEditingLevels(true);
  }

  function cancelLevelsEdit() {
    if (savingLevels) return;
    setDraftLevelIds(currentLevelIds);
    setLevelSaveError(null);
    setEditingLevels(false);
  }

  async function saveLevels() {
    if (!canEdit || savingLevels) return;
    const generation = ++saveGenerationRef.current;
    await applyPartialUpdate(
      { eligible_level_ids: draftLevelIds },
      {
        successKey: 'admin.teacherDomain.academic.levelsSaveSuccess',
        setSaving: setSavingLevels,
        setError: setLevelSaveError,
        onSuccess: () => setEditingLevels(false),
        generation,
      },
    );
  }

  function startLanguagesEdit() {
    if (!canEdit || savingLanguages) return;
    setDraftLanguageIds(currentLanguageIds);
    setLanguageSaveError(null);
    setEditingLanguages(true);
  }

  function cancelLanguagesEdit() {
    if (savingLanguages) return;
    setDraftLanguageIds(currentLanguageIds);
    setLanguageSaveError(null);
    setEditingLanguages(false);
  }

  async function saveLanguages() {
    if (!canEdit || savingLanguages) return;
    const generation = ++saveGenerationRef.current;
    await applyPartialUpdate(
      { teaching_language_ids: draftLanguageIds },
      {
        successKey: 'admin.teacherDomain.academic.languagesSaveSuccess',
        setSaving: setSavingLanguages,
        setError: setLanguageSaveError,
        onSuccess: () => setEditingLanguages(false),
        generation,
      },
    );
  }

  function startLimitsEdit() {
    if (!canEditLimits || savingLimits) return;
    setDraftWeeklyTarget(
      limits?.weekly_hours_target != null ? String(limits.weekly_hours_target) : '',
    );
    setDraftWeeklyMax(
      limits?.weekly_hours_max != null ? String(limits.weekly_hours_max) : '',
    );
    setDraftDailyMax(
      limits?.daily_hours_max != null ? String(limits.daily_hours_max) : '',
    );
    setDraftContinuous(
      limits?.max_continuous_minutes != null
        ? String(limits.max_continuous_minutes)
        : '',
    );
    setDraftPreferCompact(Boolean(limits?.prefer_compact_schedule));
    setLimitsError(null);
    setEditingLimits(true);
  }

  function cancelLimitsEdit() {
    if (savingLimits) return;
    setEditingLimits(false);
    setLimitsError(null);
  }

  async function saveLimits() {
    if (!canEditLimits || savingLimits) return;
    const validated = validateWorkloadDraft({
      weeklyHoursTarget: draftWeeklyTarget,
      weeklyHoursMax: draftWeeklyMax,
      dailyHoursMax: draftDailyMax,
      maxContinuousMinutes: draftContinuous,
    });
    if (!validated.ok) {
      const message = mapTeacherDomainError(
        { code: validated.code, message: '', details: {} },
        t,
      );
      setLimitsError(message);
      toast.error(message);
      return;
    }
    const generation = ++saveGenerationRef.current;
    await applyPartialUpdate(
      {
        ...validated.payload,
        prefer_compact_schedule: draftPreferCompact,
      },
      {
        successKey: 'admin.teacherDomain.academic.limitsSaveSuccess',
        setSaving: setSavingLimits,
        setError: setLimitsError,
        onSuccess: () => setEditingLimits(false),
        generation,
      },
    );
  }

  function startRolesEdit() {
    if (!canEdit || savingRoles) return;
    setDraftHead(Boolean(eligibility?.eligible_as_head_teacher));
    setDraftSubjectCoord(Boolean(eligibility?.eligible_as_subject_coordinator));
    setDraftLevelCoord(Boolean(eligibility?.eligible_as_level_coordinator));
    setRolesError(null);
    setEditingRoles(true);
  }

  function cancelRolesEdit() {
    if (savingRoles) return;
    setEditingRoles(false);
    setRolesError(null);
  }

  async function saveRoles() {
    if (!canEdit || savingRoles) return;
    const generation = ++saveGenerationRef.current;
    await applyPartialUpdate(
      {
        eligible_as_head_teacher: draftHead,
        eligible_as_subject_coordinator: draftSubjectCoord,
        eligible_as_level_coordinator: draftLevelCoord,
      },
      {
        successKey: 'admin.teacherDomain.academic.rolesSaveSuccess',
        setSaving: setSavingRoles,
        setError: setRolesError,
        onSuccess: () => setEditingRoles(false),
        generation,
      },
    );
  }

  function toggleId(
    setter: Dispatch<SetStateAction<number[]>>,
    id: number,
    disabled: boolean,
  ) {
    if (disabled) return;
    setter((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  const specifiedCount = countSpecifiedDimensions(dims);
  const mismatchItems =
    mismatch && mismatch.count > 0
      ? mismatch.warnings.map((warning) =>
          enrichMismatchWithAssignment(warning, displayProfile),
        )
      : [];

  return (
    <div className="teacher-domain-profile__stack">
      <Card>
        <SectionHead
          title={t('admin.teacherDomain.academic.summaryTitle')}
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
              label: t('admin.teacherDomain.academic.completenessLabel'),
              value: completeness
                ? t(completenessStateLabelKey(completeness.state))
                : t('common.dash'),
            },
            {
              label: t('admin.teacherDomain.academic.specifiedDimensions'),
              value: String(specifiedCount),
            },
            {
              label: t('admin.teacherDomain.academic.blocksAssignment'),
              value:
                completeness?.blocks_assignment === true
                  ? t('common.yes')
                  : t('admin.teacherDomain.academic.blocksAssignmentFalse'),
            },
          ]}
        />
        {completenessWarnings.length > 0 ? (
          <ul className="teacher-domain-profile__warning-list" aria-label={t('admin.teacherDomain.academic.warningsTitle')}>
            {completenessWarnings.map((warning) => (
              <li key={warning.code} className="teacher-domain-profile__warning-item">
                <Badge tone="amber">{t('admin.teacherDomain.academic.warningBadge')}</Badge>
                <span dir="auto">{translateCompletenessWarning(warning, t)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card>
        <SectionHead title={t('admin.teacherDomain.academic.eligibilityTitle')} />

        <div className="teacher-domain-profile__dim">
          <div className="teacher-domain-profile__dim-head">
            <span className="teacher-domain-profile__dim-label">
              {t('admin.teacherDomain.academic.specialization')}
            </span>
            {canEdit && !editingIdentity ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={t('admin.teacherDomain.academic.editIdentity')}
                onClick={startIdentityEdit}
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>
          {editingIdentity ? (
            <div className="teacher-domain-profile__dim-edit">
              <label className="field">
                <span>{t('admin.teacherDomain.academic.specialization')}</span>
                <input
                  value={draftSpecialization}
                  disabled={savingIdentity}
                  maxLength={specializationMax}
                  onChange={(e) => setDraftSpecialization(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('admin.teacherDomain.academic.teacherType')}</span>
                <select
                  value={draftTeacherType}
                  disabled={savingIdentity || teacherOptionsState.loading}
                  onChange={(e) => setDraftTeacherType(e.target.value)}
                >
                  <option value="">{t('common.dash')}</option>
                  {teacherTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              {identityError ? (
                <p className="tiny teacher-domain-profile__dim-error" role="alert">
                  {identityError}
                </p>
              ) : null}
              <div className="teacher-domain-profile__dim-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={savingIdentity}
                  onClick={() => void saveIdentity()}
                >
                  {savingIdentity ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={savingIdentity}
                  onClick={cancelIdentityEdit}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <DefinitionList
              items={[
                {
                  label: t('admin.teacherDomain.academic.specialization'),
                  value: specialization?.trim() || t('common.dash'),
                },
                {
                  label: t('admin.teacherDomain.academic.teacherType'),
                  value: resolveTeacherTypeLabelFromCode(teacherType, t),
                },
              ]}
            />
          )}
        </div>

        <div className="teacher-domain-profile__dim">
          <div className="teacher-domain-profile__dim-head">
            <span className="teacher-domain-profile__dim-label">
              {t('admin.teacherDomain.academic.eligibleSubjects')}
              {subjectRefs.length > 0 ? (
                <span className="muted tiny"> ({subjectRefs.length})</span>
              ) : null}
            </span>
            {canEdit && !editingSubjects ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={t('admin.teacherDomain.academic.editEligibleSubjects')}
                onClick={startSubjectsEdit}
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>
          {editingSubjects ? (
            <div className="teacher-domain-profile__dim-edit">
              <MultiSelectEditor
                catalog={subjectCatalog}
                selectedIds={draftSubjectIds}
                disabled={savingSubjects}
                loading={subjectsState.loading}
                emptyOptionsLabel={t('admin.teacherDomain.academic.subjectsOptionsEmpty')}
                onToggle={(id) => toggleId(setDraftSubjectIds, id, savingSubjects)}
              />
              {subjectSaveError ? (
                <p className="tiny teacher-domain-profile__dim-error" role="alert">
                  {subjectSaveError}
                </p>
              ) : null}
              <div className="teacher-domain-profile__dim-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={savingSubjects}
                  onClick={() => void saveSubjects()}
                >
                  {savingSubjects ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={savingSubjects}
                  onClick={cancelSubjectsEdit}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <BadgeList
              items={subjectRefs}
              emptyLabel={t('admin.teacherDomain.academic.eligibleSubjectsUnset')}
            />
          )}
        </div>

        <div className="teacher-domain-profile__dim teacher-domain-profile__cycles">
          <div className="teacher-domain-profile__dim-head teacher-domain-profile__cycles-head">
            <span className="teacher-domain-profile__dim-label teacher-domain-profile__cycles-label">
              {t('admin.teacherDomain.academic.eligibleCycles')}
            </span>
            {canEdit && !editingCycles ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={t('admin.teacherDomain.academic.editEligibleCycles')}
                onClick={startCycleEdit}
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>

          {editingCycles ? (
            <div className="teacher-domain-profile__dim-edit teacher-domain-profile__cycle-edit">
              <MultiSelectEditor
                catalog={cycleCatalog}
                selectedIds={draftCycleIds}
                disabled={savingCycles}
                loading={cycleOptionsState.loading}
                emptyOptionsLabel={t('admin.teacherDomain.academic.cyclesOptionsEmpty')}
                onToggle={(id) => toggleId(setDraftCycleIds, id, savingCycles)}
              />
              {cycleSaveError ? (
                <p
                  className="tiny teacher-domain-profile__dim-error teacher-domain-profile__cycle-error"
                  role="alert"
                >
                  {cycleSaveError}
                </p>
              ) : null}
              <div className="teacher-domain-profile__dim-actions teacher-domain-profile__cycle-actions">
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
          ) : (
            <BadgeList
              items={currentCycleRefs}
              emptyLabel={t('admin.teacherDomain.academic.eligibleCyclesUnset')}
            />
          )}
        </div>

        <div className="teacher-domain-profile__dim">
          <div className="teacher-domain-profile__dim-head">
            <span className="teacher-domain-profile__dim-label">
              {t('admin.teacherDomain.academic.eligibleLevels')}
            </span>
            {canEdit && !editingLevels ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={t('admin.teacherDomain.academic.editEligibleLevels')}
                onClick={startLevelsEdit}
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>
          {editingLevels ? (
            <div className="teacher-domain-profile__dim-edit">
              <MultiSelectEditor
                catalog={levelCatalog}
                selectedIds={draftLevelIds}
                disabled={savingLevels}
                loading={levelsState.loading}
                emptyOptionsLabel={t('admin.teacherDomain.academic.levelsOptionsEmpty')}
                onToggle={(id) => toggleId(setDraftLevelIds, id, savingLevels)}
              />
              {levelSaveError ? (
                <p className="tiny teacher-domain-profile__dim-error" role="alert">
                  {levelSaveError}
                </p>
              ) : null}
              <div className="teacher-domain-profile__dim-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={savingLevels}
                  onClick={() => void saveLevels()}
                >
                  {savingLevels ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={savingLevels}
                  onClick={cancelLevelsEdit}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <BadgeList
              items={levelRefs}
              emptyLabel={t('admin.teacherDomain.academic.eligibleLevelsUnset')}
            />
          )}
        </div>

        <div className="teacher-domain-profile__dim">
          <div className="teacher-domain-profile__dim-head">
            <span className="teacher-domain-profile__dim-label">
              {t('admin.teacherDomain.academic.teachingLanguages')}
            </span>
            {canEdit && !editingLanguages ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={t('admin.teacherDomain.academic.editTeachingLanguages')}
                onClick={startLanguagesEdit}
              >
                {t('common.edit')}
              </button>
            ) : null}
          </div>
          {editingLanguages ? (
            <div className="teacher-domain-profile__dim-edit">
              <MultiSelectEditor
                catalog={languageCatalog}
                selectedIds={draftLanguageIds}
                disabled={savingLanguages}
                loading={languagesLoading}
                emptyOptionsLabel={t('admin.teacherDomain.academic.languagesOptionsEmpty')}
                onToggle={(id) => toggleId(setDraftLanguageIds, id, savingLanguages)}
              />
              {languageSaveError ? (
                <p className="tiny teacher-domain-profile__dim-error" role="alert">
                  {languageSaveError}
                </p>
              ) : null}
              <div className="teacher-domain-profile__dim-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={savingLanguages}
                  onClick={() => void saveLanguages()}
                >
                  {savingLanguages ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={savingLanguages}
                  onClick={cancelLanguagesEdit}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <BadgeList
              items={languageRefs}
              emptyLabel={t('admin.teacherDomain.academic.teachingLanguagesUnset')}
            />
          )}
        </div>
      </Card>

      <Card>
        <SectionHead
          title={t('admin.teacherDomain.academic.limitsTitle')}
          action={
            canEditLimits && !editingLimits ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={t('admin.teacherDomain.academic.editLimits')}
                onClick={startLimitsEdit}
              >
                {t('common.edit')}
              </button>
            ) : null
          }
        />
        <p className="tiny muted">{t('admin.teacherDomain.academic.limitsReferenceHint')}</p>
        {editingLimits ? (
          <div className="teacher-domain-profile__dim-edit">
            <label className="field">
              <span>{t('admin.teacherDomain.academic.weeklyTarget')}</span>
              <input
                inputMode="decimal"
                value={draftWeeklyTarget}
                disabled={savingLimits}
                onChange={(e) => setDraftWeeklyTarget(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('admin.teacherDomain.academic.weeklyMax')}</span>
              <input
                inputMode="decimal"
                value={draftWeeklyMax}
                disabled={savingLimits}
                onChange={(e) => setDraftWeeklyMax(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('admin.teacherDomain.academic.dailyMax')}</span>
              <input
                inputMode="decimal"
                value={draftDailyMax}
                disabled={savingLimits}
                onChange={(e) => setDraftDailyMax(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('admin.teacherDomain.academic.maxContinuous')}</span>
              <input
                inputMode="numeric"
                value={draftContinuous}
                disabled={savingLimits}
                onChange={(e) => setDraftContinuous(e.target.value)}
              />
            </label>
            <label className="teacher-domain-profile__dim-option">
              <input
                type="checkbox"
                checked={draftPreferCompact}
                disabled={savingLimits}
                onChange={(e) => setDraftPreferCompact(e.target.checked)}
              />
              <span>{t('admin.teacherDomain.academic.preferCompact')}</span>
            </label>
            {limitsError ? (
              <p className="tiny teacher-domain-profile__dim-error" role="alert">
                {limitsError}
              </p>
            ) : null}
            <div className="teacher-domain-profile__dim-actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={savingLimits}
                onClick={() => void saveLimits()}
              >
                {savingLimits ? t('common.saving') : t('common.save')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={savingLimits}
                onClick={cancelLimitsEdit}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
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
                label: t('admin.teacherDomain.academic.dailyMax'),
                value:
                  limits?.daily_hours_max != null
                    ? String(limits.daily_hours_max)
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
        )}
      </Card>

      <Card>
        <SectionHead
          title={t('admin.teacherDomain.academic.rolesTitle')}
          action={
            canEdit && !editingRoles ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={t('admin.teacherDomain.academic.editRoles')}
                onClick={startRolesEdit}
              >
                {t('common.edit')}
              </button>
            ) : null
          }
        />
        <p className="tiny muted">{t('admin.teacherDomain.academic.rolesHint')}</p>
        {editingRoles ? (
          <div className="teacher-domain-profile__dim-edit">
            <label className="teacher-domain-profile__dim-option">
              <input
                type="checkbox"
                checked={draftHead}
                disabled={savingRoles}
                onChange={(e) => setDraftHead(e.target.checked)}
              />
              <span>{t('admin.teacherDomain.academic.headTeacher')}</span>
            </label>
            <label className="teacher-domain-profile__dim-option">
              <input
                type="checkbox"
                checked={draftSubjectCoord}
                disabled={savingRoles}
                onChange={(e) => setDraftSubjectCoord(e.target.checked)}
              />
              <span>{t('admin.teacherDomain.academic.subjectCoordinator')}</span>
            </label>
            <label className="teacher-domain-profile__dim-option">
              <input
                type="checkbox"
                checked={draftLevelCoord}
                disabled={savingRoles}
                onChange={(e) => setDraftLevelCoord(e.target.checked)}
              />
              <span>{t('admin.teacherDomain.academic.levelCoordinator')}</span>
            </label>
            {rolesError ? (
              <p className="tiny teacher-domain-profile__dim-error" role="alert">
                {rolesError}
              </p>
            ) : null}
            <div className="teacher-domain-profile__dim-actions">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={savingRoles}
                onClick={() => void saveRoles()}
              >
                {savingRoles ? t('common.saving') : t('common.save')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={savingRoles}
                onClick={cancelRolesEdit}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <DefinitionList
            items={[
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
        )}
      </Card>

      {mismatch && mismatch.count > 0 ? (
        <Card>
          <SectionHead title={t('admin.teacherDomain.academic.mismatchTitle')} />
          <p className="teacher-domain-profile__mismatch-alert" role="status">
            {t('admin.teacherDomain.academic.mismatchAlert', { count: mismatch.count })}
          </p>
          <ul className="teacher-domain-profile__list">
            {mismatchItems.map(({ warning, subjectName, className, state }) => {
              const reasons = (
                warning.reason_codes?.length
                  ? warning.reason_codes
                  : warning.reason_code
                    ? [warning.reason_code]
                    : []
              ).map((code) => translateMismatchReason(code, t));
              return (
                <li key={`${warning.assignment_id ?? 'x'}-${warning.reason_code ?? warning.code}`}>
                  <div className="teacher-domain-profile__mismatch-row">
                    {subjectName ? <strong dir="auto">{subjectName}</strong> : null}
                    {className ? (
                      <span className="muted" dir="auto">
                        {className}
                      </span>
                    ) : null}
                    {state ? <Badge tone="slate">{state}</Badge> : null}
                    {warning.assignment_id != null ? (
                      <Link
                        href={`/admin/teaching-assignments/${warning.assignment_id}`}
                        className="btn btn--ghost btn--sm"
                      >
                        {t('admin.teacherDomain.academic.openAssignment')}
                      </Link>
                    ) : null}
                  </div>
                  {reasons.length > 0 ? (
                    <span className="tiny muted" dir="auto">
                      {reasons.join(' · ')}
                    </span>
                  ) : warning.message ? (
                    <span className="tiny muted" dir="auto">
                      {warning.message}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

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
