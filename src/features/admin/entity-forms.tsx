'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildClassPayload,
  collectCyclesFromLevels,
  existingClassNamesForCanonicalScope,
  filterLevelsByCycleId,
  mapClassApiError,
  resolveAcademicYearId,
  resolveCycleIdForLevel,
  resolveDefaultClassAcademicYearId,
  resolveLevelAcademicCode,
  shouldReplaceSuggestedClassName,
  suggestNextCanonicalClassName,
} from '@/features/admin/class-form-utils';
import { ClassSubjectsField } from '@/features/admin/academic-setup/components/class-subjects-field';
import { CreateSchoolSubjectDrawer } from '@/features/admin/academic-setup/components/create-school-subject-drawer';
import { useSubjectOptions } from '@/features/admin/academic-setup/hooks/use-subject-options';
import {
  extractLevelEnabledOperationalSubjects,
  incompatibleNewSubjectIds,
  mergeSchoolSubjectsIntoClassOptions,
  partitionClassSubjectSelection,
  resolveClassSubjectIdsForSave,
} from '@/features/admin/academic-setup/utils/class-level-subjects';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { sortedLevels } from '@/features/admin/levels/utils/levels-list-utils';
import { AccountFieldsSection } from '@/features/admin/account/account-fields-section';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { mapAccountApiError } from '@/lib/account/account-errors';
import {
  applyAccountMutationToasts,
  resolveAccountMutationFeedback,
} from '@/lib/account/account-mutation-feedback';
import { buildAccountIdentityPayload } from '@/lib/account/account-utils';
import { getStudentDisplayName } from '@/lib/utils/student';
import { mapParentApiError } from '@/features/admin/parents/utils/map-parent-api-error';
import { ParentEmployeeLinkSection } from '@/features/admin/parents/components/parent-employee-link-section';
import { IdentityDocumentFields } from '@/features/admin/parents/components/identity-document-fields';
import { IdentityDocumentConflictAlert } from '@/features/admin/parents/components/identity-document-conflict-alert';
import {
  buildIdentityDocumentCreatePayload,
  emptyIdentityDocumentFormValues,
  validateIdentityDocumentForm,
  type IdentityDocumentFormValues,
} from '@/features/admin/parents/utils/identity-document';
import type { GuardianDuplicateMatch } from '@/types/student-360';
import type { Ref } from '@/types/api';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Student } from '@/types/student';
import type { Parent } from '@/types/parent';
import type { Teacher } from '@/types/teacher';
import type { AcademicTrack, TrackOptions } from '@/types/academic-setup';
import { TeacherSetupForm } from '@/features/admin/academic-setup/components/teacher-setup-form';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { StudentForm } from '@/features/admin/students/components/student-form';
import { CreateSchoolSubjectForm } from '@/features/admin/subjects/components/create-school-subject-form';
import { useRouter } from 'next/navigation';
import '@/features/admin/parents/components/parent-profile.css';

export { StudentForm };

function FormShell({
  children,
  saving,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  children: React.ReactNode;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const t = useT();
  return (
    <Card>
      <form className="col" style={{ gap: 12 }} onSubmit={onSubmit}>
        {children}
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : submitLabel ?? t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
    </label>
  );
}

export function ParentForm({
  parent,
  onSaved,
  onCancel,
}: {
  parent?: Parent;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const isCreate = parent == null;
  const [employeeLinkMode, setEmployeeLinkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(parent?.name ?? '');
  const [phone, setPhone] = useState(parent?.phone ?? '');
  const [email, setEmail] = useState(parent?.email ?? '');
  const [preferredLanguage, setPreferredLanguage] = useState(parent?.preferred_language ?? 'ar');
  const [notificationOptIn, setNotificationOptIn] = useState(parent?.notification_opt_in ?? true);
  const [identityDocument, setIdentityDocument] = useState<IdentityDocumentFormValues>(
    emptyIdentityDocumentFormValues(),
  );
  const [identityErrors, setIdentityErrors] = useState<
    ReturnType<typeof validateIdentityDocumentForm>
  >({});
  const [identityCandidates, setIdentityCandidates] = useState<GuardianDuplicateMatch[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (employeeLinkMode) return;
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const nextIdentityErrors = validateIdentityDocumentForm(identityDocument, t);
    if (Object.keys(nextIdentityErrors).length > 0) {
      setIdentityErrors(nextIdentityErrors);
      toast.error(t('errors.validationFailed'));
      return;
    }

    const identityPayload = buildIdentityDocumentCreatePayload(identityDocument);
    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      preferred_language: preferredLanguage,
      notification_opt_in: notificationOptIn,
      ...identityPayload,
    };
    setSaving(true);
    setIdentityCandidates([]);
    const res = parent
      ? await api.post(endpoints.admin.parentUpdate(parent.id), payload)
      : await api.post(endpoints.admin.parents, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.parentProfile.saveSuccess'));
      onSaved((res.data as Parent).id);
    } else if (!res.success) {
      const mapped = mapParentApiError(res.error, t);
      toast.error(mapped.message);
      if (mapped.identityConflict) {
        setIdentityCandidates(mapped.candidates ?? []);
      }
    }
  }

  if (isCreate && employeeLinkMode) {
    return (
      <Card>
        <div className="col" style={{ gap: 12 }}>
          <label className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={employeeLinkMode}
              onChange={(e) => setEmployeeLinkMode(e.target.checked)}
            />
            <span className="col" style={{ gap: 4 }}>
              <span className="tiny">{t('admin.parents.employeeLink.checkbox')}</span>
              <span className="tiny muted">{t('admin.parents.employeeLink.description')}</span>
            </span>
          </label>
          <ParentEmployeeLinkSection onLinked={onSaved} onCancel={onCancel} />
        </div>
      </Card>
    );
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      {isCreate ? (
        <label className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={employeeLinkMode}
            onChange={(e) => setEmployeeLinkMode(e.target.checked)}
          />
          <span className="col" style={{ gap: 4 }}>
            <span className="tiny">{t('admin.parents.employeeLink.checkbox')}</span>
            <span className="tiny muted">{t('admin.parents.employeeLink.description')}</span>
          </span>
        </label>
      ) : null}
      <Field label={t('admin.fullName')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.phone')}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={t('admin.email')}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      {isCreate ? (
        <div className="col" style={{ gap: 8 }}>
          <span className="tiny muted">{t('admin.identityDocument.sectionTitle')}</span>
          <IdentityDocumentFields
            values={identityDocument}
            errors={identityErrors}
            onChange={(patch) => {
              setIdentityErrors({});
              setIdentityCandidates([]);
              setIdentityDocument((prev) => ({ ...prev, ...patch }));
            }}
          />
          {identityCandidates.length > 0 ? (
            <IdentityDocumentConflictAlert
              candidates={identityCandidates}
              onSelectExisting={(candidate) => router.push(`/admin/parents/${candidate.id}`)}
            />
          ) : null}
        </div>
      ) : null}
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.preferredLanguage')}>
          <select className="input" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}>
            <option value="ar">{t('admin.preferredLanguages.ar')}</option>
            <option value="fr">{t('admin.preferredLanguages.fr')}</option>
            <option value="en">{t('admin.preferredLanguages.en')}</option>
            <option value="es">{t('admin.preferredLanguages.es')}</option>
          </select>
        </Field>
        <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 20 }}>
          <input
            type="checkbox"
            checked={notificationOptIn}
            onChange={(e) => setNotificationOptIn(e.target.checked)}
          />
          <span className="tiny">{t('admin.notificationOptIn')}</span>
        </label>
      </div>
    </FormShell>
  );
}

export function TeacherForm({
  teacher,
  onSaved,
  onCancel,
}: {
  teacher?: Teacher;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const user = useSession();
  const canManageAssignments = canManageTeachingAssignments(user);

  return (
    <TeacherSetupForm
      teacher={teacher}
      layout="page"
      canManageAssignments={canManageAssignments}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}

export interface ClassDetail {
  id: number;
  name: string;
  code: string | null;
  level: Ref | null;
  level_id?: number;
  track?: Ref | null;
  track_id?: number | null;
  academic_year: string | Ref | { id: number; name: string } | null;
  academic_year_id?: number;
  student_count: number;
  capacity: number | null;
  room_number?: string | null;
  teachers: Ref[];
  subjects: import('@/types/class').Subject[];
  teacher_ids?: number[];
  subject_ids?: number[];
  effective_subjects_count?: number;
  subjects_count?: number;
  inherited_level_subjects_count?: number;
  inherited_track_subjects_count?: number;
  direct_class_subjects_count?: number;
  excluded_subjects_count?: number;
  subjects_source?: import('@/types/class').ClassSubjectsSource;
  missing_teacher_assignments_count?: number;
  school?: Ref;
  status: string;
}

export function ClassForm({
  cls,
  onSaved,
  onCancel,
}: {
  cls?: ClassDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const isCreating = cls?.id == null;
  const levelsState = useAdminResource<Level[]>(endpoints.admin.levels);
  const classesState = useAdminResource<SchoolClass[]>(
    isCreating ? endpoints.admin.classes : null,
  );
  const studentOptionsState = useStudentOptions();
  const schoolSubjectsState = useAdminResource<Subject[]>(endpoints.admin.subjects, {
    page_size: 500,
  });
  const trackOptionsState = useAdminResource<TrackOptions>(endpoints.admin.trackOptions);
  const teachersState = useResource<Teacher[]>(endpoints.admin.teachers, { page_size: 200 });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(cls?.name ?? '');
  const [nameManuallyEdited, setNameManuallyEdited] = useState(!isCreating && Boolean(cls?.name));
  const [lastSuggestedName, setLastSuggestedName] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [levelId, setLevelId] = useState(String(cls?.level_id ?? cls?.level?.id ?? ''));
  const [trackId, setTrackId] = useState(String(cls?.track_id ?? cls?.track?.id ?? ''));
  const [academicYearId, setAcademicYearId] = useState(resolveAcademicYearId(cls));
  const [capacity, setCapacity] = useState(cls?.capacity != null ? String(cls.capacity) : '');
  const [room, setRoom] = useState(cls?.room_number ?? '');
  const [teacherIds, setTeacherIds] = useState<number[]>(
    cls?.teacher_ids ?? cls?.teachers?.map((te) => te.id) ?? [],
  );
  const initialSubjectIds = useMemo(
    () => cls?.subject_ids ?? cls?.subjects?.map((s) => s.id) ?? [],
    [cls],
  );
  const [subjectIds, setSubjectIds] = useState<number[]>(initialSubjectIds);
  const [subjectsTouched, setSubjectsTouched] = useState(false);
  const [reconcileSubjectsAfterLevelChange, setReconcileSubjectsAfterLevelChange] = useState(false);
  const [createAutoSubjectsKey, setCreateAutoSubjectsKey] = useState('');
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);

  const allLevels = useMemo(() => sortedLevels(levelsState.data ?? []), [levelsState.data]);
  const cycles = useMemo(() => collectCyclesFromLevels(allLevels), [allLevels]);
  const levelsForCycle = useMemo(
    () => (cycleId ? filterLevelsByCycleId(allLevels, cycleId) : []),
    [allLevels, cycleId],
  );
  const academicYears = studentOptionsState.options?.academicYears ?? [];

  const legacyCatalog = useMemo(
    () =>
      (cls?.subjects ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code ?? null,
      })),
    [cls?.subjects],
  );

  const trackLevels = useMemo(
    () => new Set((trackOptionsState.data?.levels ?? []).filter((l) => l.supports_tracks).map((l) => l.id)),
    [trackOptionsState.data],
  );
  const levelSupportsTracks = levelId ? trackLevels.has(Number(levelId)) : false;
  const tracksState = useAdminResource<AcademicTrack[]>(
    levelSupportsTracks ? endpoints.admin.tracks : null,
    levelId ? { level_id: Number(levelId), limit: 200 } : undefined,
  );
  const tracksForLevel = tracksState.data ?? [];
  const parsedLevelId = levelId ? Number(levelId) : null;
  const parsedTrackId = trackId.trim() ? Number(trackId) : null;
  const levelDetailState = useAdminResource<Level>(
    parsedLevelId != null && Number.isFinite(parsedLevelId)
      ? endpoints.admin.level(parsedLevelId)
      : null,
  );
  const subjectOptionsState = useSubjectOptions(
    parsedLevelId != null && Number.isFinite(parsedLevelId) ? parsedLevelId : null,
    levelSupportsTracks ? parsedTrackId : null,
  );
  const levelSubjectOptions = useMemo(() => {
    const fromRef = extractLevelEnabledOperationalSubjects(subjectOptionsState.options);
    if (parsedLevelId == null || !Number.isFinite(parsedLevelId)) return fromRef;
    const levelSubjects = levelDetailState.data?.subjects ?? [];
    return mergeSchoolSubjectsIntoClassOptions(
      fromRef,
      [...levelSubjects, ...(schoolSubjectsState.data ?? [])],
      parsedLevelId,
      levelSubjects.map((s) => s.id),
    );
  }, [
    subjectOptionsState.options,
    parsedLevelId,
    levelDetailState.data?.subjects,
    schoolSubjectsState.data,
  ]);
  const subjectsFieldLoading =
    subjectOptionsState.loading ||
    schoolSubjectsState.loading ||
    (parsedLevelId != null && levelDetailState.loading);
  const { legacy: legacySubjects } = useMemo(
    () => partitionClassSubjectSelection(subjectIds, levelSubjectOptions, legacyCatalog),
    [subjectIds, levelSubjectOptions, legacyCatalog],
  );

  // Prefill cycle from level (create stub / edit) once levels arrive.
  useEffect(() => {
    if (!allLevels.length || !levelId || cycleId) return;
    const level = allLevels.find((l) => String(l.id) === levelId);
    if (level) setCycleId(resolveCycleIdForLevel(level));
  }, [allLevels, levelId, cycleId]);

  // Default academic year from options when creating.
  useEffect(() => {
    if (!isCreating || academicYearId) return;
    if (studentOptionsState.loading) return;
    const years = studentOptionsState.options?.academicYears ?? [];
    const next = resolveDefaultClassAcademicYearId(years);
    if (next) setAcademicYearId(next);
  }, [
    isCreating,
    academicYearId,
    studentOptionsState.loading,
    studentOptionsState.options?.academicYears,
  ]);

  // Suggest next canonical class name after year + level selection (create only).
  useEffect(() => {
    if (!isCreating) return;
    if (!levelId || !academicYearId || classesState.loading) {
      return;
    }
    const level = allLevels.find((l) => String(l.id) === levelId);
    const academicCode = resolveLevelAcademicCode(level);
    if (!academicCode) {
      if (
        shouldReplaceSuggestedClassName(name, lastSuggestedName, nameManuallyEdited) &&
        name
      ) {
        setName('');
        setLastSuggestedName('');
        setNameManuallyEdited(false);
      }
      return;
    }
    const existing = existingClassNamesForCanonicalScope(classesState.data, {
      levelId,
      academicYearId,
    });
    const suggestion = suggestNextCanonicalClassName(academicCode, existing);
    if (!suggestion) return;
    if (
      !shouldReplaceSuggestedClassName(name, lastSuggestedName, nameManuallyEdited)
    ) {
      return;
    }
    if (name === suggestion && lastSuggestedName === suggestion) return;
    setName(suggestion);
    setLastSuggestedName(suggestion);
    setNameManuallyEdited(false);
  }, [
    isCreating,
    levelId,
    academicYearId,
    allLevels,
    classesState.loading,
    classesState.data,
    name,
    lastSuggestedName,
    nameManuallyEdited,
  ]);

  // On create: select all level subjects when level/track subject options settle.
  useEffect(() => {
    if (!isCreating || !parsedLevelId || subjectsFieldLoading) return;
    if (subjectOptionsState.error) return;
    const key = `${levelId}:${levelSupportsTracks ? trackId : ''}`;
    if (createAutoSubjectsKey === key) return;
    setSubjectIds(levelSubjectOptions.map((s) => s.id));
    setSubjectsTouched(true);
    setCreateAutoSubjectsKey(key);
  }, [
    isCreating,
    parsedLevelId,
    levelId,
    trackId,
    levelSupportsTracks,
    subjectsFieldLoading,
    subjectOptionsState.error,
    levelSubjectOptions,
    createAutoSubjectsKey,
  ]);

  function handleSubjectCreated(subjectId: number) {
    schoolSubjectsState.reload();
    levelDetailState.reload();
    subjectOptionsState.reload();
    setSubjectsTouched(true);
    setSubjectIds((prev) => (prev.includes(subjectId) ? prev : [...prev, subjectId]));
  }

  useEffect(() => {
    if (isCreating) return;
    if (!reconcileSubjectsAfterLevelChange || subjectOptionsState.loading) return;
    if (subjectOptionsState.error) {
      setReconcileSubjectsAfterLevelChange(false);
      return;
    }
    const toClear = incompatibleNewSubjectIds(subjectIds, levelSubjectOptions, initialSubjectIds);
    if (toClear.length > 0) {
      if (!window.confirm(t('admin.academicSetup.levelSubjectsClearConfirm'))) {
        setReconcileSubjectsAfterLevelChange(false);
        return;
      }
      const clearSet = new Set(toClear);
      setSubjectIds((prev) => prev.filter((id) => !clearSet.has(id)));
      setSubjectsTouched(true);
    }
    setReconcileSubjectsAfterLevelChange(false);
  }, [
    isCreating,
    reconcileSubjectsAfterLevelChange,
    subjectOptionsState.loading,
    subjectOptionsState.error,
    subjectIds,
    levelSubjectOptions,
    initialSubjectIds,
    t,
  ]);

  function handleCycleChange(nextCycleId: string) {
    if (nextCycleId === cycleId) return;
    const nextLevels = filterLevelsByCycleId(allLevels, nextCycleId);
    const stillValid = !levelId || nextLevels.some((l) => String(l.id) === levelId);
    if (!stillValid && trackId.trim() && !isCreating) {
      if (!window.confirm(t('admin.academicSetup.trackClearConfirm'))) {
        return;
      }
    }
    setCycleId(nextCycleId);
    if (!stillValid) {
      setLevelId('');
      setTrackId('');
      if (isCreating) {
        setCreateAutoSubjectsKey('');
        setSubjectIds([]);
        if (shouldReplaceSuggestedClassName(name, lastSuggestedName, nameManuallyEdited)) {
          setName('');
          setLastSuggestedName('');
          setNameManuallyEdited(false);
        }
      } else {
        setReconcileSubjectsAfterLevelChange(true);
      }
    }
  }

  function handleLevelChange(nextLevelId: string) {
    if (nextLevelId === levelId) return;
    if (trackId && nextLevelId !== levelId) {
      const hadTrack = trackId.trim().length > 0;
      if (hadTrack && !isCreating && !window.confirm(t('admin.academicSetup.trackClearConfirm'))) {
        return;
      }
      setTrackId('');
    }
    setLevelId(nextLevelId);
    if (isCreating) {
      setCreateAutoSubjectsKey('');
    } else {
      setReconcileSubjectsAfterLevelChange(true);
    }
  }

  function handleTrackChange(nextTrackId: string) {
    if (
      !isCreating &&
      trackId &&
      nextTrackId !== trackId &&
      !window.confirm(t('admin.academicSetup.trackChangeWarning'))
    ) {
      return;
    }
    setTrackId(nextTrackId);
    if (isCreating) {
      setCreateAutoSubjectsKey('');
    } else {
      setReconcileSubjectsAfterLevelChange(true);
    }
  }

  function handleNameChange(value: string) {
    setName(value);
    setNameManuallyEdited(true);
  }

  function toggleId(id: number, list: number[], set: (v: number[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function toggleSubjectId(id: number) {
    setSubjectsTouched(true);
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAllSubjects() {
    setSubjectsTouched(true);
    setSubjectIds(levelSubjectOptions.map((s) => s.id));
  }

  function clearAllSubjects() {
    setSubjectsTouched(true);
    setSubjectIds([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !levelId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    if (isCreating) {
      const level = allLevels.find((l) => String(l.id) === levelId);
      if (!resolveLevelAcademicCode(level)) {
        toast.error(t('admin.classMissingAcademicCode'));
        return;
      }
    }
    const safeSubjectIds = subjectsTouched
      ? resolveClassSubjectIdsForSave(subjectIds, levelSubjectOptions, initialSubjectIds)
      : subjectIds;
    const payload = buildClassPayload({
      name,
      levelId,
      trackId,
      academicYearId,
      capacity,
      room,
      teacherIds,
      subjectIds: safeSubjectIds,
      subjectsTouched,
      creating: isCreating,
    });
    setSaving(true);
    const res = isCreating
      ? await api.post(endpoints.admin.classes, payload)
      : await api.post(endpoints.admin.classUpdate(cls!.id), payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as ClassDetail).id);
    } else if (!res.success) {
      toast.error(mapClassApiError(res.error, t));
    }
  }

  const selectedLevel = allLevels.find((l) => String(l.id) === levelId);
  const selectedAcademicCode = resolveLevelAcademicCode(selectedLevel);
  const levelSelectDisabled = !cycleId;
  const levelEmptyHint = !cycleId
    ? t('academicContext.placeholders.chooseCycleFirst')
    : levelsForCycle.length === 0
      ? t('admin.classNoLevelsForCycle')
      : null;

  return (
    <>
      <FormShell
        saving={saving}
        onSubmit={submit}
        onCancel={onCancel}
        submitLabel={isCreating ? t('admin.createClass') : undefined}
      >
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <Field label={t('academicContext.fields.academicYear')}>
            {studentOptionsState.loading && academicYears.length === 0 ? (
              <span className="tiny muted" aria-busy="true">
                {t('common.loading')}
              </span>
            ) : academicYears.length === 0 ? (
              <span className="tiny muted" role="status">
                {t('admin.classNoAcademicYears')}
              </span>
            ) : (
              <select
                className="input"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                required={isCreating}
                aria-label={t('academicContext.fields.academicYear')}
              >
                <option value="">{t('academicContext.placeholders.academicYear')}</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('academicContext.fields.cycle')}>
            {levelsState.loading && cycles.length === 0 ? (
              <span className="tiny muted" aria-busy="true">
                {t('common.loading')}
              </span>
            ) : cycles.length === 0 ? (
              <span className="tiny muted" role="status">
                {t('admin.classNoCycles')}
              </span>
            ) : (
              <select
                className="input"
                value={cycleId}
                onChange={(e) => handleCycleChange(e.target.value)}
                required
                aria-label={t('academicContext.fields.cycle')}
              >
                <option value="">{t('academicContext.placeholders.cycle')}</option>
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={t('nav.levels')}>
            <select
              className="input"
              value={levelId}
              onChange={(e) => handleLevelChange(e.target.value)}
              required
              disabled={levelSelectDisabled}
              aria-label={t('nav.levels')}
            >
              <option value="">{t('admin.selectLevel')}</option>
              {levelsForCycle.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {levelEmptyHint ? (
              <span className="tiny muted block mt-2">{levelEmptyHint}</span>
            ) : null}
          </Field>
          {levelSupportsTracks && (
            <Field label={t('admin.academicSetup.classTrackLabel')}>
              <select
                className="input"
                value={trackId}
                onChange={(e) => handleTrackChange(e.target.value)}
              >
                <option value="">{t('common.dash')}</option>
                {tracksForLevel.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.name}
                  </option>
                ))}
              </select>
              {!isCreating && (
                <span className="tiny muted block mt-2">
                  {t('admin.academicSetup.trackChangeHint')}
                </span>
              )}
            </Field>
          )}
        </div>
        <Field label={isCreating ? t('admin.classCanonicalCode') : t('admin.className')}>
          <input
            className="input"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            dir="ltr"
            disabled={isCreating && Boolean(levelId) && !selectedAcademicCode}
            aria-describedby={isCreating ? 'class-canonical-name-hint' : undefined}
          />
          {isCreating ? (
            <span id="class-canonical-name-hint" className="tiny muted block mt-2">
              {levelId && !selectedAcademicCode
                ? t('admin.classMissingAcademicCode')
                : t('admin.classCanonicalCodeHint')}
            </span>
          ) : null}
          {isCreating && selectedLevel?.name ? (
            <span className="tiny muted block mt-2" dir="auto">
              {t('admin.classCanonicalLevelContext', { level: selectedLevel.name })}
            </span>
          ) : null}
        </Field>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <Field label={t('admin.capacity')}>
            <input
              className="input"
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </Field>
          <Field label={t('academic.room')}>
            <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
          </Field>
        </div>
        <Field label={t('nav.teachers')}>
          <div className="col" style={{ gap: 6, maxHeight: 160, overflow: 'auto' }}>
            {(teachersState.data ?? []).map((te) => (
              <label key={te.id} className="row" style={{ gap: 8 }}>
                <input
                  type="checkbox"
                  checked={teacherIds.includes(te.id)}
                  onChange={() => toggleId(te.id, teacherIds, setTeacherIds)}
                />
                <span>{te.name}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label={t('nav.subjects')}>
          {!parsedLevelId ? (
            <span className="tiny muted">{t('admin.selectLevel')}</span>
          ) : (
            <ClassSubjectsField
              t={t}
              loading={subjectsFieldLoading}
              error={subjectOptionsState.error}
              options={levelSubjectOptions}
              legacy={legacySubjects}
              selectedIds={subjectIds}
              onToggle={toggleSubjectId}
              onSelectAll={selectAllSubjects}
              onClearAll={clearAllSubjects}
              onRetry={() => {
                subjectOptionsState.reload();
                schoolSubjectsState.reload();
                levelDetailState.reload();
              }}
              canAddSubject={!isCreating}
              onAddSubject={() => setCreateSubjectOpen(true)}
            />
          )}
        </Field>
      </FormShell>
      {!isCreating ? (
        <CreateSchoolSubjectDrawer
          open={createSubjectOpen}
          levels={levelsState.data ?? []}
          defaultLevelIds={parsedLevelId != null ? [parsedLevelId] : []}
          onClose={() => setCreateSubjectOpen(false)}
          onSaved={handleSubjectCreated}
        />
      ) : null}
    </>
  );
}

export interface LevelDetail {
  id: number;
  name: string;
  code?: string | null;
  sequence?: number;
  category?: string | null;
  status?: string;
}

export function LevelForm({
  level,
  onSaved,
  onCancel,
}: {
  level?: LevelDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(level?.name ?? '');
  const [code, setCode] = useState(level?.code ?? '');
  const [sequence, setSequence] = useState(String(level?.sequence ?? 10));
  const [category, setCategory] = useState(level?.category ?? 'primary');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      sequence: Number(sequence) || 10,
      category,
    };
    setSaving(true);
    const res = level
      ? await api.post(endpoints.admin.levelUpdate(level.id), payload)
      : await api.post(endpoints.admin.levels, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as LevelDetail).id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      <Field label={t('admin.levelName')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.code')}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label={t('admin.sequence')}>
          <input className="input" type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} />
        </Field>
        <Field label={t('academic.type')}>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
      </div>
    </FormShell>
  );
}

export interface SubjectDetail {
  id: number;
  name: string;
  code?: string | null;
  sequence?: number;
  category?: string | null;
  credit_hours?: number;
  status?: string;
  weekly_hours?: number | null;
  assessment_coefficient?: number | null;
  legacy_coefficient?: number | null;
  exam_coefficient?: number | null;
  ref_subject_id?: number | null;
  level_ids?: number[];
}

/** Same fields as create — delegates to CreateSchoolSubjectForm. */
export function SubjectForm({
  subject,
  onSaved,
  onCancel,
}: {
  subject?: SubjectDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  return (
    <CreateSchoolSubjectForm
      subject={subject ?? null}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}
