'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import type { AgreementAmendmentOperationType } from '../types/agreement-amendment';
import type { AgreementAmendmentLineOption } from '../utils/resolve-amendment-form-options';
import { resolveReferenceLabel } from '../utils/reference-labels';
import { resolveAgreementAmendmentBlockReasonKey } from '../utils/agreement-amendment-line-display';
import {
  isLineFullyBlockedForAmendment,
  lineSupportsAdjustLineAmount,
  lineSupportsPeriodAmendment,
} from '../utils/agreement-amendment-line-eligibility';
import { isLineSelectableForAmendmentOperation } from '../utils/agreement-amendment-path';

function resolvePeriodBlockReasonLabel(
  line: AgreementAmendmentLineOption,
  t: (key: string) => string,
): string | null {
  const reason = line.amendmentBlockReason;
  if (!reason) {
    if (line.periodAmendable === false) {
      const fallbackKey =
        'admin.student360.financeWorkspace.agreementAmendment.reasonCodes.one_time_line_not_period_amendable_short';
      const fallback = t(fallbackKey);
      return fallback !== fallbackKey ? fallback : null;
    }
    return null;
  }
  const key = resolveAgreementAmendmentBlockReasonKey(reason);
  if (!key) return null;
  const translated = t(key);
  return translated !== key ? translated : null;
}

function resolveAmountBlockReasonLabel(
  line: AgreementAmendmentLineOption,
  t: (key: string) => string,
): string | null {
  const reason = line.amountAmendmentBlockReason;
  if (!reason) return null;
  const key = resolveAgreementAmendmentBlockReasonKey(reason);
  if (!key) return null;
  const translated = t(key);
  return translated !== key ? translated : null;
}

export function AgreementAmendmentLinePicker({
  lines,
  selectedLineId,
  currency,
  operationType,
  disabled,
  onSelect,
}: {
  lines: AgreementAmendmentLineOption[];
  selectedLineId: string;
  currency?: string | null;
  operationType: AgreementAmendmentOperationType;
  disabled?: boolean;
  onSelect: (lineId: string) => void;
}) {
  const t = useT();

  return (
    <div className="student-finance-amendment-line-picker">
      <p className="tiny muted student-finance-amendment-line-picker__hint">
        {t('admin.student360.financeWorkspace.agreementAmendment.selectLineHint')}
      </p>
      <ul
        className="student-finance-amendment-line-picker__list"
        role="listbox"
        aria-label={t('admin.student360.financeWorkspace.agreementAmendment.fields.line')}
      >
        {lines.map((line) => {
          const selectable = isLineSelectableForAmendmentOperation(line, operationType);
          const isSelected = selectedLineId === String(line.id);
          const periodBlockReason = resolvePeriodBlockReasonLabel(line, t);
          const amountBlockReason = resolveAmountBlockReasonLabel(line, t);
          const amountAmendable = lineSupportsAdjustLineAmount(line);
          const periodAmendable = lineSupportsPeriodAmendment(line);
          const fullyBlocked = isLineFullyBlockedForAmendment(line);

          return (
            <li key={line.id}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-disabled={!selectable}
                disabled={disabled || !selectable}
                className={[
                  'student-finance-amendment-line-picker__card',
                  isSelected ? 'student-finance-amendment-line-picker__card--selected' : '',
                  !selectable ? 'student-finance-amendment-line-picker__card--disabled' : '',
                  selectable && amountAmendable && !periodAmendable
                    ? 'student-finance-amendment-line-picker__card--amount-only'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  if (!selectable || disabled) return;
                  onSelect(String(line.id));
                }}
              >
                <div className="student-finance-amendment-line-picker__head">
                  <span className="student-finance-amendment-line-picker__name" dir="auto">
                    {line.label}
                  </span>
                  {line.duplicateServiceWarning ? (
                    <span className="student-finance-amendment-line-picker__badge">
                      {t('admin.student360.financeWorkspace.agreementAmendment.duplicateServiceWarning')}
                    </span>
                  ) : null}
                  {!periodAmendable ? (
                    <span className="student-finance-amendment-line-picker__badge student-finance-amendment-line-picker__badge--muted">
                      {t('admin.student360.financeWorkspace.agreementAmendment.notPeriodAmendable')}
                    </span>
                  ) : null}
                  {amountAmendable ? (
                    <span className="student-finance-amendment-line-picker__badge student-finance-amendment-line-picker__badge--positive">
                      {t('admin.student360.financeWorkspace.agreementAmendment.amountAmendableBadge')}
                    </span>
                  ) : null}
                </div>
                <dl className="student-finance-amendment-line-picker__meta">
                  <div>
                    <dt>{t('admin.student360.financialAgreement.columns.commitment')}</dt>
                    <dd dir="auto">
                      {line.commitmentType
                        ? resolveReferenceLabel(t, 'commitment_type', line.commitmentType)
                        : t('common.dash')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financialAgreement.columns.pricingUnit')}</dt>
                    <dd dir="auto">
                      {line.pricingUnit
                        ? resolveReferenceLabel(t, 'pricing_unit', line.pricingUnit)
                        : t('common.dash')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financialAgreement.columns.quantity')}</dt>
                    <dd>{line.quantity ?? t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financialAgreement.columns.unitPrice')}</dt>
                    <dd>
                      {line.unitPrice != null ? (
                        <FinanceMoney amount={line.unitPrice} currency={currency ?? undefined} />
                      ) : (
                        t('common.dash')
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financialAgreement.columns.net')}</dt>
                    <dd>
                      {line.amount != null ? (
                        <FinanceMoney amount={line.amount} currency={currency ?? undefined} />
                      ) : (
                        t('common.dash')
                      )}
                    </dd>
                  </div>
                </dl>
                {selectable && amountAmendable && !periodAmendable ? (
                  <p className="student-finance-amendment-line-picker__reason student-finance-amendment-line-picker__reason--positive">
                    {t('admin.student360.financeWorkspace.agreementAmendment.oneTimeAmountAmendableNote')}
                  </p>
                ) : null}
                {!selectable && fullyBlocked ? (
                  <p className="student-finance-amendment-line-picker__reason" role="note">
                    {amountBlockReason ??
                      periodBlockReason ??
                      t('admin.student360.financeWorkspace.agreementAmendment.lineAmountNotAmendable')}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
