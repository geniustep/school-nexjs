'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Editor for a Didactic Sequence and its session TEMPLATES. Every label refers
 * to a template (a plan), never a scheduled/actual session or a Jathatha.
 */

import { useEffect, useMemo, useState } from 'react';
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
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeTeachingReferences } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import {
  createDidacticSequence,
  updateDidacticSequence,
} from '@/features/admin/teaching-planning/api/didactic-sequences-api';
import {
  SESSION_TYPE_OPTIONS,
  moveDown,
  moveUp,
  renumberOrder,
  sessionTypeLabelKey,
  sumExpectedSessionCount,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { TeachingPlanningResetDialog } from '@/features/admin/teaching-planning/components/teaching-reference-dialogs';
import type { AcademicContextSelection } from '@/types/academic-context';
import type {
  DidacticSequenceCreatePayload,
  DidacticSequenceDetail,
  DidacticSequenceSessionTemplatePayload,
  DidacticSessionType,
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

interface TemplateDraft {
  key: string;
  id?: number;
  order: number;
  name: string;
  session_type: DidacticSessionType;
  expected_session_count: number;
  objective: string;
  pages: string;
  completion_criteria: string;
  support_notes: string;
  active: boolean;
}

let draftSeq = 0;
function newTemplateDraft(order: number): TemplateDraft {
  draftSeq += 1;
  return {
    key: `tpl-${draftSeq}`,
    order,
    name: '',
    session_type: 'construction',
    expected_session_count: 1,
    objective: '',
    pages: '',
    completion_criteria: '',
    support_notes: '',
    active: true,
  };
}

export { TeachingPlanningResetDialog as SequenceResetDialog };

export function DidacticSequenceEditorDialog({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: DidacticSequenceDetail | null;
  onClose: () => void;
  onSaved: (item: DidacticSequenceDetail) => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const refsState = useAdminResource(endpoints.admin.teachingReferences, {
    page_size: 200,
    state: 'approved',
  });

  const approvedReferences = useMemo(() => {
    const rows = normalizeTeachingReferences(refsState.data).filter(
      (row) => row.state === 'approved',
    );
    if (initial?.reference && !rows.some((row) => row.id === initial.reference!.id)) {
      return [initial.reference, ...rows];
    }
    return rows;
  }, [refsState.data, initial?.reference]);

  const [name, setName] = useState('');
  const [selection, setSelection] = useState<AcademicContextSelection>(
    EMPTY_ACADEMIC_CONTEXT_SELECTION,
  );
  const [referenceId, setReferenceId] = useState('');

  const context = useAcademicContextOptions({
    scope: 'teaching_planning',
    enabled: open,
    selection,
    onSelectionChange: setSelection,
  });
  const [unit, setUnit] = useState('');
  const [lesson, setLesson] = useState('');
  const [objectives, setObjectives] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [conceptsAndSkills, setConceptsAndSkills] = useState('');
  const [pages, setPages] = useState('');
  const [completionCriteria, setCompletionCriteria] = useState('');
  const [supportActivities, setSupportActivities] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [templates, setTemplates] = useState<TemplateDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setReferenceId(initial?.reference?.id ? String(initial.reference.id) : '');
    setUnit(initial?.unit ?? '');
    setLesson(initial?.lesson ?? '');
    setObjectives(initial?.objectives ?? '');
    setPrerequisites(initial?.prerequisites ?? '');
    setConceptsAndSkills(initial?.concepts_and_skills ?? '');
    setPages(initial?.pages ?? '');
    setCompletionCriteria(initial?.completion_criteria ?? '');
    setSupportActivities(initial?.support_activities ?? '');
    setVersionLabel(initial?.version_label ?? '');
    setNotes(initial?.notes ?? '');
    setTemplates(
      (initial?.session_templates ?? []).map((tpl, index) => {
        draftSeq += 1;
        return {
          key: `tpl-${draftSeq}`,
          id: tpl.id,
          order: tpl.order || index + 1,
          name: tpl.name,
          session_type: tpl.session_type,
          expected_session_count: tpl.expected_session_count,
          objective: tpl.objective ?? '',
          pages: tpl.pages ?? '',
          completion_criteria: tpl.completion_criteria ?? '',
          support_notes: tpl.support_notes ?? '',
          active: tpl.active,
        };
      }),
    );
  }, [open, initial]);

  const expectedTotal = useMemo(() => sumExpectedSessionCount(templates), [templates]);

  function updateTemplate(key: string, patch: Partial<TemplateDraft>) {
    setTemplates((prev) => prev.map((tpl) => (tpl.key === key ? { ...tpl, ...patch } : tpl)));
  }

  function addTemplate() {
    setTemplates((prev) => renumberOrder([...prev, newTemplateDraft(prev.length + 1)]));
  }

  function removeTemplate(key: string) {
    setTemplates((prev) => renumberOrder(prev.filter((tpl) => tpl.key !== key)));
  }

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
    if (templates.some((tpl) => !tpl.name.trim())) {
      setError(t('admin.teachingPlanning.sequences.validation.templateNameRequired'));
      return;
    }
    if (mode === 'create' && activeSchoolId == null) {
      setError(t('admin.chooseSchoolDesc'));
      return;
    }
    setSaving(true);
    setError(null);
    const session_templates: DidacticSequenceSessionTemplatePayload[] = templates.map((tpl) => ({
      id: tpl.id,
      order: tpl.order,
      name: tpl.name.trim(),
      session_type: tpl.session_type,
      expected_session_count: Math.max(0, tpl.expected_session_count || 0),
      objective: tpl.objective.trim() || null,
      pages: tpl.pages.trim() || null,
      completion_criteria: tpl.completion_criteria.trim() || null,
      support_notes: tpl.support_notes.trim() || null,
      active: tpl.active,
    }));
    const payload: DidacticSequenceCreatePayload = {
      name: name.trim(),
      school_id: mode === 'edit' ? initial!.school.id : Number(activeSchoolId),
      subject_id: Number(selection.subjectId),
      level_id: Number(selection.levelId),
      teaching_language_id: Number(languageId),
      track_id: selection.trackId ? Number(selection.trackId) : null,
      reference_id: referenceId ? Number(referenceId) : null,
      unit: unit.trim() || null,
      lesson: lesson.trim() || null,
      objectives: objectives.trim() || null,
      prerequisites: prerequisites.trim() || null,
      concepts_and_skills: conceptsAndSkills.trim() || null,
      pages: pages.trim() || null,
      completion_criteria: completionCriteria.trim() || null,
      support_activities: supportActivities.trim() || null,
      version_label: versionLabel.trim() || null,
      notes: notes.trim() || null,
      session_templates,
    };
    const res =
      mode === 'create'
        ? await createDidacticSequence(payload)
        : await updateDidacticSequence(initial!.id, payload);
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
          ? t('admin.teachingPlanning.sequences.createTitle')
          : t('admin.teachingPlanning.sequences.editTitle')
      }
      body={
        <div className="teaching-planning-dialog">
          {error ? <InfoBanner tone="amber" icon="⚠" title={error} /> : null}
          <label className="field">
            {t('admin.teachingPlanning.fields.name')}
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} dir="auto" disabled={saving} />
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
            idPrefix="sequence-ctx"
          />
          <label className="field">
            {t('admin.teachingPlanning.fields.reference')}
            <select
              className="select"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              disabled={saving}
            >
              <option value="">{t('admin.teachingPlanning.filters.referenceAll')}</option>
              {approvedReferences.map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {ref.name}
                </option>
              ))}
            </select>
          </label>
          <div className="teaching-planning-dialog__row">
            <label className="field">
              {t('admin.teachingPlanning.sequences.fields.unit')}
              <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} dir="auto" disabled={saving} />
            </label>
            <label className="field">
              {t('admin.teachingPlanning.sequences.fields.lesson')}
              <input className="input" value={lesson} onChange={(e) => setLesson(e.target.value)} dir="auto" disabled={saving} />
            </label>
          </div>
          <label className="field">
            {t('admin.teachingPlanning.sequences.fields.objectives')}
            <textarea className="textarea" value={objectives} onChange={(e) => setObjectives(e.target.value)} dir="auto" rows={2} disabled={saving} />
          </label>
          <label className="field">
            {t('admin.teachingPlanning.sequences.fields.prerequisites')}
            <textarea className="textarea" value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} dir="auto" rows={2} disabled={saving} />
          </label>
          <label className="field">
            {t('admin.teachingPlanning.sequences.fields.conceptsAndSkills')}
            <textarea className="textarea" value={conceptsAndSkills} onChange={(e) => setConceptsAndSkills(e.target.value)} dir="auto" rows={2} disabled={saving} />
          </label>
          <div className="teaching-planning-dialog__row">
            <label className="field">
              {t('admin.teachingPlanning.sequences.fields.pages')}
              <input className="input" value={pages} onChange={(e) => setPages(e.target.value)} dir="ltr" disabled={saving} />
            </label>
            <label className="field">
              {t('admin.teachingPlanning.fields.versionLabel')}
              <input className="input" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} dir="auto" disabled={saving} />
            </label>
          </div>
          <label className="field">
            {t('admin.teachingPlanning.sequences.fields.completionCriteria')}
            <textarea className="textarea" value={completionCriteria} onChange={(e) => setCompletionCriteria(e.target.value)} dir="auto" rows={2} disabled={saving} />
          </label>
          <label className="field">
            {t('admin.teachingPlanning.sequences.fields.supportActivities')}
            <textarea className="textarea" value={supportActivities} onChange={(e) => setSupportActivities(e.target.value)} dir="auto" rows={2} disabled={saving} />
          </label>
          <label className="field">
            {t('admin.teachingPlanning.fields.notes')}
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} dir="auto" rows={2} disabled={saving} />
          </label>

          <div className="tp-templates">
            <div className="between">
              <h4 className="tp-templates__title">
                {t('admin.teachingPlanning.sequences.templates.title')}
              </h4>
              <span className="muted tiny">
                {t('admin.teachingPlanning.sequences.templates.expectedTotal', {
                  count: expectedTotal,
                })}
              </span>
            </div>
            <p className="muted tiny">{t('admin.teachingPlanning.sequences.templates.hint')}</p>
            {templates.length === 0 ? (
              <p className="muted tiny">{t('admin.teachingPlanning.sequences.templates.empty')}</p>
            ) : (
              <ol className="tp-templates__list">
                {templates.map((tpl, index) => (
                  <li key={tpl.key} className="tp-templates__item">
                    <div className="tp-templates__reorder">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={saving || index === 0}
                        aria-label={t('admin.teachingPlanning.reorder.moveUp')}
                        onClick={() => setTemplates((prev) => moveUp(prev, index))}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={saving || index === templates.length - 1}
                        aria-label={t('admin.teachingPlanning.reorder.moveDown')}
                        onClick={() => setTemplates((prev) => moveDown(prev, index))}
                      >
                        ↓
                      </button>
                      <span className="tp-templates__order" aria-hidden="true">
                        <bdi dir="ltr">{tpl.order}</bdi>
                      </span>
                    </div>
                    <div className="tp-templates__fields">
                      <label>
                        {t('admin.teachingPlanning.sequences.templates.name')}
                        <input
                          className="input"
                          value={tpl.name}
                          onChange={(e) => updateTemplate(tpl.key, { name: e.target.value })}
                          dir="auto"
                          disabled={saving}
                        />
                      </label>
                      <div className="teaching-planning-dialog__row">
                        <label>
                          {t('admin.teachingPlanning.sequences.templates.sessionType')}
                          <select
                            className="select"
                            value={tpl.session_type}
                            onChange={(e) =>
                              updateTemplate(tpl.key, { session_type: e.target.value })
                            }
                            disabled={saving}
                          >
                            {SESSION_TYPE_OPTIONS.map((type) => (
                              <option key={type} value={type}>
                                {t(sessionTypeLabelKey(type))}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t('admin.teachingPlanning.sequences.templates.expectedSessions')}
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={tpl.expected_session_count}
                            onChange={(e) =>
                              updateTemplate(tpl.key, {
                                expected_session_count: Number(e.target.value),
                              })
                            }
                            dir="ltr"
                            disabled={saving}
                          />
                        </label>
                      </div>
                      <label>
                        {t('admin.teachingPlanning.sequences.templates.objective')}
                        <input
                          className="input"
                          value={tpl.objective}
                          onChange={(e) => updateTemplate(tpl.key, { objective: e.target.value })}
                          dir="auto"
                          disabled={saving}
                        />
                      </label>
                      <div className="teaching-planning-dialog__row">
                        <label>
                          {t('admin.teachingPlanning.sequences.templates.pages')}
                          <input
                            className="input"
                            value={tpl.pages}
                            onChange={(e) => updateTemplate(tpl.key, { pages: e.target.value })}
                            dir="ltr"
                            disabled={saving}
                          />
                        </label>
                        <label className="tp-templates__checkbox">
                          <input
                            type="checkbox"
                            checked={tpl.active}
                            onChange={(e) => updateTemplate(tpl.key, { active: e.target.checked })}
                            disabled={saving}
                          />
                          {t('admin.teachingPlanning.sequences.templates.active')}
                        </label>
                      </div>
                      <label>
                        {t('admin.teachingPlanning.sequences.templates.completionCriteria')}
                        <input
                          className="input"
                          value={tpl.completion_criteria}
                          onChange={(e) =>
                            updateTemplate(tpl.key, { completion_criteria: e.target.value })
                          }
                          dir="auto"
                          disabled={saving}
                        />
                      </label>
                      <label>
                        {t('admin.teachingPlanning.sequences.templates.supportNotes')}
                        <input
                          className="input"
                          value={tpl.support_notes}
                          onChange={(e) =>
                            updateTemplate(tpl.key, { support_notes: e.target.value })
                          }
                          dir="auto"
                          disabled={saving}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={saving}
                        onClick={() => removeTemplate(tpl.key)}
                      >
                        {t('admin.teachingPlanning.sequences.templates.remove')}
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={saving}
              onClick={addTemplate}
            >
              {t('admin.teachingPlanning.sequences.templates.add')}
            </button>
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
