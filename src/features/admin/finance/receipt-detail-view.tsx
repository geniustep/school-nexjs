'use client';

import Link from 'next/link';
import { DataTable, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { ReceiptPdfActions } from '@/features/admin/finance/receipt-pdf-actions';
import {
  ReceiptSettlementBadge,
  ReceiptStateBadge,
} from '@/features/admin/finance/receipt-status-badges';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { buildStudentFinanceLink } from '@/lib/utils/finance-navigation';
import type { FinanceReceipt, FinanceReceiptAllocation } from '@/types/finance';

function DetailField({
  label,
  children,
  hideWhenEmpty,
}: {
  label: string;
  children: React.ReactNode;
  hideWhenEmpty?: boolean;
}) {
  if (hideWhenEmpty && (children == null || children === false || children === '')) return null;
  return (
    <div className="finance-detail-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ReceiptDetailView({
  receipt,
  returnTo,
}: {
  receipt: FinanceReceipt;
  returnTo?: string;
}) {
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const snapshot = receipt.snapshot;
  const student = snapshot?.student;
  const school = snapshot?.school;
  const collection = snapshot?.collection;
  const cheque = receipt.cheque ?? snapshot?.cheque;
  const issuedBy =
    typeof receipt.issued_by === 'string'
      ? receipt.issued_by
      : receipt.issued_by && typeof receipt.issued_by === 'object'
        ? receipt.issued_by.name
        : snapshot?.audit?.created_by;

  const allocationColumns: Column<FinanceReceiptAllocation>[] = [
    {
      key: 'description',
      header: t('admin.finance.receipts.columns.description'),
      render: (row) => (
        <span dir="auto">{row.description ?? row.label ?? t('common.dash')}</span>
      ),
    },
    {
      key: 'due_date',
      header: t('admin.finance.receipts.columns.dueDate'),
      render: (row) => formatDate(row.due_date) || t('common.dash'),
    },
    {
      key: 'amount',
      header: t('admin.finance.receipts.columns.paidThisReceipt'),
      render: (row) => <FinanceMoney amount={row.amount} currency={receipt.currency} />,
    },
    {
      key: 'remaining_after_payment',
      header: t('admin.finance.receipts.columns.remainingAfterPayment'),
      render: (row) =>
        row.is_partial || (row.remaining_after_payment != null && row.remaining_after_payment > 0) ? (
          <FinanceMoney amount={row.remaining_after_payment} currency={receipt.currency} />
        ) : (
          t('common.dash')
        ),
    },
  ];

  const allocations = receipt.allocations ?? snapshot?.allocations ?? [];
  const children = receipt.children ?? snapshot?.children ?? [];

  return (
    <div className="receipt-details">
      <header className="receipt-details__header">
        <div className="receipt-details__header-main">
          <h1 className="receipt-details__title">
            {receipt.number ?? receipt.receipt_number ?? `#${receipt.id}`}
          </h1>
          <div className="receipt-details__meta">
            <ReceiptStateBadge state={receipt.state ?? 'issued'} />
            {receipt.settlement_status ? (
              <ReceiptSettlementBadge status={receipt.settlement_status} />
            ) : null}
            <span>{formatDateTime(receipt.issued_at) || t('common.dash')}</span>
          </div>
        </div>
        <ReceiptPdfActions receipt={receipt} />
      </header>

      <div className="receipt-details__grid">
        <section className="card receipt-details__section">
          <h2>{t('admin.finance.receipts.sections.receiptInfo')}</h2>
          <dl className="finance-detail-fields">
            <DetailField label={t('admin.finance.receipts.fields.number')}>
              <span className="mono">{receipt.number ?? receipt.receipt_number ?? t('common.dash')}</span>
            </DetailField>
            <DetailField label={t('academic.status')}>
              <ReceiptStateBadge state={receipt.state ?? 'issued'} />
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.issuedAt')}>
              {formatDateTime(receipt.issued_at) || t('common.dash')}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.issuedBy')} hideWhenEmpty>
              {issuedBy ? <span dir="auto">{issuedBy}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.legacy')}>
              {receipt.generated_from_legacy
                ? t('admin.finance.receipts.legacyYes')
                : t('admin.finance.receipts.legacyNo')}
            </DetailField>
          </dl>
        </section>

        <section className="card receipt-details__section">
          <h2>{t('admin.finance.receipts.sections.school')}</h2>
          <dl className="finance-detail-fields">
            <DetailField label={t('admin.finance.receipts.fields.schoolName')}>
              <span dir="auto">{school?.name ?? t('common.dash')}</span>
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.schoolPhone')} hideWhenEmpty>
              {school?.phone ? <span dir="auto">{school.phone}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.schoolAddress')} hideWhenEmpty>
              {school?.address ? <span dir="auto">{school.address}</span> : null}
            </DetailField>
          </dl>
        </section>

        <section className="card receipt-details__section">
          <h2>{t('admin.finance.receipts.sections.parties')}</h2>
          <dl className="finance-detail-fields">
            <DetailField label={t('nav.students')}>
              {receipt.student_id ? (
                <Link href={buildStudentFinanceLink(receipt.student_id, 'finance', returnTo)} dir="auto">
                  {student?.name ?? receipt.student_name ?? t('common.dash')}
                </Link>
              ) : (
                <span dir="auto">{student?.name ?? receipt.student_name ?? t('common.dash')}</span>
              )}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.studentCode')} hideWhenEmpty>
              {student?.code ? <span className="mono">{student.code}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.classLevel')} hideWhenEmpty>
              {student?.class_name || student?.level_name ? (
                <span dir="auto">
                  {[student.class_name, student.level_name].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.payer')}>
              <span dir="auto">
                {snapshot?.payer?.name ?? receipt.payer_name ?? t('common.dash')}
              </span>
            </DetailField>
            <DetailField
              label={t('admin.finance.receipts.fields.actualPayer')}
              hideWhenEmpty
            >
              {receipt.actual_payer_name?.trim() ? (
                <span dir="auto">{receipt.actual_payer_name}</span>
              ) : null}
            </DetailField>
          </dl>
        </section>

        <section className="card receipt-details__section">
          <h2>{t('admin.finance.receipts.sections.amounts')}</h2>
          <dl className="finance-detail-fields">
            <DetailField label={t('admin.finance.receipts.fields.collectionAmount')}>
              <FinanceMoney amount={receipt.collection_amount} currency={receipt.currency} />
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.allocatedAmount')}>
              <FinanceMoney amount={receipt.allocated_amount} currency={receipt.currency} />
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.unallocatedAmount')}>
              <FinanceMoney amount={receipt.unallocated_amount} currency={receipt.currency} />
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.allocationStatus')} hideWhenEmpty>
              {receipt.allocation_status ? (
                <span>{t(`admin.finance.receipts.allocation.${receipt.allocation_status}`)}</span>
              ) : null}
            </DetailField>
          </dl>
        </section>

        <section className="card receipt-details__section">
          <h2>{t('admin.finance.receipts.sections.payment')}</h2>
          <dl className="finance-detail-fields">
            <DetailField label={t('admin.finance.paymentMethod')}>
              {paymentMethodLabel(receipt.payment_method, t)}
            </DetailField>
            <DetailField label={t('admin.finance.paymentJournal')} hideWhenEmpty>
              {collection?.journal ? <span dir="auto">{collection.journal}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.externalReference')} hideWhenEmpty>
              {collection?.reference ? <span dir="auto">{collection.reference}</span> : null}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.settlementStatus')} hideWhenEmpty>
              {receipt.settlement_status ? (
                <ReceiptSettlementBadge status={receipt.settlement_status} />
              ) : null}
            </DetailField>
            <DetailField label={t('admin.finance.receipts.fields.collection')} hideWhenEmpty>
              {receipt.collection_id ? (
                <Link href={`/admin/finance/collections/${receipt.collection_id}`}>
                  #{receipt.collection_id}
                </Link>
              ) : null}
            </DetailField>
          </dl>
        </section>

        {cheque ? (
          <section className="card receipt-details__section">
            <h2>{t('admin.finance.receipts.sections.cheque')}</h2>
            <dl className="finance-detail-fields">
              <DetailField label={t('admin.finance.cheques.chequeNumber')}>
                <span className="mono">{cheque.number ?? t('common.dash')}</span>
              </DetailField>
              <DetailField label={t('admin.finance.cheques.bankName')} hideWhenEmpty>
                {cheque.bank_name ? <span dir="auto">{cheque.bank_name}</span> : null}
              </DetailField>
              <DetailField label={t('admin.finance.cheques.holderName')} hideWhenEmpty>
                {cheque.drawer_name || cheque.holder_name ? (
                  <span dir="auto">{cheque.drawer_name ?? cheque.holder_name}</span>
                ) : null}
              </DetailField>
              <DetailField label={t('admin.finance.cheques.dueDate')} hideWhenEmpty>
                {formatDate(cheque.maturity_date ?? cheque.due_date) || t('common.dash')}
              </DetailField>
              <DetailField label={t('academic.status')} hideWhenEmpty>
                {cheque.state ? <span>{cheque.state}</span> : null}
              </DetailField>
            </dl>
          </section>
        ) : null}
      </div>

      <section className="card receipt-details__section">
        <h2>{t('admin.finance.receipts.sections.allocations')}</h2>
        {allocations.length > 0 ? (
          <DataTable
            columns={allocationColumns}
            rows={allocations}
            rowKey={(row) => row.id ?? `${row.installment_id}-${row.description}`}
          />
        ) : (
          <p className="muted">{t('admin.finance.receipts.noAllocations')}</p>
        )}
      </section>

      {children.length ? (
        <section className="card receipt-details__section">
          <h2>{t('admin.finance.receipts.sections.children')}</h2>
          <div className="receipt-details__children">
            {children.map((child, idx) => (
              <article key={`${child.student_id ?? idx}-${idx}`} className="receipt-details__child">
                <strong dir="auto">{child.student_name ?? `#${child.student_id ?? idx + 1}`}</strong>
                <dl className="detail-list compact">
                  <div>
                    <dt>{t('admin.finance.receipts.fields.allocatedAmount')}</dt>
                    <dd><FinanceMoney amount={child.allocated_amount} currency={receipt.currency} /></dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.receipts.fields.unallocatedAmount')}</dt>
                    <dd><FinanceMoney amount={child.unallocated_amount} currency={receipt.currency} /></dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
