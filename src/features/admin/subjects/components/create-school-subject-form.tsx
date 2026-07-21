'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { canManageSubjects } from '@/lib/permissions/academic-setup';
import { formatAcademicLevelLabel } from '@/features/admin/academic-setup/utils/format-academic-label';
import type { Level } from '@/types/class';
import {
  createSchoolSubject,
  updateSchoolSubject,
} from '../utils/create-school-subject';
import '../admin-subjects.css';

export type SchoolSubjectFormValue = {
  id: number;
  name: string;
  code?: string | null;
  weekly_hours?: number | null;
  assessment_coefficient?: number | null;
  legacy_coefficient?: number | null;
  level_ids?: number[];
  ref_subject_id?: number | null;
};

type CycleOption = {
  key: string;
  label: string;
};

function cycleKey(level: Level): string {
  if (level.cycle?.id != null) return `id:${level.cycle.id}`;
  if (level.cycle?.code) return `code:${level.cycle.code}`;
  return 'none';
}

function cycleLabel(level: Level, fallback: string): string {
  return level.cycle?.name?.trim() || level.cycle?.code?.trim() || fallback;
}

function coefficientFromSubject(subject?: SchoolSubjectFormValue | null): string {
  const value = subject?.assessment_coefficient ?? subject?.legacy_coefficient ?? null;
  if (value == null) return '1';
  return String(value);
}

function weeklyHoursFromSubject(subject?: SchoolSubjectFormValue | null): string {
  if (subject?.weekly_hours == null) return '2';
  return String(subject.weekly_hours);
}

export function CreateSchoolSubjectForm({
  subject,
  onSaved,
  onCancel,
  embedded = false,
  defaultLevelIds = [],
  levels: levelsProp,
}: {
  /** When set, the form updates an existing subject with the same fields as create. */
  subject?: SchoolSubjectFormValue | null;
  onSaved: (subjectId: number) => void;
  onCancel: () => void;
  /** Render without outer Card (drawer / nested surfaces). */
  embedded?: boolean;
  /** Prefill selected levels (e.g. current academic-setup level). */
  defaultLevelIds?: number[];
  /** Optional external levels list to avoid a second fetch. */
  levels?: Level[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const user = useSession();
  const canManage = canManageSubjects(user);
  const isEdit = subject != null;

  const levelsState = useAdminResource<Level[]>(
    levelsProp ? null : endpoints.admin.levels,
    levelsProp ? undefined : { page_size: 200 },
  );
  const levels = levelsProp ?? levelsState.data ?? [];

  const initialLevelIds = useMemo(() => {
    const fromSubject = Array.isArray(subject?.level_ids) ? subject.level_ids : [];
    return [...new Set([...fromSubject, ...defaultLevelIds].filter((id) => id > 0))];
  }, [subject?.level_ids, defaultLevelIds]);

  const [name, setName] = useState(subject?.name ?? '');
  const [code, setCode] = useState(subject?.code ?? '');
  const [cycleFilter, setCycleFilter] = useState('');
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>(initialLevelIds);
  const [weeklyHours, setWeeklyHours] = useState(weeklyHoursFromSubject(subject));
  const [coefficient, setCoefficient] = useState(coefficientFromSubject(subject));
  const [enableImmediately, setEnableImmediately] = useState(
    isEdit ? initialLevelIds.length > 0 : true,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!subject) return;
    setName(subject.name ?? '');
    setCode(subject.code ?? '');
    setWeeklyHours(weeklyHoursFromSubject(subject));
    setCoefficient(coefficientFromSubject(subject));
    const levelIds = Array.isArray(subject.level_ids) ? subject.level_ids : [];
    setSelectedLevelIds(levelIds);
    setEnableImmediately(levelIds.length > 0);
  }, [subject]);

  useEffect(() => {
    if (subject || !defaultLevelIds.length) return;
    setSelectedLevelIds((prev) => {
      const next = new Set([...prev, ...defaultLevelIds]);
      return [...next];
    });
  }, [defaultLevelIds, subject]);

  const cycles = useMemo(() => {
    const map = new Map<string, CycleOption>();
    for (const level of levels) {
      const key = cycleKey(level);
      if (key === 'none' || map.has(key)) continue;
      map.set(key, { key, label: cycleLabel(level, t('admin.subjectsList.tierOther')) });
    }
    return [...map.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
  }, [levels, t]);

  const visibleLevels = useMemo(() => {
    const filtered = cycleFilter
      ? levels.filter((level) => cycleKey(level) === cycleFilter)
      : levels;
    return [...filtered].sort(
      (a, b) =>
        (a.sequence ?? 0) - (b.sequence ?? 0) ||
        formatAcademicLevelLabel(a, locale).primary.localeCompare(
          formatAcademicLevelLabel(b, locale).primary,
          undefined,
          { sensitivity: 'base' },
        ),
    );
  }, [levels, cycleFilter, locale]);

  function toggleLevel(levelId: number) {
    setSelectedLevelIds((prev) =>
      prev.includes(levelId) ? prev.filter((id) => id !== levelId) : [...prev, levelId],
    );
  }

  function selectVisibleLevels() {
    setSelectedLevelIds((prev) => {
      const next = new Set(prev);
      for (const level of visibleLevels) next.add(level.id);
      return [...next];
    });
  }

  function clearLevels() {
    setSelectedLevelIds([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || saving) return;

    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    if (!selectedLevelIds.length) {
      toast.error(t('admin.subjectsList.createLevelsRequired'));
      return;
    }

    let weekly: number | null = null;
    const hoursRaw = weeklyHours.trim();
    if (hoursRaw !== '') {
      const parsed = Number(hoursRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error(t('admin.subjectsList.createInvalidWeeklyHours'));
        return;
      }
      weekly = parsed;
    }

    let coeff: number | null = null;
    const coeffRaw = coefficient.trim();
    if (coeffRaw !== '') {
      const parsed = Number(coeffRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error(t('admin.academicSetup.manageSubjectsInvalidCoefficient'));
        return;
      }
      coeff = parsed;
    }

    setSaving(true);
    const result = isEdit
      ? await updateSchoolSubject({
          subjectId: subject.id,
          name,
          code,
          levelIds: selectedLevelIds,
          weeklyHours: weekly,
          coefficient: coeff,
          enableImmediately,
          previousLevelIds: Array.isArray(subject.level_ids) ? subject.level_ids : [],
          refSubjectId: subject.ref_subject_id,
        })
      : await createSchoolSubject({
          name,
          code,
          levelIds: selectedLevelIds,
          weeklyHours: weekly,
          coefficient: coeff,
          enableImmediately,
        });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error.message || t('errors.validationFailed'));
      if (result.subjectId != null) {
        onSaved(result.subjectId);
      }
      return;
    }

    if (isEdit) {
      toast.success(t('admin.saveSuccess'));
    } else if (result.enabledImmediately) {
      if (result.failedLevelIds.length > 0) {
        toast.error(
          t('admin.subjectsList.createPartialEnable', {
            success: result.linkedLevelIds.length,
            failed: result.failedLevelIds.length,
          }),
        );
      } else {
        toast.success(t('admin.subjectsList.createEnabledSuccess'));
      }
    } else {
      toast.success(t('admin.subjectsList.createCatalogSuccess'));
    }
    onSaved(result.subjectId);
  }

  if (!canManage) {
    const body = (
      <>
        <p className="muted">{t('errors.forbidden')}</p>
        <button type="button" className="btn btn--ghost btn--sm mt-2" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </>
    );
    return embedded ? body : <Card>{body}</Card>;
  }

  const form = (
    <form className="col admin-create-subject-form" style={{ gap: 14 }} onSubmit={submit}>
      <p className="muted tiny">
        {isEdit ? t('admin.subjectsList.editDesc') : t('admin.subjectsList.createDesc')}
      </p>

      <label className="col" style={{ gap: 4 }}>
        <span className="tiny muted">{t('admin.subjectName')}</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </label>

      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <label className="col" style={{ gap: 4, flex: '1 1 140px' }}>
          <span className="tiny muted">{t('admin.code')}</span>
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
          />
        </label>
        <label className="col" style={{ gap: 4, flex: '1 1 120px' }}>
          <span className="tiny muted">{t('admin.subjectsList.detailWeeklyHours')}</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
          />
        </label>
        <label className="col" style={{ gap: 4, flex: '1 1 120px' }}>
          <span className="tiny muted">{t('academic.coefficient')}</span>
          <input
            className="input"
            type="number"
            min={0.1}
            step={0.5}
            inputMode="decimal"
            value={coefficient}
            onChange={(e) => setCoefficient(e.target.value)}
          />
        </label>
      </div>

      <label className="col" style={{ gap: 4 }}>
        <span className="tiny muted">{t('admin.subjectsList.createCycleLabel')}</span>
        <select
          className="input"
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          disabled={!levelsProp && levelsState.loading && levels.length === 0}
        >
          <option value="">{t('admin.subjectsList.createCycleAll')}</option>
          {cycles.map((cycle) => (
            <option key={cycle.key} value={cycle.key}>
              {cycle.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="admin-create-subject-form__levels">
        <legend className="tiny muted">{t('admin.subjectsList.createLevelsLabel')}</legend>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBlockEnd: 8 }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={selectVisibleLevels}
            disabled={!visibleLevels.length}
          >
            {t('admin.subjectsList.createSelectVisibleLevels')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={clearLevels}
            disabled={!selectedLevelIds.length}
          >
            {t('admin.subjectsList.createClearLevels')}
          </button>
          <span className="tiny muted">
            {t('admin.subjectsList.createSelectedLevelsCount', {
              count: selectedLevelIds.length,
            })}
          </span>
        </div>

        {!levelsProp && levelsState.loading && levels.length === 0 ? (
          <p className="muted tiny">{t('common.loading')}</p>
        ) : null}
        {!levelsProp && levelsState.error ? (
          <p className="muted tiny" role="alert">
            {levelsState.error.message}
          </p>
        ) : null}

        <ul className="admin-create-subject-form__level-list" role="list">
          {visibleLevels.map((level) => {
            const label = formatAcademicLevelLabel(level, locale).primary;
            const checked = selectedLevelIds.includes(level.id);
            return (
              <li key={level.id}>
                <label className="admin-create-subject-form__level-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLevel(level.id)}
                  />
                  <span>
                    <strong>{label}</strong>
                    {level.code ? (
                      <span className="tiny muted" dir="ltr">
                        {' '}
                        {level.code}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <label className="admin-create-subject-form__enable">
        <input
          type="checkbox"
          checked={enableImmediately}
          onChange={(e) => setEnableImmediately(e.target.checked)}
        />
        <span>
          <strong>
            {isEdit
              ? t('admin.subjectsList.editEnableOnLevels')
              : t('admin.subjectsList.createEnableImmediately')}
          </strong>
          <span className="tiny muted block">
            {isEdit
              ? t('admin.subjectsList.editEnableOnLevelsHint')
              : t('admin.subjectsList.createEnableImmediatelyHint')}
          </span>
        </span>
      </label>

      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );

  return embedded ? form : <Card>{form}</Card>;
}
