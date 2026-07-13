'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { InfoBanner } from '@/components/ui/primitives';
import { createReferenceJathatha, updateReferenceJathatha } from '@/features/admin/teaching-planning/api/reference-jathathas-api';
import { fetchDidacticSequence, fetchDidacticSequences } from '@/features/admin/teaching-planning/api/didactic-sequences-api';
import { fetchTeachingReferences } from '@/features/admin/teaching-planning/api/teaching-references-api';
import { JathathaActivitiesEditor } from '@/features/admin/teaching-planning/components/jathatha-activities-editor';
import { normalizeTeachingReferences } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import { useT } from '@/features/i18n/locale-context';
import { JATHATHA_DETAIL_LEVELS, type JathathaActivity, type ReferenceJathathaDetail, type ReferenceJathathaCreatePayload } from '@/types/jathatha';
import type { DidacticSequenceSummary } from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

const nullable = (value: string) => value.trim() || null;

export function ReferenceJathathaEditorDialog({
  open, mode, initial, onClose, onSaved,
}: {
  open: boolean; mode: 'create' | 'edit'; initial?: ReferenceJathathaDetail | null; onClose: () => void; onSaved: (item: ReferenceJathathaDetail) => void;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [sequenceId, setSequenceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [detailLevel, setDetailLevel] = useState('standard');
  const [activities, setActivities] = useState<JathathaActivity[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<ReturnType<typeof normalizeTeachingReferences>>([]);
  const [sequences, setSequences] = useState<DidacticSequenceSummary[]>([]);
  const [templates, setTemplates] = useState<Array<{ id?: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!open) return; void fetchTeachingReferences({ page_size: 200 }).then((res) => res.success && setReferences(res.data)); void fetchDidacticSequences({ page_size: 200 }).then((res) => res.success && setSequences(res.data)); }, [open]);
  useEffect(() => {
    if (!open) return;
    setError(null); setName(initial?.name ?? ''); setReferenceId(initial?.reference?.id ? String(initial.reference.id) : '');
    setSequenceId(initial?.sequence?.id ? String(initial.sequence.id) : ''); setTemplateId(initial?.session_template?.id ? String(initial.session_template.id) : '');
    setDetailLevel(initial?.default_detail_level ?? 'standard'); setActivities(initial?.activities ?? []);
    setFields(Object.fromEntries(['version_label', 'external_reference', 'objectives', 'prerequisites', 'materials_summary', 'pages', 'quick_assessment_plan', 'fallback_plan', 'expected_difficulties', 'general_guidance', 'correction_elements', 'support_activities', 'notes'].map((key) => [key, String(initial?.[key as keyof ReferenceJathathaDetail] ?? '')])));
  }, [open, initial]);
  useEffect(() => {
    if (!sequenceId) { setTemplates([]); return; }
    void fetchDidacticSequence(sequenceId).then((res) => {
      if (res.success) setTemplates(res.data.session_templates.map((item) => ({ id: item.id, name: item.name })));
    });
  }, [sequenceId]);

  const availableSequences = useMemo(() => sequences.filter((item) => !referenceId || item.reference?.id === Number(referenceId)), [sequences, referenceId]);
  const setField = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  async function save() {
    if (saving) return;
    if (!name.trim() || !referenceId || !sequenceId) { setError(t('admin.teachingPlanning.jathatha.validation.requiredContext')); return; }
    setSaving(true); setError(null);
    const payload: ReferenceJathathaCreatePayload = {
      name: name.trim(), teaching_reference_id: Number(referenceId), didactic_sequence_id: Number(sequenceId),
      sequence_session_template_id: templateId ? Number(templateId) : null, default_detail_level: detailLevel,
      activities, ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, nullable(value)])),
    } as ReferenceJathathaCreatePayload;
    const res = mode === 'create' ? await createReferenceJathatha(payload) : await updateReferenceJathatha(initial!.id, payload);
    setSaving(false);
    if (!res.success) { setError(res.error.message); return; }
    onSaved(res.data); onClose();
  }
  return (
    <ConfirmationDialog
      open={open}
      size="form"
      title={t(`admin.teachingPlanning.jathatha.reference.${mode}Title`)}
      body={
        <div className="teaching-planning-dialog">
          {error ? <InfoBanner tone="amber" icon="⚠" title={error} /> : null}
          <div className="teaching-planning-dialog__section">
            <label className="field">
              {t('admin.teachingPlanning.fields.name')}
              <input
                className="input"
                dir="auto"
                value={name}
                disabled={saving}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="teaching-planning-dialog__row">
              <label className="field">
                {t('admin.teachingPlanning.fields.reference')}
                <select
                  className="select"
                  value={referenceId}
                  disabled={saving}
                  onChange={(event) => {
                    setReferenceId(event.target.value);
                    setSequenceId('');
                    setTemplateId('');
                  }}
                >
                  <option value="">{t('admin.teachingPlanning.jathatha.selectReference')}</option>
                  {references.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t('admin.teachingPlanning.jathatha.sequence')}
                <select
                  className="select"
                  value={sequenceId}
                  disabled={saving || !referenceId}
                  onChange={(event) => {
                    setSequenceId(event.target.value);
                    setTemplateId('');
                  }}
                >
                  <option value="">{t('admin.teachingPlanning.jathatha.selectSequence')}</option>
                  {availableSequences.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t('admin.teachingPlanning.jathatha.template')}
                <select
                  className="select"
                  value={templateId}
                  disabled={saving || !sequenceId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  <option value="">{t('admin.teachingPlanning.jathatha.selectTemplate')}</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="teaching-planning-dialog__section">
            <div className="teaching-planning-dialog__row">
              <label className="field">
                {t('admin.teachingPlanning.jathatha.detailLevel')}
                <select
                  className="select"
                  value={detailLevel}
                  disabled={saving}
                  onChange={(event) => setDetailLevel(event.target.value)}
                >
                  {JATHATHA_DETAIL_LEVELS.map((item) => (
                    <option key={item} value={item}>
                      {t(`admin.teachingPlanning.jathatha.detailLevels.${item}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t('admin.teachingPlanning.fields.versionLabel')}
                <input
                  className="input"
                  dir="auto"
                  value={fields.version_label ?? ''}
                  disabled={saving}
                  onChange={(event) => setField('version_label', event.target.value)}
                />
              </label>
            </div>
            {[
              'external_reference',
              'objectives',
              'prerequisites',
              'materials_summary',
              'pages',
              'quick_assessment_plan',
              'fallback_plan',
              'expected_difficulties',
              'general_guidance',
              'correction_elements',
              'support_activities',
              'notes',
            ].map((key) => (
              <label className="field" key={key}>
                {t(`admin.teachingPlanning.jathatha.fields.${key}`)}
                <textarea
                  className="textarea"
                  dir="auto"
                  value={fields[key] ?? ''}
                  disabled={saving}
                  onChange={(event) => setField(key, event.target.value)}
                />
              </label>
            ))}
          </div>

          <JathathaActivitiesEditor value={activities} onChange={setActivities} detailLevel={detailLevel} />
        </div>
      }
      confirmLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
      loading={saving}
      onConfirm={save}
      onClose={onClose}
    />
  );
}
