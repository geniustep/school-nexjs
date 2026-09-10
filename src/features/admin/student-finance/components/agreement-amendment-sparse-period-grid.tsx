'use client';

import { useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type {
  AgreementAmendmentPeriodImpact,
  AgreementAmendmentPeriodOption,
} from '../types/agreement-amendment';
import { formatAmendmentEffectivePeriodLabel } from '../utils/agreement-amendment-period-labels';
import './agreement-amendment-sparse-period-ux.css';

const COPY = {
  ar: {
    selected: 'ضمن التعديل',
    excluded: 'غير مشمول',
    specialPrice: 'سعر خاص',
    specialPriceForMonth: 'سعر خاص لهذا الشهر',
    removeSpecialPrice: 'إلغاء السعر الخاص',
    current: 'الحالي',
    proposed: 'بعد التعديل',
    unavailable: 'غير قابل للتعديل',
  },
  fr: {
    selected: 'Inclus',
    excluded: 'Exclu',
    specialPrice: 'Prix spécial',
    specialPriceForMonth: 'Prix spécial pour ce mois',
    removeSpecialPrice: 'Supprimer le prix spécial',
    current: 'Actuel',
    proposed: 'Après modification',
    unavailable: 'Non modifiable',
  },
  en: {
    selected: 'Included',
    excluded: 'Excluded',
    specialPrice: 'Special price',
    specialPriceForMonth: 'Special price for this month',
    removeSpecialPrice: 'Remove special price',
    current: 'Current',
    proposed: 'After change',
    unavailable: 'Not amendable',
  },
  es: {
    selected: 'Incluido',
    excluded: 'Excluido',
    specialPrice: 'Precio especial',
    specialPriceForMonth: 'Precio especial para este mes',
    removeSpecialPrice: 'Quitar precio especial',
    current: 'Actual',
    proposed: 'Después del cambio',
    unavailable: 'No modificable',
  },
} as const;

export function AgreementAmendmentSparsePeriodGrid({
  periods,
  selectedPeriodIds,
  periodAmountOverrides,
  periodImpacts,
  baseCurrentAmount,
  currency,
  loading,
  disabled,
  onToggle,
  onOverrideChange,
  onOverrideClear,
}: {
  periods: AgreementAmendmentPeriodOption[];
  selectedPeriodIds: string[];
  periodAmountOverrides: Record<string, string>;
  periodImpacts: AgreementAmendmentPeriodImpact[];
  baseCurrentAmount?: number | null;
  currency?: string | null;
  loading?: boolean;
  disabled?: boolean;
  onToggle: (periodId: string) => void;
  onOverrideChange: (periodId: string, amount: string) => void;
  onOverrideClear: (periodId: string) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);

  if (loading) {
    return <span className="tiny muted">{t('common.loading')}</span>;
  }

  return (
    <div className="student-finance-amendment-sparse-periods">
      {periods.map((period) => {
        const id = String(period.id);
        const selectable = period.selectable !== false;
        const selected = selectedPeriodIds.includes(id);
        const overrideValue = periodAmountOverrides[id] ?? '';
        const hasOverride = overrideValue.trim() !== '';
        const impact = periodImpacts.find((item) => item.effectivePeriodId === period.id) ?? null;
        const currentAmount = impact?.currentAmount ?? baseCurrentAmount ?? null;
        const proposedAmount = impact?.proposedAmount ?? null;
        const label = formatAmendmentEffectivePeriodLabel(period, t);
        const editing = editingOverrideId === id;

        return (
          <article
            key={period.id}
            className={[
              'student-finance-amendment-sparse-period',
              selected ? 'is-selected' : 'is-excluded',
              !selectable ? 'is-disabled' : '',
              hasOverride ? 'has-override' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <label className="student-finance-amendment-sparse-period__toggle">
              <input
                type="checkbox"
                checked={selected}
                disabled={disabled || !selectable}
                onChange={() => onToggle(id)}
              />
              <span className="student-finance-amendment-sparse-period__check" aria-hidden>
                {selected ? '✓' : ''}
              </span>
              <span className="student-finance-amendment-sparse-period__month" dir="auto">
                {label}
              </span>
              <span className="tiny muted">
                {!selectable ? copy.unavailable : selected ? copy.selected : copy.excluded}
              </span>
            </label>

            <div className="student-finance-amendment-sparse-period__money">
              {currentAmount != null ? (
                <span>
                  <span className="tiny muted">{copy.current}</span>{' '}
                  <FinanceMoney amount={currentAmount} currency={currency ?? undefined} />
                </span>
              ) : null}
              {proposedAmount != null ? (
                <span className="student-finance-amendment-sparse-period__proposed">
                  <span className="tiny muted">{copy.proposed}</span>{' '}
                  <FinanceMoney amount={proposedAmount} currency={currency ?? undefined} />
                </span>
              ) : null}
            </div>

            {selected && selectable ? (
              <div className="student-finance-amendment-sparse-period__override">
                {!editing ? (
                  <button
                    type="button"
                    className="student-finance-amendment-sparse-period__override-trigger"
                    onClick={() => setEditingOverrideId(id)}
                    disabled={disabled}
                  >
                    {hasOverride ? `● ${copy.specialPrice}` : `+ ${copy.specialPrice}`}
                  </button>
                ) : (
                  <div className="student-finance-amendment-sparse-period__override-editor">
                    <label>
                      <span className="tiny muted">{copy.specialPriceForMonth}</span>
                      <input
                        className="input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={overrideValue}
                        autoFocus
                        onChange={(event) => onOverrideChange(id, event.target.value)}
                        disabled={disabled}
                      />
                    </label>
                    <div className="row">
                      {hasOverride ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            onOverrideClear(id);
                            setEditingOverrideId(null);
                          }}
                          disabled={disabled}
                        >
                          {copy.removeSpecialPrice}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setEditingOverrideId(null)}
                      >
                        {t('common.close')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
