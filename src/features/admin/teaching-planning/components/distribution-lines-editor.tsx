'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Manual, keyboard-accessible lines editor for a draft Annual Distribution.
 * Ordering uses move up/down buttons (never drag-only). Persisted via the
 * apply-batch endpoint in `replace` mode. Distribution ≠ timetable: lines are
 * instructional items, not weekly slots.
 */

import { useEffect, useMemo, useState } from 'react';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { EmptyState } from '@/components/states/states';
import { InfoBanner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { applyDistributionLinesBatch } from '@/features/admin/teaching-planning/api/annual-distributions-api';
import { normalizeDidacticSequences } from '@/features/admin/teaching-planning/utils/normalize-didactic-distribution';
import {
  DISTRIBUTION_ITEM_TYPE_OPTIONS,
  distributionItemTypeLabelKey,
  distributionLinesToPayload,
  moveDown,
  moveUp,
  renumberOrder,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type {
  AnnualDistributionDetail,
  AnnualDistributionLine,
  DidacticSequenceSummary,
} from '@/types/teaching-planning';

interface LineDraft {
  key: string;
  id?: number;
  order: number;
  item_type: string;
  sequence: { id: number; name: string } | null;
  name: string;
  period_label: string;
  date_start: string;
  date_end: string;
  session_count: string;
  external_reference: string;
  notes: string;
}

let lineSeq = 0;
function toDraft(line: AnnualDistributionLine, index: number): LineDraft {
  lineSeq += 1;
  return {
    key: `line-${lineSeq}`,
    id: line.id,
    order: line.order || index + 1,
    item_type: line.item_type,
    sequence: line.sequence ? { id: line.sequence.id, name: line.sequence.name } : null,
    name: line.name ?? '',
    period_label: line.period_label ?? '',
    date_start: line.date_start ?? '',
    date_end: line.date_end ?? '',
    session_count: line.session_count != null ? String(line.session_count) : '',
    external_reference: line.external_reference ?? '',
    notes: line.notes ?? '',
  };
}

function emptyDraft(order: number): LineDraft {
  lineSeq += 1;
  return {
    key: `line-${lineSeq}`,
    order,
    item_type: 'sequence',
    sequence: null,
    name: '',
    period_label: '',
    date_start: '',
    date_end: '',
    session_count: '',
    external_reference: '',
    notes: '',
  };
}

export function DistributionLinesEditor({
  distribution,
  canManageLines,
  onSaved,
}: {
  distribution: AnnualDistributionDetail;
  canManageLines: boolean;
  onSaved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [rows, setRows] = useState<LineDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sequencesState = useAdminResource(
    canManageLines ? endpoints.admin.didacticSequences : null,
    { page_size: 200, state: 'approved' },
  );
  const sequences: DidacticSequenceSummary[] = useMemo(
    () => normalizeDidacticSequences(sequencesState.data),
    [sequencesState.data],
  );

  useEffect(() => {
    setRows(distribution.lines.map(toDraft));
    setDirty(false);
    setError(null);
  }, [distribution.lines]);

  function patchRow(key: string, patch: Partial<LineDraft>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setDirty(true);
  }

  function addRow() {
    setRows((prev) => renumberOrder([...prev, emptyDraft(prev.length + 1)]));
    setDirty(true);
  }

  function removeRow(key: string) {
    setRows((prev) => renumberOrder(prev.filter((row) => row.key !== key)));
    setDirty(true);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const payload = distributionLinesToPayload(
      rows.map((row) => ({
        id: row.id,
        order: row.order,
        item_type: row.item_type,
        sequence: row.sequence ? { id: row.sequence.id } : null,
        name: row.name.trim() || null,
        period_label: row.period_label.trim() || null,
        date_start: row.date_start || null,
        date_end: row.date_end || null,
        session_count: row.session_count ? Number(row.session_count) : null,
        external_reference: row.external_reference.trim() || null,
        notes: row.notes.trim() || null,
      })),
    );
    const res = await applyDistributionLinesBatch(distribution.id, payload, 'replace');
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    if (res.data.errors.length > 0) {
      setError(t('admin.teachingPlanning.batch.appliedWithErrors'));
      return;
    }
    toast.success(t('admin.teachingPlanning.lines.saveSuccess'));
    setDirty(false);
    onSaved();
  }

  if (!canManageLines) {
    return (
      <div className="tp-lines">
        <InfoBanner
          tone="blue"
          icon="🔒"
          title={t('admin.teachingPlanning.lines.readOnlyTitle')}
          description={t('admin.teachingPlanning.lines.readOnlyDesc')}
        />
        {distribution.lines.length === 0 ? (
          <EmptyState
            compact
            icon="🗂️"
            title={t('admin.teachingPlanning.lines.emptyTitle')}
            description={t('admin.teachingPlanning.lines.emptyDesc')}
          />
        ) : (
          <ol className="tp-lines__read">
            {distribution.lines.map((line) => (
              <li key={line.id ?? line.order} className="tp-lines__read-item">
                <span className="tp-templates__order">
                  <bdi dir="ltr">{line.order}</bdi>
                </span>
                <strong dir="auto">
                  {line.sequence?.name || line.name || t('common.dash')}
                </strong>
                <span className="muted tiny">{t(distributionItemTypeLabelKey(line.item_type))}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="tp-lines">
      {error ? <InfoBanner tone="amber" icon="⚠" title={error} /> : null}
      {rows.length === 0 ? (
        <EmptyState
          compact
          icon="🗂️"
          title={t('admin.teachingPlanning.lines.emptyTitle')}
          description={t('admin.teachingPlanning.lines.emptyDesc')}
        />
      ) : (
        <ol className="tp-lines__list">
          {rows.map((row, index) => (
            <li key={row.key} className="tp-lines__item">
              <div className="tp-templates__reorder">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={saving || index === 0}
                  aria-label={t('admin.teachingPlanning.reorder.moveUp')}
                  onClick={() => {
                    setRows((prev) => moveUp(prev, index));
                    setDirty(true);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={saving || index === rows.length - 1}
                  aria-label={t('admin.teachingPlanning.reorder.moveDown')}
                  onClick={() => {
                    setRows((prev) => moveDown(prev, index));
                    setDirty(true);
                  }}
                >
                  ↓
                </button>
                <span className="tp-templates__order" aria-hidden="true">
                  <bdi dir="ltr">{row.order}</bdi>
                </span>
              </div>
              <div className="tp-lines__fields">
                <div className="teaching-planning-dialog__row">
                  <label>
                    {t('admin.teachingPlanning.lines.itemType')}
                    <select
                      value={row.item_type}
                      onChange={(e) => patchRow(row.key, { item_type: e.target.value })}
                      disabled={saving}
                    >
                      {DISTRIBUTION_ITEM_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {t(distributionItemTypeLabelKey(type))}
                        </option>
                      ))}
                    </select>
                  </label>
                  {row.item_type === 'sequence' ? (
                    <label>
                      {t('admin.teachingPlanning.lines.sequence')}
                      <select
                        value={row.sequence?.id ?? ''}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          const seq = sequences.find((s) => s.id === id) ?? null;
                          patchRow(row.key, {
                            sequence: seq ? { id: seq.id, name: seq.name } : null,
                          });
                        }}
                        disabled={saving}
                      >
                        <option value="">{t('admin.teachingPlanning.lines.selectSequence')}</option>
                        {row.sequence && !sequences.some((s) => s.id === row.sequence!.id) ? (
                          <option value={row.sequence.id}>{row.sequence.name}</option>
                        ) : null}
                        {sequences.map((seq) => (
                          <option key={seq.id} value={seq.id}>
                            {seq.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      {t('admin.teachingPlanning.lines.name')}
                      <input
                        value={row.name}
                        onChange={(e) => patchRow(row.key, { name: e.target.value })}
                        dir="auto"
                        disabled={saving}
                      />
                    </label>
                  )}
                </div>
                <div className="teaching-planning-dialog__row">
                  <label>
                    {t('admin.teachingPlanning.lines.periodLabel')}
                    <input
                      value={row.period_label}
                      onChange={(e) => patchRow(row.key, { period_label: e.target.value })}
                      dir="auto"
                      disabled={saving}
                    />
                  </label>
                  <label>
                    {t('admin.teachingPlanning.lines.sessionCount')}
                    <input
                      type="number"
                      min={0}
                      value={row.session_count}
                      onChange={(e) => patchRow(row.key, { session_count: e.target.value })}
                      dir="ltr"
                      disabled={saving}
                    />
                  </label>
                </div>
                <div className="teaching-planning-dialog__row">
                  <label>
                    {t('admin.teachingPlanning.lines.dateStart')}
                    <DatePickerInput
                      value={row.date_start}
                      onChange={(value) => patchRow(row.key, { date_start: value })}
                      disabled={saving}
                      presets={false}
                    />
                  </label>
                  <label>
                    {t('admin.teachingPlanning.lines.dateEnd')}
                    <DatePickerInput
                      value={row.date_end}
                      onChange={(value) => patchRow(row.key, { date_end: value })}
                      disabled={saving}
                      presets={false}
                      min={row.date_start || undefined}
                    />
                  </label>
                </div>
                <label>
                  {t('admin.teachingPlanning.lines.externalReference')}
                  <input
                    value={row.external_reference}
                    onChange={(e) => patchRow(row.key, { external_reference: e.target.value })}
                    dir="ltr"
                    disabled={saving}
                  />
                </label>
                <label>
                  {t('admin.teachingPlanning.lines.notes')}
                  <input
                    value={row.notes}
                    onChange={(e) => patchRow(row.key, { notes: e.target.value })}
                    dir="auto"
                    disabled={saving}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={saving}
                  onClick={() => removeRow(row.key)}
                >
                  {t('admin.teachingPlanning.lines.remove')}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="teaching-planning-page__actions" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={addRow}>
          {t('admin.teachingPlanning.lines.add')}
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={saving || !dirty}
          onClick={() => void save()}
        >
          {saving ? t('common.submitting') : t('admin.teachingPlanning.lines.save')}
        </button>
      </div>
    </div>
  );
}
