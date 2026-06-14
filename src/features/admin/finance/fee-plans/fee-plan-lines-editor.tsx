'use client';

import { useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import type { FeeType } from '@/types/finance';
import { FeePlanLineDialog } from './fee-plan-line-dialog';
import { newDraftLine, type DraftFeePlanLine } from './fee-plan-types';

let lineCounter = 0;

function nextClientId() {
  lineCounter += 1;
  return `draft-line-${Date.now()}-${lineCounter}`;
}

export function FeePlanLinesEditor({
  lines,
  feeTypes,
  onChange,
  error,
}: {
  lines: DraftFeePlanLine[];
  feeTypes: FeeType[];
  onChange: (lines: DraftFeePlanLine[]) => void;
  error?: string | null;
}) {
  const t = useT();
  const [dialogLine, setDialogLine] = useState<DraftFeePlanLine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const feeTypeMap = useMemo(
    () => new Map(feeTypes.map((ft) => [ft.id, ft])),
    [feeTypes],
  );

  function openCreate() {
    setDialogLine(newDraftLine(nextClientId()));
    setDialogOpen(true);
  }

  function openEdit(line: DraftFeePlanLine) {
    setDialogLine({ ...line, installmentSchedule: line.installmentSchedule.map((row) => ({ ...row })) });
    setDialogOpen(true);
  }

  function saveLine(line: DraftFeePlanLine) {
    const exists = lines.some((l) => l.clientId === line.clientId);
    onChange(exists ? lines.map((l) => (l.clientId === line.clientId ? line : l)) : [...lines, line]);
  }

  function removeLine(clientId: string) {
    onChange(lines.filter((l) => l.clientId !== clientId));
  }

  return (
    <section className="fee-plan-lines-editor">
      <div className="fee-plan-lines-editor__head">
        <h4>{t('admin.finance.feePlansWorkspace.planLinesTitle')}</h4>
        <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
          {t('admin.finance.feePlansWorkspace.addLine')}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {lines.length === 0 ? (
        <p className="muted">{t('admin.finance.feePlansWorkspace.noLinesYet')}</p>
      ) : (
        <ul className="fee-plan-lines-editor__list">
          {lines.map((line) => {
            const ft = feeTypeMap.get(line.feeTypeId);
            return (
              <li key={line.clientId} className="card fee-plan-line-card">
                <div className="fee-plan-line-card__main">
                  <strong>{line.label || ft?.name || t('common.dash')}</strong>
                  <span className="mono muted">{ft?.code ?? t('common.dash')}</span>
                  <FinanceMoney amount={line.amount} currency={ft?.currency} />
                  <span className="fee-plan-line-card__badges">
                    {line.isOptional ? (
                      <span className="badge badge--slate">{t('admin.finance.feePlansWorkspace.optionalBadge')}</span>
                    ) : (
                      <span className="badge badge--blue">{t('admin.finance.feePlansWorkspace.requiredBadge')}</span>
                    )}
                    {line.installmentCount > 1 && (
                      <span className="badge badge--slate">
                        {t('admin.finance.feePlansWorkspace.installmentBadge', {
                          count: line.installmentCount,
                        })}
                      </span>
                    )}
                  </span>
                </div>
                <div className="fee-plan-line-card__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(line)}>
                    {t('common.edit')}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeLine(line.clientId)}>
                    {t('admin.finance.feePlansWorkspace.removeLine')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <FeePlanLineDialog
        open={dialogOpen}
        line={dialogLine}
        feeTypes={feeTypes}
        onSave={saveLine}
        onClose={() => setDialogOpen(false)}
      />
    </section>
  );
}
