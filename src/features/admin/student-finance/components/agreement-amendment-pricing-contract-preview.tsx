'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import type { AgreementAmendmentPricingContract } from '../types/agreement-amendment';

export function AgreementAmendmentPricingContractPreview({
  contract,
  currency,
}: {
  contract: AgreementAmendmentPricingContract;
  currency: string | null;
}) {
  const t = useT();
  const base = 'admin.student360.financeWorkspace.agreementAmendment.pricingContract';

  return (
    <section className="student-finance-amendment-preview__pricing-contract" aria-label={t(`${base}.title`)}>
      <h4>{t(`${base}.title`)}</h4>
      <dl className="detail-list compact">
        {contract.currentUnitPrice != null ? (
          <div>
            <dt>{t(`${base}.currentUnitPrice`)}</dt>
            <dd>
              <FinanceMoney amount={contract.currentUnitPrice} currency={currency ?? undefined} />
            </dd>
          </div>
        ) : null}
        {contract.newUnitPrice != null ? (
          <div>
            <dt>{t(`${base}.newUnitPrice`)}</dt>
            <dd>
              <FinanceMoney amount={contract.newUnitPrice} currency={currency ?? undefined} />
            </dd>
          </div>
        ) : null}
        {contract.affectedPeriodCount != null ? (
          <div>
            <dt>{t(`${base}.affectedPeriodCount`)}</dt>
            <dd>{contract.affectedPeriodCount}</dd>
          </div>
        ) : null}
        {contract.currentTotalForAffectedPeriods != null ? (
          <div>
            <dt>{t(`${base}.currentTotal`)}</dt>
            <dd>
              <FinanceMoney
                amount={contract.currentTotalForAffectedPeriods}
                currency={currency ?? undefined}
              />
            </dd>
          </div>
        ) : null}
        {contract.newTotalForAffectedPeriods != null ? (
          <div>
            <dt>{t(`${base}.newTotal`)}</dt>
            <dd>
              <FinanceMoney
                amount={contract.newTotalForAffectedPeriods}
                currency={currency ?? undefined}
              />
            </dd>
          </div>
        ) : null}
        {contract.deltaTotal != null ? (
          <div>
            <dt>{t(`${base}.deltaTotal`)}</dt>
            <dd>
              <FinanceMoney amount={contract.deltaTotal} currency={currency ?? undefined} />
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
