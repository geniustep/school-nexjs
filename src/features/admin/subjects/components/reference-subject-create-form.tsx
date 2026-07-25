'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PermissionDeniedState } from '@/components/states/states';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { normalizeLevelOptionsPayload } from '@/features/admin/academic-setup/hooks/use-level-options';
import { createReferenceSubject } from '@/features/admin/subjects/api/reference-subject-create-api';
import { mapReferenceSubjectCreateError } from '@/features/admin/subjects/utils/map-reference-subject-create-error';
import {
  buildReferenceSubjectCreatePayload,
  emptyReferenceSubjectCreateFormState,
  filterReferenceLevelsForCycle,
  isReferenceSubjectCategory,
  pruneLevelIdsForCycle,
  sortCycles,
  sortReferenceLevels,
  type ReferenceSubjectCreateFormState,
  type ReferenceSubjectDefaultStatus,
  type ReferenceSubjectFormField,
} from '@/features/admin/subjects/utils/reference-subject-create-form';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canManageReferenceSubjects } from '@/lib/permissions/academic-capabilities';
import type { LevelOptionsPayload } from '@/types/academic-levels';
import {
  REFERENCE_SUBJECT_CATEGORIES,
  type ReferenceSubjectCategory,
  type ReferenceSubjectCreateResult,
} from '@/types/reference-subjects';
import '../admin-subjects.css';

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="tiny" style={{ color: '#b91c1c' }} role="alert">
      {message}
    </p>
  );
}

export function ReferenceSubjectCreateForm() {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const canManage = canManageReferenceSubjects(user);

  const levelsState = useAdminResource<LevelOptionsPayload>(endpoints.admin.levelsOptions, {
    include_enabled: 'true',
    page_size: 200,
  });
  const options = useMemo(
    () => normalizeLevelOptionsPayload(levelsState.data),
    [levelsState.data],
  );

  const [form, setForm] = useState<ReferenceSubjectCreateFormState>(
    emptyReferenceSubjectCreateFormState,
  );
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ReferenceSubjectFormField, string>>>(
    {},
  );
  const [created, setCreated] = useState<ReferenceSubjectCreateResult | null>(null);

  const cycles = useMemo(() => sortCycles(options?.cycles ?? []), [options?.cycles]);
  const visibleLevels = useMemo(
    () => sortReferenceLevels(filterReferenceLevelsForCycle(options?.reference_levels ?? [], form.cycleId)),
    [options?.reference_levels, form.cycleId],
  );

  function clearErrors() {
    setBanner(null);
    setFieldErrors({});
  }

  function setCycle(cycleId: number | '') {
    setForm((prev) => ({
      ...prev,
      cycleId,
      levelIds: pruneLevelIdsForCycle(prev.levelIds, options?.reference_levels ?? [], cycleId),
    }));
  }

  function toggleLevel(levelId: number) {
    setForm((prev) => ({
      ...prev,
      levelIds: prev.levelIds.includes(levelId)
        ? prev.levelIds.filter((id) => id !== levelId)
        : [...prev.levelIds, levelId],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || saving || created) return;
    clearErrors();

    const validated = buildReferenceSubjectCreatePayload(form, options);
    if (!validated.ok) {
      const message = t(validated.messageKey);
      setFieldErrors({ [validated.field]: message });
      if (validated.field === 'form') setBanner(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    const result = await createReferenceSubject(validated.payload);
    setSaving(false);

    if (!result.ok) {
      const mapped = mapReferenceSubjectCreateError(result.error, t);
      setBanner(mapped.message);
      if (mapped.field) {
        setFieldErrors({ [mapped.field]: mapped.message });
      }
      toast.error(mapped.message);
      return;
    }

    setCreated(result.data);
    toast.success(t('admin.referenceSubjects.success'));
  }

  if (!canManage) {
    return (
      <PermissionDeniedState description={t('admin.referenceSubjects.errors.manageForbidden')} />
    );
  }

  if (created) {
    return (
      <Card>
        <div className="col admin-create-subject-form" style={{ gap: 14 }}>
          <div className="academic-setup-gap-banner" role="status">
            <p>
              <strong>{t('admin.referenceSubjects.success')}</strong>
            </p>
            <p className="mt-2" dir="auto">
              {created.name}
            </p>
            <p className="tiny muted mono" dir="ltr">
              {created.code}
            </p>
            <p className="tiny muted mt-2">{t('admin.referenceSubjects.successEnableHint')}</p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Link
              href="/admin/settings/academic-setup/subjects"
              className="btn btn--primary btn--sm"
            >
              {t('admin.referenceSubjects.actions.enable')}
            </Link>
            <Link href="/admin/subjects" className="btn btn--ghost btn--sm">
              {t('nav.subjects')}
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const optionsLoading = levelsState.loading && !options;
  const optionsError = levelsState.error;

  return (
    <Card>
      <form className="col admin-create-subject-form" style={{ gap: 14 }} onSubmit={submit} noValidate>
        <p className="muted tiny">{t('admin.referenceSubjects.pageDesc')}</p>
        <div className="academic-setup-gap-banner" role="note">
          {t('admin.referenceSubjects.globalScopeWarning')}
        </div>

        {banner ? (
          <div className="academic-setup-gap-banner" role="alert">
            {banner}
          </div>
        ) : null}

        <div className="col" style={{ gap: 4 }}>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.referenceSubjects.fields.name')}</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              autoFocus
              dir="auto"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'ref-subject-name-error' : undefined}
            />
          </label>
          <FieldError id="ref-subject-name-error" message={fieldErrors.name ?? null} />
        </div>

        <div className="col" style={{ gap: 4 }}>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.referenceSubjects.fields.code')}</span>
            <input
              className="input"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              required
              dir="ltr"
              aria-invalid={!!fieldErrors.code}
              aria-describedby={fieldErrors.code ? 'ref-subject-code-error' : undefined}
            />
          </label>
          <FieldError id="ref-subject-code-error" message={fieldErrors.code ?? null} />
        </div>

        <div className="col" style={{ gap: 4 }}>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.referenceSubjects.fields.cycle')}</span>
            <select
              className="input"
              value={form.cycleId === '' ? '' : String(form.cycleId)}
              onChange={(e) => setCycle(e.target.value ? Number(e.target.value) : '')}
              disabled={optionsLoading}
              required
              aria-invalid={!!fieldErrors.cycle}
              aria-describedby={fieldErrors.cycle ? 'ref-subject-cycle-error' : undefined}
            >
              <option value="">{t('admin.referenceSubjects.fields.cyclePlaceholder')}</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                  {cycle.code ? ` (${cycle.code})` : ''}
                </option>
              ))}
            </select>
          </label>
          <FieldError id="ref-subject-cycle-error" message={fieldErrors.cycle ?? null} />
        </div>

        <fieldset className="admin-create-subject-form__levels">
          <legend className="tiny muted">{t('admin.referenceSubjects.fields.levels')}</legend>
          {optionsLoading ? <p className="muted tiny">{t('common.loading')}</p> : null}
          {optionsError ? (
            <p className="muted tiny" role="alert">
              {optionsError.message}
            </p>
          ) : null}
          {!optionsLoading && !optionsError && form.cycleId === '' ? (
            <p className="muted tiny">{t('admin.referenceSubjects.fields.levelsNeedCycle')}</p>
          ) : null}
          {!optionsLoading && !optionsError && form.cycleId !== '' && !visibleLevels.length ? (
            <p className="muted tiny">{t('admin.referenceSubjects.fields.levelsEmpty')}</p>
          ) : null}
          <ul className="admin-create-subject-form__level-list" role="list">
            {visibleLevels.map((level) => {
              const checked = form.levelIds.includes(level.id);
              return (
                <li key={level.id}>
                  <label className="admin-create-subject-form__level-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLevel(level.id)}
                      disabled={saving}
                    />
                    <span>
                      <strong dir="auto">{level.display_name || level.name}</strong>
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
          <FieldError id="ref-subject-levels-error" message={fieldErrors.levels ?? null} />
        </fieldset>

        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('admin.referenceSubjects.fields.category')}</span>
          <select
            className="input"
            value={form.subjectCategory}
            onChange={(e) => {
              const value = e.target.value;
              if (!isReferenceSubjectCategory(value)) return;
              setForm((prev) => ({ ...prev, subjectCategory: value }));
            }}
            aria-invalid={!!fieldErrors.category}
          >
            {REFERENCE_SUBJECT_CATEGORIES.map((category: ReferenceSubjectCategory) => (
              <option key={category} value={category}>
                {t(`admin.referenceSubjects.categories.${category}`)}
              </option>
            ))}
          </select>
          <FieldError id="ref-subject-category-error" message={fieldErrors.category ?? null} />
        </label>

        <fieldset className="col" style={{ gap: 8 }}>
          <legend className="tiny muted">{t('admin.referenceSubjects.fields.defaultStatus')}</legend>
          {(
            [
              ['unspecified', 'admin.referenceSubjects.status.unspecified'],
              ['mandatory', 'admin.referenceSubjects.status.mandatory'],
              ['optional', 'admin.referenceSubjects.status.optional'],
            ] as const
          ).map(([value, labelKey]) => (
            <label key={value} className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name="reference-subject-default-status"
                checked={form.defaultStatus === value}
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    defaultStatus: value as ReferenceSubjectDefaultStatus,
                  }))
                }
              />
              <span>{t(labelKey)}</span>
            </label>
          ))}
        </fieldset>

        <label className="col" style={{ gap: 4 }}>
          <span className="tiny muted">{t('admin.referenceSubjects.fields.weeklySessions')}</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={form.weeklySessionsDefault}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, weeklySessionsDefault: e.target.value }))
            }
            dir="ltr"
            aria-invalid={!!fieldErrors.weeklySessions}
            aria-describedby={
              fieldErrors.weeklySessions ? 'ref-subject-weekly-error' : undefined
            }
          />
          <FieldError id="ref-subject-weekly-error" message={fieldErrors.weeklySessions ?? null} />
        </label>

        <details className="col" style={{ gap: 10 }}>
          <summary className="tiny muted">{t('admin.referenceSubjects.fields.additionalInfo')}</summary>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.referenceSubjects.fields.externalCode')}</span>
            <input
              className="input"
              value={form.externalReferenceCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, externalReferenceCode: e.target.value }))
              }
              dir="ltr"
            />
          </label>
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.referenceSubjects.fields.sourceNote')}</span>
            <textarea
              className="input"
              value={form.sourceNote}
              onChange={(e) => setForm((prev) => ({ ...prev, sourceNote: e.target.value }))}
              rows={3}
              dir="auto"
            />
          </label>
        </details>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : t('admin.referenceSubjects.actions.create')}
          </button>
          <Link href="/admin/subjects" className="btn btn--ghost btn--sm">
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </Card>
  );
}
