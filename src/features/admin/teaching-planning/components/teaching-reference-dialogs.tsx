'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { InfoBanner } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import {
  AcademicContextFilters,
  useAcademicContextOptions,
} from '@/features/academic-context';
import {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import { useT } from '@/features/i18n/locale-context';
import {
  createTeachingReference,
  updateTeachingReference,
} from '@/features/admin/teaching-planning/api/teaching-references-api';
import type { AcademicContextSelection } from '@/types/academic-context';
import type {
  TeachingReferenceCreatePayload,
  TeachingReferenceDetail,
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

export function TeachingReferenceEditorDialog({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: TeachingReferenceDetail | null;
  onClose: () => void;
  onSaved: (item: TeachingReferenceDetail) => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();

  const [name, setName] = useState('');
  const [selection, setSelection] = useState<AcademicContextSelection>(
    EMPTY_ACADEMIC_CONTEXT_SELECTION,
  );
  const [publisher, setPublisher] = useState('');
  const [edition, setEdition] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [isbn, setIsbn] = useState('');
  const [notes, setNotes] = useState('');
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
    setName(initial?.name ?? '');
    setSelection({
      ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
      levelId: initial?.level.id ? String(initial.level.id) : '',
      subjectId: initial?.subject.id ? String(initial.subject.id) : '',
      trackId: initial?.track?.id ? String(initial.track.id) : '',
      teachingLanguageId: initial?.teaching_language?.id
        ? String(initial.teaching_language.id)
        : '',
    });
    setPublisher(initial?.publisher ?? '');
    setEdition(initial?.edition ?? '');
    setVersionLabel(initial?.version_label ?? '');
    setReferenceCode(initial?.reference_code ?? '');
    setIsbn(initial?.isbn ?? '');
    setNotes(initial?.notes ?? '');
  }, [open, initial]);

  async function handleConfirm() {
    if (saving) return;
    const languageId = resolveTeachingLanguageId(
      selection,
      context.options?.teaching_languages,
    );
    if (!name.trim() || !selection.levelId || !selection.subjectId || !languageId) {
      setError(t('admin.teachingPlanning.validation.requiredFields'));
      return;
    }
    if (mode === 'create' && activeSchoolId == null) {
      setError(t('admin.chooseSchoolDesc'));
      return;
    }
    setSaving(true);
    setError(null);
    const payload: TeachingReferenceCreatePayload = {
      name: name.trim(),
      school_id: mode === 'edit' ? initial!.school.id : Number(activeSchoolId),
      level_id: Number(selection.levelId),
      subject_id: Number(selection.subjectId),
      teaching_language_id: Number(languageId),
      track_id: selection.trackId ? Number(selection.trackId) : null,
      publisher: publisher.trim() || null,
      edition: edition.trim() || null,
      version_label: versionLabel.trim() || null,
      reference_code: referenceCode.trim() || null,
      isbn: isbn.trim() || null,
      notes: notes.trim() || null,
    };
    const res =
      mode === 'create'
        ? await createTeachingReference(payload)
        : await updateTeachingReference(initial!.id, payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onSaved(res.data);
    onClose();
  }

  return (
    <ConfirmationDialog
      open={open}
      size="form"
      title={
        mode === 'create'
          ? t('admin.teachingPlanning.references.createTitle')
          : t('admin.teachingPlanning.references.editTitle')
      }
      body={
        <div className="teaching-planning-dialog">
          {error ? <InfoBanner tone="amber" icon="⚠" title={error} /> : null}
          <div className="teaching-planning-dialog__section">
            <label className="field">
              {t('admin.teachingPlanning.fields.name')}
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                dir="auto"
                disabled={saving}
              />
            </label>

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
              idPrefix="reference-ctx"
            />
          </div>

          <div className="teaching-planning-dialog__section">
            <div className="teaching-planning-dialog__row">
              <label className="field">
                {t('admin.teachingPlanning.fields.publisher')}
                <input
                  className="input"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  dir="auto"
                  disabled={saving}
                />
              </label>
              <label className="field">
                {t('admin.teachingPlanning.fields.edition')}
                <input
                  className="input"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  dir="auto"
                  disabled={saving}
                />
              </label>
            </div>
            <div className="teaching-planning-dialog__row">
              <label className="field">
                {t('admin.teachingPlanning.fields.versionLabel')}
                <input
                  className="input"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  dir="auto"
                  disabled={saving}
                />
              </label>
              <label className="field">
                {t('admin.teachingPlanning.fields.referenceCode')}
                <input
                  className="input"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  dir="ltr"
                  disabled={saving}
                />
              </label>
            </div>
            <label className="field">
              {t('admin.teachingPlanning.fields.isbn')}
              <input
                className="input"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                dir="ltr"
                disabled={saving}
              />
            </label>
          </div>

          <div className="teaching-planning-dialog__section">
            <label className="field">
              {t('admin.teachingPlanning.fields.notes')}
              <textarea
                className="textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                dir="auto"
                rows={3}
                disabled={saving}
              />
            </label>
          </div>
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

export function TeachingPlanningResetDialog({
  open,
  title,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError(null);
  }, [open]);

  return (
    <ConfirmationDialog
      open={open}
      title={title}
      body={
        <div className="teaching-planning-dialog">
          {error ? <InfoBanner tone="amber" icon="⚠" title={error} /> : null}
          <label>
            {t('admin.teachingPlanning.fields.resetReason')}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} dir="auto" rows={3} />
          </label>
        </div>
      }
      confirmLabel={t('admin.teachingPlanning.lifecycle.resetToDraft')}
      cancelLabel={t('common.cancel')}
      variant="danger"
      loading={saving}
      onClose={onClose}
      onConfirm={async () => {
        if (!reason.trim() || saving) {
          setError(t('admin.teachingPlanning.validation.resetReasonRequired'));
          return;
        }
        setSaving(true);
        setError(null);
        try {
          await onConfirm(reason.trim());
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
