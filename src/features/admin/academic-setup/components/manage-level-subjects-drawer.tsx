'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { AcademicTrack } from '@/types/academic-setup';
import type { Level, Subject } from '@/types/class';
import { useSubjectOptions } from '../hooks/use-subject-options';
import { formatAcademicLevelLabel } from '../utils/format-academic-label';
import { mapAcademicSetupApiError } from '../utils/api-errors';
import { dedupeSubjectsForDisplay } from '../utils/subject-present';
import { SetupDrawer } from './setup-drawer';

type DraftRow = {
  weeklyHours: string;
  coefficient: string;
  trackId: string;
};

type SubjectPlanMeta = {
  referenceSubjectId: number;
  assessmentCoefficient: number | null;
  legacyCoefficient: number | null;
};

function subjectTrackValue(subject: Subject): string {
  if (subject.track_id != null) return String(subject.track_id);
  return '';
}

function subjectHoursValue(subject: Subject): string {
  if (subject.weekly_hours == null) return '';
  return String(subject.weekly_hours);
}

function formatCoefficient(value: number | null | undefined): string {
  if (value == null) return '';
  return String(value);
}

function subjectCoefficientValue(
  subject: Subject,
  plan: SubjectPlanMeta | undefined,
): string {
  const assessment =
    plan?.assessmentCoefficient ?? subject.assessment_coefficient ?? null;
  if (assessment != null) return formatCoefficient(assessment);
  const legacy = plan?.legacyCoefficient ?? subject.legacy_coefficient ?? null;
  return formatCoefficient(legacy);
}

function resolveReferenceSubjectId(
  subject: Subject,
  plan: SubjectPlanMeta | undefined,
): number | null {
  if (plan?.referenceSubjectId != null) return plan.referenceSubjectId;
  if (subject.ref_subject_id != null) return subject.ref_subject_id;
  return null;
}

export function ManageLevelSubjectsDrawer({
  open,
  level,
  subjects,
  tracks,
  canManage,
  onClose,
  onSaved,
}: {
  open: boolean;
  level: Level | null;
  subjects: Subject[];
  tracks: AcademicTrack[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Map<number, DraftRow>>(new Map());
  const [savingId, setSavingId] = useState<number | null>(null);

  const levelId = level?.id ?? null;
  const supportsTracks = level?.supports_tracks === true;
  const levelLabel = level ? formatAcademicLevelLabel(level, locale).primary : '';

  const optionsState = useSubjectOptions(open ? levelId : null);

  const planBySubjectId = useMemo(() => {
    const map = new Map<number, SubjectPlanMeta>();
    for (const ref of optionsState.options?.reference_subjects ?? []) {
      if (ref.school_subject_id == null) continue;
      map.set(ref.school_subject_id, {
        referenceSubjectId: ref.id,
        assessmentCoefficient:
          ref.assessment_coefficient ?? ref.plan?.assessment_coefficient ?? null,
        legacyCoefficient:
          ref.legacy_coefficient ?? ref.plan?.legacy_coefficient ?? null,
      });
    }
    return map;
  }, [optionsState.options?.reference_subjects]);

  const levelTracks = useMemo(
    () =>
      tracks
        .filter((tr) => tr.level.id === levelId)
        .sort(
          (a, b) =>
            (a.sequence ?? 0) - (b.sequence ?? 0) ||
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        ),
    [tracks, levelId],
  );

  const levelSubjects = useMemo(() => {
    const list = dedupeSubjectsForDisplay(subjects).sort(
      (a, b) =>
        (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name),
    );
    return list;
  }, [subjects]);

  useEffect(() => {
    if (!open) {
      setDrafts(new Map());
      setSavingId(null);
      return;
    }
    const next = new Map<number, DraftRow>();
    for (const subject of levelSubjects) {
      next.set(subject.id, {
        weeklyHours: subjectHoursValue(subject),
        coefficient: subjectCoefficientValue(subject, planBySubjectId.get(subject.id)),
        trackId: subjectTrackValue(subject),
      });
    }
    setDrafts(next);
  }, [open, levelId, levelSubjects, planBySubjectId]);

  function updateDraft(subjectId: number, patch: Partial<DraftRow>) {
    setDrafts((prev) => {
      const current = prev.get(subjectId) ?? {
        weeklyHours: '',
        coefficient: '',
        trackId: '',
      };
      const next = new Map(prev);
      next.set(subjectId, { ...current, ...patch });
      return next;
    });
  }

  function isHoursDirty(subject: Subject, draft: DraftRow): boolean {
    return (draft.weeklyHours.trim() || '') !== subjectHoursValue(subject);
  }

  function isCoefficientDirty(subject: Subject, draft: DraftRow): boolean {
    const baseline = subjectCoefficientValue(
      subject,
      planBySubjectId.get(subject.id),
    );
    return (draft.coefficient.trim() || '') !== baseline;
  }

  function isTrackDirty(subject: Subject, draft: DraftRow): boolean {
    return supportsTracks && (draft.trackId || '') !== subjectTrackValue(subject);
  }

  function isDirty(subject: Subject): boolean {
    const draft = drafts.get(subject.id);
    if (!draft) return false;
    return (
      isHoursDirty(subject, draft) ||
      isCoefficientDirty(subject, draft) ||
      isTrackDirty(subject, draft)
    );
  }

  async function saveSubject(subject: Subject) {
    if (!canManage || savingId != null || levelId == null) return;
    const draft = drafts.get(subject.id);
    if (!draft || !isDirty(subject)) return;

    const hoursDirty = isHoursDirty(subject, draft);
    const coefficientDirty = isCoefficientDirty(subject, draft);
    const trackDirty = isTrackDirty(subject, draft);

    let weeklyHours: number | null = null;
    if (hoursDirty) {
      const hoursRaw = draft.weeklyHours.trim();
      if (hoursRaw !== '') {
        const parsed = Number(hoursRaw);
        if (!Number.isFinite(parsed) || parsed < 0) {
          toast.error(t('admin.academicSetup.manageSubjectsInvalidHours'));
          return;
        }
        weeklyHours = parsed;
      }
    }

    let assessmentCoefficient: number | null | undefined;
    if (coefficientDirty) {
      const coeffRaw = draft.coefficient.trim();
      if (coeffRaw === '') {
        assessmentCoefficient = null;
      } else {
        const parsed = Number(coeffRaw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          toast.error(t('admin.academicSetup.manageSubjectsInvalidCoefficient'));
          return;
        }
        assessmentCoefficient = parsed;
      }
    }

    const referenceSubjectId = resolveReferenceSubjectId(
      subject,
      planBySubjectId.get(subject.id),
    );
    if (coefficientDirty && referenceSubjectId == null) {
      toast.error(t('admin.academicSetup.manageSubjectsCoefficientUnavailable'));
      return;
    }

    setSavingId(subject.id);

    if (hoursDirty || trackDirty) {
      const payload: Record<string, unknown> = {};
      if (hoursDirty) payload.weekly_hours = weeklyHours;
      if (trackDirty) {
        payload.track_id = draft.trackId ? Number(draft.trackId) : null;
      }
      const res = await api.post(endpoints.admin.subjectUpdate(subject.id), payload);
      if (!res.success) {
        setSavingId(null);
        toast.error(mapAcademicSetupApiError(res.error, t, 'subject'));
        return;
      }
    }

    if (coefficientDirty && referenceSubjectId != null) {
      const planRes = await api.post(endpoints.admin.subjectsPlanUpdate, {
        level_id: levelId,
        reference_subject_id: referenceSubjectId,
        plan_vals: { assessment_coefficient: assessmentCoefficient ?? null },
      });
      if (!planRes.success) {
        setSavingId(null);
        toast.error(mapAcademicSetupApiError(planRes.error, t, 'subject'));
        return;
      }
    }

    setSavingId(null);
    toast.success(t('admin.saveSuccess'));
    optionsState.reload();
    onSaved();
  }

  const showLoading = open && optionsState.loading && !optionsState.options;

  return (
    <SetupDrawer
      open={open && level != null}
      title={t('admin.academicSetup.manageSubjectsTitle', { level: levelLabel })}
      onClose={onClose}
      size="wide"
    >
      <p className="muted tiny mb-2">
        {t('admin.academicSetup.manageSubjectsDesc')}
      </p>

      {showLoading && <p className="muted">{t('common.loading')}</p>}

      {!showLoading && !levelSubjects.length ? (
        <div className="academic-setup-gap-banner" role="status">
          <p>{t('admin.academicSetup.noSubjectsForLevel')}</p>
          <p className="tiny muted mt-2">
            {t('admin.academicSetup.manageSubjectsEmptyHint')}
          </p>
        </div>
      ) : null}

      {!showLoading && levelSubjects.length > 0 ? (
        <ul
          className={
            supportsTracks
              ? 'academic-manage-subjects academic-manage-subjects--with-track'
              : 'academic-manage-subjects'
          }
          role="list"
        >
          {levelSubjects.map((subject) => {
            const plan = planBySubjectId.get(subject.id);
            const draft = drafts.get(subject.id) ?? {
              weeklyHours: subjectHoursValue(subject),
              coefficient: subjectCoefficientValue(subject, plan),
              trackId: subjectTrackValue(subject),
            };
            const dirty = isDirty(subject);
            const saving = savingId === subject.id;
            const canEditCoefficient =
              resolveReferenceSubjectId(subject, plan) != null;
            return (
              <li key={subject.id} className="academic-manage-subjects__row">
                <div className="academic-manage-subjects__identity">
                  <strong className="academic-manage-subjects__name">
                    {subject.name}
                  </strong>
                  {subject.code && (
                    <span className="academic-manage-subjects__code" dir="ltr">
                      {subject.code}
                    </span>
                  )}
                  <span className="academic-manage-subjects__meta">
                    {subject.source === 'track'
                      ? t('admin.academicSetup.classSubjectSourceTrack')
                      : subject.source === 'class'
                        ? t('admin.academicSetup.classSubjectSourceClass')
                        : t('admin.academicSetup.classSubjectSourceLevel')}
                  </span>
                </div>

                <label className="academic-manage-subjects__field">
                  <span className="academic-manage-subjects__field-label">
                    {t('admin.subjectsList.detailWeeklyHours')}
                  </span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    disabled={!canManage || saving}
                    value={draft.weeklyHours}
                    onChange={(e) =>
                      updateDraft(subject.id, { weeklyHours: e.target.value })
                    }
                    aria-label={t('admin.subjectsList.detailWeeklyHours')}
                  />
                </label>

                <label className="academic-manage-subjects__field">
                  <span className="academic-manage-subjects__field-label">
                    {t('academic.coefficient')}
                  </span>
                  <input
                    className="input"
                    type="number"
                    min={0.1}
                    step={0.5}
                    inputMode="decimal"
                    disabled={!canManage || saving || !canEditCoefficient}
                    value={draft.coefficient}
                    onChange={(e) =>
                      updateDraft(subject.id, { coefficient: e.target.value })
                    }
                    aria-label={t('academic.coefficient')}
                    title={
                      canEditCoefficient
                        ? undefined
                        : t('admin.academicSetup.manageSubjectsCoefficientUnavailable')
                    }
                  />
                </label>

                {supportsTracks && (
                  <label className="academic-manage-subjects__field">
                    <span className="academic-manage-subjects__field-label">
                      {t('admin.academicSetup.manageSubjectsTrackLabel')}
                    </span>
                    <select
                      className="input"
                      disabled={!canManage || saving || levelTracks.length === 0}
                      value={draft.trackId}
                      onChange={(e) =>
                        updateDraft(subject.id, { trackId: e.target.value })
                      }
                      aria-label={t('admin.academicSetup.manageSubjectsTrackLabel')}
                    >
                      <option value="">
                        {t('admin.academicSetup.subjectsTrackFilterShared')}
                      </option>
                      {levelTracks.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          {tr.name}
                          {tr.code ? ` (${tr.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {canManage && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm academic-manage-subjects__save"
                    disabled={!dirty || saving}
                    onClick={() => saveSubject(subject)}
                  >
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </SetupDrawer>
  );
}
