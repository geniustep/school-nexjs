'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import {
  AcademicContextFilters,
  useAcademicContextOptions,
} from '@/features/academic-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeTeachingReferences } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import {
  createTeachingOffering,
  updateTeachingOffering,
} from '@/features/admin/teaching-planning/api/teaching-offerings-api';
import type { AcademicContextSelection } from '@/types/academic-context';
import type {
  TeachingOfferingCreatePayload,
  TeachingOfferingDetail,
  TeachingReferenceSummary,
} from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

function resolveTeachingLanguageId(
  selection: AcademicContextSelection,
  languages: Array<{ id: number }> | undefined,
): string {
  if (selection.teachingLanguageId) return selection.teachingLanguageId;
  if (languages?.length === 1) return String(languages[0]!.id);
  return '';
}

export function TeachingOfferingEditorDialog({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: TeachingOfferingDetail | null;
  onClose: () => void;
  onSaved: (item: TeachingOfferingDetail) => void;
}) {
  const t = useT();
  const { activeSchoolId, schools } = useAdminSession();
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(null);
  const refsState = useAdminResource(endpoints.admin.teachingReferences, {
    page_size: 200,
    state: 'approved',
  });

  const activeSchool = useMemo(
    () => schools.find((school) => school.id === activeSchoolId) ?? null,
    [schools, activeSchoolId],
  );
  const approvedReferences = useMemo(() => {
    const rows = normalizeTeachingReferences(refsState.data).filter(
      (row) => row.state === 'approved',
    );
    if (initial?.reference && !rows.some((row) => row.id === initial.reference!.id)) {
      return [initial.reference, ...rows];
    }
    return rows;
  }, [refsState.data, initial?.reference]);

  const [yearId, setYearId] = useState('');
  const [selection, setSelection] = useState<AcademicContextSelection>(
    EMPTY_ACADEMIC_CONTEXT_SELECTION,
  );
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context = useAcademicContextOptions({
    scope: 'teaching_planning',
    enabled: open,
    selection,
    onSelectionChange: setSelection,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setYearId(initial?.academic_year.id ? String(initial.academic_year.id) : '');
    setSelection({
      ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
      levelId: initial?.level.id ? String(initial.level.id) : '',
      subjectId: initial?.subject.id ? String(initial.subject.id) : '',
      trackId: initial?.track?.id ? String(initial.track.id) : '',
      teachingLanguageId: initial?.teaching_language?.id
        ? String(initial.teaching_language.id)
        : '',
    });
    setReferenceId(initial?.reference?.id ? String(initial.reference.id) : '');
    setNotes(initial?.notes ?? '');
    setEffectiveFrom(initial?.effective_from ?? '');
    setEffectiveTo(initial?.effective_to ?? '');
  }, [open, initial]);

  function applyReferencePrefill(ref: TeachingReferenceSummary | null) {
    if (!ref || mode !== 'create') return;
    setSelection((prev) => ({
      ...prev,
      levelId: String(ref.level.id),
      subjectId: String(ref.subject.id),
      trackId: ref.track?.id ? String(ref.track.id) : '',
      teachingLanguageId: ref.teaching_language?.id
        ? String(ref.teaching_language.id)
        : prev.teachingLanguageId,
    }));
  }

  async function handleConfirm() {
    if (saving) return;
    const languageId = resolveTeachingLanguageId(
      selection,
      context.options?.teaching_languages,
    );
    if (!yearId || !selection.levelId || !selection.subjectId || !languageId) {
      setError(t('admin.teachingPlanning.validation.requiredFields'));
      return;
    }
    if (mode === 'create' && activeSchoolId == null) {
      setError(t('admin.chooseSchoolDesc'));
      return;
    }
    setSaving(true);
    setError(null);
    const payload: TeachingOfferingCreatePayload = {
      school_id: mode === 'edit' ? initial!.school.id : Number(activeSchoolId),
      academic_year_id: Number(yearId),
      level_id: Number(selection.levelId),
      subject_id: Number(selection.subjectId),
      teaching_language_id: Number(languageId),
      track_id: selection.trackId ? Number(selection.trackId) : null,
      reference_id: referenceId ? Number(referenceId) : null,
      notes: notes.trim() || null,
      effective_from: effectiveFrom || null,
      effective_to: effectiveTo || null,
    };
    const res =
      mode === 'create'
        ? await createTeachingOffering(payload)
        : await updateTeachingOffering(initial!.id, payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onSaved(res.data);
    onClose();
  }

  const schoolName =
    mode === 'edit'
      ? (initial?.school.name ?? '')
      : (activeSchool?.name ?? (activeSchoolId != null ? `#${activeSchoolId}` : ''));

  return (
    <ConfirmationDialog
      open={open}
      size="form"
      title={
        mode === 'create'
          ? t('admin.teachingPlanning.offerings.createTitle')
          : t('admin.teachingPlanning.offerings.editTitle')
      }
      body={
        <div className="teaching-planning-dialog">
          {error ? <p className="form-error">{error}</p> : null}

          <div className="teaching-planning-dialog__school">
            <span className="teaching-planning-dialog__school-label">
              {t('admin.teachingPlanning.fields.school')}
            </span>
            <span className="teaching-planning-dialog__school-value" dir="auto">
              {schoolName || t('common.dash')}
            </span>
          </div>

          <section className="teaching-planning-dialog__section" aria-labelledby="offering-identity">
            <h4 id="offering-identity" className="teaching-planning-dialog__section-title">
              {t('admin.teachingPlanning.offerings.dialog.identitySection')}
            </h4>
            <div className="teaching-planning-dialog__row">
              <div className="field">
                <label htmlFor="offering-year">{t('admin.teachingPlanning.fields.academicYear')}</label>
                <select
                  id="offering-year"
                  className="select"
                  value={yearId}
                  onChange={(e) => setYearId(e.target.value)}
                  disabled={saving || yearsLoading}
                >
                  <option value="">{t('admin.teachingPlanning.filters.yearAll')}</option>
                  {yearOptions.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="offering-reference">
                  {t('admin.teachingPlanning.fields.reference')}
                </label>
                <select
                  id="offering-reference"
                  className="select"
                  value={referenceId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setReferenceId(next);
                    const ref =
                      approvedReferences.find((row) => String(row.id) === next) ?? null;
                    applyReferencePrefill(ref);
                  }}
                  disabled={saving}
                >
                  <option value="">{t('admin.teachingPlanning.filters.referenceAll')}</option>
                  {approvedReferences.map((ref) => (
                    <option key={ref.id} value={ref.id}>
                      {ref.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AcademicContextFilters
              scope="teaching_planning"
              layout="compact"
              controller={context}
              showAcademicYear={false}
              showTerm={false}
              showCycle
              showLevel
              showTrack
              showSubject
              showTeachingLanguage
              showOffering={false}
              showReference={false}
              showClass={false}
              requiredFields={['level', 'subject', 'teachingLanguage']}
              idPrefix="offering-ctx"
            />
          </section>

          <section className="teaching-planning-dialog__section" aria-labelledby="offering-dates">
            <h4 id="offering-dates" className="teaching-planning-dialog__section-title">
              {t('admin.teachingPlanning.offerings.dialog.datesSection')}
            </h4>
            <div className="teaching-planning-dialog__row">
              <div className="field">
                <label htmlFor="offering-from">
                  {t('admin.teachingPlanning.fields.effectiveFrom')}
                </label>
                <DatePickerInput
                  id="offering-from"
                  value={effectiveFrom}
                  onChange={setEffectiveFrom}
                  disabled={saving}
                  presets={false}
                />
              </div>
              <div className="field">
                <label htmlFor="offering-to">{t('admin.teachingPlanning.fields.effectiveTo')}</label>
                <DatePickerInput
                  id="offering-to"
                  value={effectiveTo}
                  onChange={setEffectiveTo}
                  disabled={saving}
                  presets={false}
                  min={effectiveFrom || undefined}
                />
              </div>
            </div>
          </section>

          <section className="teaching-planning-dialog__section" aria-labelledby="offering-notes">
            <h4 id="offering-notes" className="teaching-planning-dialog__section-title">
              {t('admin.teachingPlanning.offerings.dialog.notesSection')}
            </h4>
            <div className="field">
              <label htmlFor="offering-notes-field">{t('admin.teachingPlanning.fields.notes')}</label>
              <textarea
                id="offering-notes-field"
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                dir="auto"
                rows={3}
                disabled={saving}
              />
            </div>
          </section>
        </div>
      }
      confirmLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
      onConfirm={handleConfirm}
      onClose={onClose}
      loading={saving}
    />
  );
}
