'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import {
  familyFinanceServiceTypeLabelKey,
  normalizeFamilyCollectionPreviewResponse,
} from '@/lib/utils/normalize-family-finance';
import type {
  FamilyCollectionAllocation,
  FamilyCollectionAllocationMode,
  FamilyCollectionPreviewResponse,
} from '@/types/family-finance';
import { previewFamilyCollectionAllocation } from '../api/family-finance-api';

const ENABLED_MODES: FamilyCollectionAllocationMode[] = [
  'oldest_due_first',
  'leave_as_family_credit',
];

const ALL_MODES: FamilyCollectionAllocationMode[] = [
  'oldest_due_first',
  'by_student',
  'by_service',
  'manual',
  'leave_as_family_credit',
];

function allocationModeLabelKey(mode: FamilyCollectionAllocationMode): string {
  const map: Record<FamilyCollectionAllocationMode, string> = {
    oldest_due_first: 'admin.student360.familyFinance.preview.modes.oldestDueFirst',
    by_student: 'admin.student360.familyFinance.preview.modes.byStudent',
    by_service: 'admin.student360.familyFinance.preview.modes.byService',
    manual: 'admin.student360.familyFinance.preview.modes.manual',
    leave_as_family_credit: 'admin.student360.familyFinance.preview.modes.leaveAsCredit',
  };
  return map[mode];
}

export function FamilyCollectionPreviewForm({
  studentId,
  familyId,
  currency,
}: {
  studentId: number;
  familyId: number;
  currency?: string | null;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const { activeSchoolId } = useAdminSession();
  const [amountInput, setAmountInput] = useState('');
  const [allocationMode, setAllocationMode] =
    useState<FamilyCollectionAllocationMode>('oldest_due_first');
  const [preview, setPreview] = useState<FamilyCollectionPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allocationColumns: Column<FamilyCollectionAllocation>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('admin.student360.familyFinance.collectionContext.columns.student'),
        render: (row) => row.student_name ?? t('common.dash'),
      },
      {
        key: 'item',
        header: t('admin.student360.familyFinance.collectionContext.columns.item'),
        render: (row) =>
          row.service_label?.trim() ||
          (row.service_type
            ? t(familyFinanceServiceTypeLabelKey(row.service_type))
            : t('common.dash')),
      },
      {
        key: 'due_date',
        header: t('admin.student360.familyFinance.collectionContext.columns.dueDate'),
        render: (row) => (row.due_date ? formatDate(row.due_date) : t('common.dash')),
      },
      {
        key: 'allocated',
        header: t('admin.student360.familyFinance.preview.columns.allocated'),
        render: (row) => <FinanceMoney amount={row.allocated_amount} currency={currency} />,
      },
    ],
    [t, formatDate, currency],
  );

  async function handlePreview() {
    const amount = Number.parseFloat(amountInput.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPreviewError(t('admin.student360.familyFinance.preview.invalidAmount'));
      setPreview(null);
      return;
    }

    setLoading(true);
    setPreviewError(null);
    setPreview(null);

    const query: Record<string, number> = {};
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    const res = await previewFamilyCollectionAllocation(
      {
        family_id: familyId,
        student_id: studentId,
        amount,
        allocation_mode: allocationMode,
        manual_allocations: [],
      },
      query,
    );

    setLoading(false);

    if (!res.success) {
      setPreviewError(
        res.error.message?.trim() || t('admin.student360.familyFinance.errors.loadFailed'),
      );
      return;
    }

    const normalized = normalizeFamilyCollectionPreviewResponse(res.data);
    if (!normalized) {
      setPreviewError(t('admin.student360.familyFinance.errors.loadFailed'));
      return;
    }

    if (normalized.errors.length) {
      setPreviewError(normalized.errors.join(' · '));
    }

    setPreview(normalized);
  }

  return (
    <Card className="student-finance-section student-finance-family-preview">
      <Student360SectionHeader
        title={t('admin.student360.familyFinance.preview.title')}
        description={t('admin.student360.familyFinance.preview.description')}
      />

      <div className="student-finance-family-preview-form">
        <label className="student-finance-family-preview-field">
          <span className="tiny muted">{t('admin.student360.familyFinance.preview.amount')}</span>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="0.00"
          />
        </label>

        <label className="student-finance-family-preview-field">
          <span className="tiny muted">{t('admin.student360.familyFinance.preview.mode')}</span>
          <select
            className="input"
            value={allocationMode}
            onChange={(event) =>
              setAllocationMode(event.target.value as FamilyCollectionAllocationMode)
            }
          >
            {ALL_MODES.map((mode) => (
              <option key={mode} value={mode} disabled={!ENABLED_MODES.includes(mode)}>
                {t(allocationModeLabelKey(mode))}
                {!ENABLED_MODES.includes(mode)
                  ? ` (${t('admin.student360.familyFinance.preview.comingSoon')})`
                  : ''}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={loading}
          onClick={() => void handlePreview()}
        >
          {loading
            ? t('common.loading')
            : t('admin.student360.familyFinance.preview.action')}
        </button>
      </div>

      {previewError ? (
        <div className="student-finance-family-error" role="alert">
          <p>{previewError}</p>
        </div>
      ) : null}

      {preview ? (
        <div className="student-finance-family-preview-result">
          <dl className="detail-list student-finance-family-preview-metrics">
            <div>
              <dt>{t('admin.student360.familyFinance.preview.result.amount')}</dt>
              <dd>
                <FinanceMoney amount={preview.amount} currency={currency} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.familyFinance.preview.result.allocated')}</dt>
              <dd>
                <FinanceMoney amount={preview.allocated_amount} currency={currency} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.familyFinance.preview.result.unallocated')}</dt>
              <dd>
                <FinanceMoney amount={preview.unallocated_amount} currency={currency} />
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.familyFinance.preview.result.credit')}</dt>
              <dd>
                <FinanceMoney
                  amount={preview.credit_amount ?? preview.credit_balance}
                  currency={currency}
                />
              </dd>
            </div>
          </dl>

          {preview.warnings.length ? (
            <div className="student-finance-card-alert" role="status">
              <p className="tiny">{preview.warnings.join(' · ')}</p>
            </div>
          ) : null}

          {preview.allocations.length ? (
            <div className="student-finance-table-wrap">
              <DataTable
                columns={allocationColumns}
                rows={preview.allocations}
                rowKey={(row) => `${row.student_id ?? 'na'}-${row.installment_id ?? row.due_date ?? 'row'}`}
              />
            </div>
          ) : null}

          <p className="student-finance-family-preview-disclaimer tiny muted" role="note">
            {t('admin.student360.familyFinance.preview.disclaimer')}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
