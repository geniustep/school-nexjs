'use client';

import { useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { feeTypeFrequencyLabel } from '@/features/admin/finance/fee-types/fee-type-labels';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { FeeType } from '@/types/finance';
import { FeePlanLineDialog } from './fee-plan-line-dialog';
import type { FeePlanScopeCycleGroup } from './fee-plan-level-scope';
import { newDraftLine, type DraftFeePlanLine } from './fee-plan-types';
import { resolveFeeSetupCoreTypes } from './fee-setup-matrix-utils';
import { FeeSetupMatrix } from './fee-setup-matrix';

let lineCounter = 0;

function nextClientId() {
  lineCounter += 1;
  return `draft-line-${Date.now()}-${lineCounter}`;
}

export function FeePlanLinesEditor({
  lines,
  feeTypes,
  planLevelIds,
  scopeGroups,
  currency,
  onChange,
  onFeeTypeCreated,
  error,
  readOnly = false,
}: {
  lines: DraftFeePlanLine[];
  feeTypes: FeeType[];
  planLevelIds: number[];
  scopeGroups: FeePlanScopeCycleGroup[];
  currency?: string | null;
  onChange: (lines: DraftFeePlanLine[]) => void;
  onFeeTypeCreated: (feeType: FeeType) => void;
  error?: string | null;
  readOnly?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [dialogLine, setDialogLine] = useState<DraftFeePlanLine | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const core = useMemo(() => resolveFeeSetupCoreTypes(feeTypes), [feeTypes]);
  const hiddenFeeTypeIds = useMemo(
    () => new Set([core.registration?.id, core.monthlyTuition?.id].filter((id): id is number => id != null)),
    [core.registration?.id, core.monthlyTuition?.id],
  );
  const serviceLines = useMemo(
    () => lines.filter((line) => !hiddenFeeTypeIds.has(line.feeTypeId)),
    [lines, hiddenFeeTypeIds],
  );
  const serviceFeeTypes = useMemo(
    () => feeTypes.filter((type) => !hiddenFeeTypeIds.has(type.id)),
    [feeTypes, hiddenFeeTypeIds],
  );

  const feeTypeMap = useMemo(
    () => new Map(feeTypes.map((ft) => [ft.id, ft])),
    [feeTypes],
  );

  const servicesTitle =
    locale === 'ar'
      ? 'الخدمات الإضافية'
      : locale === 'fr'
        ? 'Services supplémentaires'
        : locale === 'es'
          ? 'Servicios adicionales'
          : 'Additional services';
  const addService =
    locale === 'ar'
      ? 'إضافة خدمة'
      : locale === 'fr'
        ? 'Ajouter un service'
        : locale === 'es'
          ? 'Añadir servicio'
          : 'Add service';
  const noServices =
    locale === 'ar'
      ? 'لا توجد خدمات إضافية بعد.'
      : locale === 'fr'
        ? 'Aucun service supplémentaire pour le moment.'
        : locale === 'es'
          ? 'Aún no hay servicios adicionales.'
          : 'No additional services yet.';

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

  function lineLevelLabel(line: DraftFeePlanLine): string {
    if (line.levelScopeMode === 'all_plan_levels') {
      return t('admin.finance.feePlansWorkspace.allPlanLevels');
    }
    if (!line.levelIds.length) return t('common.dash');
    const names = line.levelIds
      .map((id) => scopeGroups.flatMap((g) => g.levels).find((l) => l.schoolLevelId === id)?.name)
      .filter(Boolean);
    return names.length ? names.join(', ') : String(line.levelIds.length);
  }

  return (
    <div className="fee-plan-lines-editor">
      <FeeSetupMatrix
        lines={lines}
        feeTypes={feeTypes}
        planLevelIds={planLevelIds}
        scopeGroups={scopeGroups}
        readOnly={readOnly}
        onChange={onChange}
      />

      <section className="fee-plan-lines-editor__services">
        <div className="fee-plan-lines-editor__head">
          <h4>{servicesTitle}</h4>
          {!readOnly ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
              {addService}
            </button>
          ) : null}
        </div>
        {error && <p className="form-error">{error}</p>}
        {serviceLines.length === 0 ? (
          <p className="muted">{noServices}</p>
        ) : (
          <ul className="fee-plan-lines-editor__list">
            {serviceLines.map((line) => {
              const ft = feeTypeMap.get(line.feeTypeId);
              return (
                <li key={line.clientId} className="card fee-plan-line-card">
                  <div className="fee-plan-line-card__main">
                    <strong>{line.label || ft?.name || t('common.dash')}</strong>
                    <span className="mono muted">{ft?.code ?? t('common.dash')}</span>
                    <FinanceMoney amount={line.amount} currency={currency ?? undefined} />
                    <span className="muted">{feeTypeFrequencyLabel(line.frequency, t)}</span>
                    <span className="muted">{lineLevelLabel(line)}</span>
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
                  {!readOnly ? (
                    <div className="fee-plan-line-card__actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(line)}>
                        {t('common.edit')}
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeLine(line.clientId)}>
                        {t('admin.finance.feePlansWorkspace.removeLine')}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!readOnly ? (
        <FeePlanLineDialog
          open={dialogOpen}
          line={dialogLine}
          feeTypes={serviceFeeTypes}
          planLevelIds={planLevelIds}
          scopeGroups={scopeGroups}
          onSave={saveLine}
          onClose={() => setDialogOpen(false)}
          onFeeTypeCreated={onFeeTypeCreated}
        />
      ) : null}
    </div>
  );
}
