'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Paste-driven batch workspace for distribution lines (draft only). Flow:
 * paste TSV/spreadsheet → parse to rows → validate-batch (Backend authority) →
 * fix errors → apply-batch. No XLSX/CSV file upload. Apply stays disabled until
 * the last validation passed.
 */

import { useMemo, useState } from 'react';
import { Badge, InfoBanner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import {
  applyDistributionLinesBatch,
  validateDistributionLinesBatch,
} from '@/features/admin/teaching-planning/api/annual-distributions-api';
import {
  DISTRIBUTION_BATCH_MODES,
  distributionItemTypeLabelKey,
  parseDistributionBatchPaste,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { useT } from '@/features/i18n/locale-context';
import type {
  AnnualDistributionDetail,
  AnnualDistributionLinePayload,
  DistributionBatchApplyMode,
  DistributionBatchApplySummary,
  DistributionBatchRowError,
  DistributionBatchValidationResponse,
} from '@/types/teaching-planning';

export function DistributionBatchWorkspace({
  distribution,
  canManageLines,
  onApplied,
}: {
  distribution: AnnualDistributionDetail;
  canManageLines: boolean;
  onApplied: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<DistributionBatchApplyMode>('append');
  const [rows, setRows] = useState<AnnualDistributionLinePayload[]>([]);
  const [validation, setValidation] = useState<DistributionBatchValidationResponse | null>(null);
  const [summary, setSummary] = useState<DistributionBatchApplySummary | null>(null);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = distribution.state === 'draft';
  const canRun = canManageLines && isDraft;

  const errorByRow = useMemo(() => {
    const map = new Map<number, DistributionBatchRowError[]>();
    for (const err of validation?.errors ?? []) {
      const list = map.get(err.row) ?? [];
      list.push(err);
      map.set(err.row, list);
    }
    return map;
  }, [validation]);

  function parse() {
    const parsed = parseDistributionBatchPaste(text);
    setRows(parsed);
    setValidation(null);
    setSummary(null);
    setError(null);
  }

  async function validate() {
    if (validating || rows.length === 0) return;
    setValidating(true);
    setError(null);
    setSummary(null);
    const res = await validateDistributionLinesBatch(distribution.id, rows, mode);
    setValidating(false);
    if (!res.success) {
      setError(res.error.message);
      setValidation(null);
      return;
    }
    setValidation(res.data);
  }

  async function apply() {
    if (applying || !validation?.valid) return;
    setApplying(true);
    setError(null);
    const res = await applyDistributionLinesBatch(distribution.id, rows, mode);
    setApplying(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setSummary(res.data);
    if (res.data.errors.length === 0) {
      toast.success(t('admin.teachingPlanning.batch.applySuccess'));
      setText('');
      setRows([]);
      setValidation(null);
      onApplied();
    } else {
      toast.error(t('admin.teachingPlanning.batch.appliedWithErrors'));
      onApplied();
    }
  }

  if (!canRun) {
    return (
      <InfoBanner
        tone="blue"
        icon="🔒"
        title={t('admin.teachingPlanning.batch.unavailableTitle')}
        description={
          canManageLines
            ? t('admin.teachingPlanning.batch.draftOnlyDesc')
            : t('admin.teachingPlanning.lines.readOnlyDesc')
        }
      />
    );
  }

  return (
    <div className="tp-batch">
      <InfoBanner
        tone="blue"
        icon="📋"
        title={t('admin.teachingPlanning.batch.title')}
        description={t('admin.teachingPlanning.batch.hint')}
      />
      {error ? <InfoBanner tone="amber" icon="⚠" title={error} /> : null}

      <label className="tp-batch__paste">
        {t('admin.teachingPlanning.batch.pasteLabel')}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          dir="auto"
          placeholder={t('admin.teachingPlanning.batch.pastePlaceholder')}
        />
      </label>

      <div className="teaching-planning-page__actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={!text.trim()}
          onClick={parse}
        >
          {t('admin.teachingPlanning.batch.parse')}
        </button>
        <label className="tp-batch__mode">
          {t('admin.teachingPlanning.batch.mode')}
          <select
            className="select"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as DistributionBatchApplyMode);
              setValidation(null);
            }}
          >
            {DISTRIBUTION_BATCH_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`admin.teachingPlanning.batch.modes.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={rows.length === 0 || validating}
          onClick={() => void validate()}
        >
          {validating ? t('common.submitting') : t('admin.teachingPlanning.batch.validate')}
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!validation?.valid || applying}
          onClick={() => void apply()}
        >
          {applying ? t('common.submitting') : t('admin.teachingPlanning.batch.apply')}
        </button>
      </div>

      {validation ? (
        validation.valid ? (
          <InfoBanner
            tone="green"
            icon="✓"
            title={t('admin.teachingPlanning.batch.validTitle', { count: validation.row_count })}
          />
        ) : (
          <InfoBanner
            tone="amber"
            icon="⚠"
            title={t('admin.teachingPlanning.batch.invalidTitle', {
              count: validation.errors.length,
            })}
          />
        )
      ) : null}

      {rows.length > 0 ? (
        <div className="tp-batch__table-wrap">
          <table className="tp-batch__table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('admin.teachingPlanning.lines.itemType')}</th>
                <th>{t('admin.teachingPlanning.lines.name')}</th>
                <th>{t('admin.teachingPlanning.lines.periodLabel')}</th>
                <th>{t('admin.teachingPlanning.lines.dateStart')}</th>
                <th>{t('admin.teachingPlanning.lines.dateEnd')}</th>
                <th>{t('admin.teachingPlanning.lines.sessionCount')}</th>
                <th>{t('admin.teachingPlanning.batch.rowStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const rowErrors = errorByRow.get(index) ?? errorByRow.get(row.order) ?? [];
                return (
                  <tr key={index} className={rowErrors.length ? 'tp-batch__row--error' : ''}>
                    <td>
                      <bdi dir="ltr">{row.order}</bdi>
                    </td>
                    <td>{t(distributionItemTypeLabelKey(row.item_type))}</td>
                    <td dir="auto">{row.name || '—'}</td>
                    <td dir="auto">{row.period_label || '—'}</td>
                    <td dir="ltr">{row.date_start || '—'}</td>
                    <td dir="ltr">{row.date_end || '—'}</td>
                    <td dir="ltr">{row.session_count ?? '—'}</td>
                    <td>
                      {rowErrors.length ? (
                        <span className="tp-batch__row-errors">
                          {rowErrors.map((err, i) => (
                            <Badge key={i} tone="red">
                              {err.message || err.code}
                            </Badge>
                          ))}
                        </span>
                      ) : validation ? (
                        <Badge tone="green">{t('admin.teachingPlanning.batch.rowOk')}</Badge>
                      ) : (
                        <span className="muted tiny">
                          {t('admin.teachingPlanning.batch.rowPending')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {summary ? (
        <div className="tp-batch__summary">
          <Badge tone="green">
            {t('admin.teachingPlanning.batch.summaryCreated', { count: summary.created })}
          </Badge>
          <Badge tone="blue">
            {t('admin.teachingPlanning.batch.summaryUpdated', { count: summary.updated })}
          </Badge>
          <Badge tone="slate">
            {t('admin.teachingPlanning.batch.summarySkipped', { count: summary.skipped })}
          </Badge>
          {summary.errors.length ? (
            <Badge tone="red">
              {t('admin.teachingPlanning.batch.summaryErrors', { count: summary.errors.length })}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
