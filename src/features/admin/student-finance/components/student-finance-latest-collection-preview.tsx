'use client';

import Link from 'next/link';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { CollectionRecordStatus } from '@/features/admin/student-finance/components/collection-record-status';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { PaymentCollection } from '@/types/finance';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import type { StudentFinanceWorkspace } from '../types';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import {
  pickLatestRecentCollection,
  readCollectionReceiptNumber,
} from '../utils/resolve-latest-collection-preview';
import { buildStudentFinanceWorkspaceHref } from '../utils/student-finance-sub-tab';

export function StudentFinanceLatestCollectionPreview({
  studentId,
  workspace,
  financialOverview,
}: {
  studentId: number;
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const latest = pickLatestRecentCollection(workspace?.recent_collections);
  if (!latest) return null;

  const currency = resolveStudentFinanceCurrency({
    financialOverview,
    workspaceSummary: workspace?.summary,
  });
  const receiptNumber = readCollectionReceiptNumber(latest);
  const collectionsHref = buildStudentFinanceWorkspaceHref(studentId, 'collections');

  return (
    <article className="student-finance-latest-collection-preview student-finance-bento__card">
      <header className="student-finance-latest-collection-preview__head">
        <h4 className="student-finance-bento__title">
          {t('admin.student360.financeWorkspace.latestCollectionPreview.title')}
        </h4>
        <Link href={collectionsHref} className="btn btn--ghost btn--sm">
          {t('admin.student360.financeWorkspace.latestCollectionPreview.viewCollectionsAndReceipts')}
        </Link>
      </header>
      <dl className="student-finance-latest-collection-preview__facts detail-list compact">
        <div>
          <dt>{t('admin.student360.financeOps.collections.amount')}</dt>
          <dd>
            <FinanceMoney amount={latest.amount ?? latest.total_amount} currency={latest.currency ?? currency} />
          </dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeOps.collections.method')}</dt>
          <dd>{paymentMethodLabel(latest.payment_method, t)}</dd>
        </div>
        <div>
          <dt>{t('admin.student360.financeOps.collections.date')}</dt>
          <dd>{formatDate(latest.collection_date ?? latest.payment_date ?? latest.date) || t('common.dash')}</dd>
        </div>
        {receiptNumber ? (
          <div>
            <dt>{t('admin.student360.financeWorkspace.latestCollectionPreview.receiptNumber')}</dt>
            <dd className="mono" dir="ltr">
              {receiptNumber}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.student360.financeOps.collections.state')}</dt>
          <dd>
            <CollectionRecordStatus row={latest} />
          </dd>
        </div>
      </dl>
    </article>
  );
}
