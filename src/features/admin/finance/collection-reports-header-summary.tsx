'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Compact operational summary for collection reports. Financial values are
 * presented directly from the backend aggregation contract; no client-side
 * financial truth is recomputed here.
 */

import { useMemo } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  buildCollectionReportsAggregationsQuery,
  normalizeCollectionReportsAggregationsPayload,
  primaryAggregationAmount,
  type CollectionReportsFilters,
} from '@/features/admin/finance/utils/collection-reports-present';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { paymentMethodLabel } from '@/lib/utils/finance';

const HEADER_COPY = {
  ar: {
    operationDate: 'تاريخ العملية',
    period: 'الفترة',
    from: 'من',
    to: 'إلى',
    totalAmount: 'المبلغ الكامل',
    byPaymentMethod: 'حسب وسيلة الدفع',
    operations: 'عدد العمليات',
  },
  en: {
    operationDate: 'Operation date',
    period: 'Period',
    from: 'From',
    to: 'to',
    totalAmount: 'Total amount',
    byPaymentMethod: 'By payment method',
    operations: 'Operations',
  },
  fr: {
    operationDate: "Date de l'opération",
    period: 'Période',
    from: 'Du',
    to: 'au',
    totalAmount: 'Montant total',
    byPaymentMethod: 'Par moyen de paiement',
    operations: 'Opérations',
  },
  es: {
    operationDate: 'Fecha de la operación',
    period: 'Periodo',
    from: 'Del',
    to: 'al',
    totalAmount: 'Importe total',
    byPaymentMethod: 'Por medio de pago',
    operations: 'Operaciones',
  },
} as const;

export function CollectionReportsHeaderSummary({ filters }: { filters: CollectionReportsFilters }) {
  const t = useT();
  const { locale } = useLocale();
  const copy = HEADER_COPY[locale];
  const { formatDate } = useFormat();
  const query = useMemo(() => buildCollectionReportsAggregationsQuery(filters), [filters]);
  const state = useAdminResource<unknown>(
    endpoints.admin.financeCollectionReportsAggregations,
    query,
  );
  const payload = useMemo(
    () => normalizeCollectionReportsAggregationsPayload(state.data),
    [state.data],
  );
  const summary = payload?.summary ?? null;
  const currency = summary?.currency_name ?? summary?.currency_id;
  const paymentMethodRows = payload?.aggregations.by_payment_method ?? [];
  const visiblePaymentMethods = paymentMethodRows.filter(
    (row) => primaryAggregationAmount('payment_method', row) !== 0,
  );

  const dateValue =
    filters.dateMode === 'range'
      ? `${copy.from} ${formatDate(filters.dateFrom)} ${copy.to} ${formatDate(filters.dateTo)}`
      : formatDate(filters.date);

  return (
    <section className="finance-collection-reports-header-summary" aria-live="polite">
      <div className="finance-collection-reports-header-summary__item finance-collection-reports-header-summary__date">
        <span className="finance-collection-reports-header-summary__label">
          {filters.dateMode === 'range' ? copy.period : copy.operationDate}
        </span>
        <strong className="finance-collection-reports-header-summary__value" dir="auto">
          {dateValue}
        </strong>
      </div>

      <div className="finance-collection-reports-header-summary__item finance-collection-reports-header-summary__total">
        <span className="finance-collection-reports-header-summary__label">{copy.totalAmount}</span>
        <strong className="finance-collection-reports-header-summary__value">
          {summary ? (
            <FinanceMoney
              amount={summary.total_confirmed_collections_amount}
              currency={currency}
            />
          ) : (
            <span className="finance-collection-reports-header-summary__placeholder">—</span>
          )}
        </strong>
      </div>

      <div className="finance-collection-reports-header-summary__item finance-collection-reports-header-summary__methods">
        <span className="finance-collection-reports-header-summary__label">{copy.byPaymentMethod}</span>
        <div className="finance-collection-reports-header-summary__method-list">
          {visiblePaymentMethods.length ? (
            visiblePaymentMethods.map((row) => (
              <span
                key={String(row.id ?? row.display_name)}
                className="finance-collection-reports-header-summary__method"
              >
                <span dir="auto">
                  {paymentMethodLabel(String(row.id ?? row.display_name ?? ''), t)}
                </span>
                <strong>
                  <FinanceMoney
                    amount={primaryAggregationAmount('payment_method', row)}
                    currency={currency}
                  />
                </strong>
              </span>
            ))
          ) : (
            <span className="finance-collection-reports-header-summary__placeholder">—</span>
          )}
        </div>
      </div>

      <div className="finance-collection-reports-header-summary__item finance-collection-reports-header-summary__count">
        <span className="finance-collection-reports-header-summary__label">{copy.operations}</span>
        <strong className="finance-collection-reports-header-summary__value" dir="ltr">
          {summary?.collections_count ?? '—'}
        </strong>
      </div>
    </section>
  );
}
