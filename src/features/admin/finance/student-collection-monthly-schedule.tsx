'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useStudentFinanceInstallmentsPage } from '@/features/admin/student-finance/hooks/use-student-finance-installments-page';
import { MonthlyInstallmentPicker } from './monthly-installment-picker';
import { buildStudentCollectionScheduleRows } from './student-collection-schedule-rows';
import type { StudentInstallment } from '@/features/admin/student-finance/types';

export function StudentCollectionMonthlySchedule({
  studentId,
  academicYearId,
  collectibleInstallments,
  collectibleLoading,
  currency,
  selectedIds,
  allocationInputs,
  onAllocationChange,
}: {
  studentId: number;
  academicYearId: string;
  collectibleInstallments: StudentInstallment[];
  collectibleLoading: boolean;
  currency?: string | null;
  selectedIds: number[];
  allocationInputs: Record<number, string>;
  onAllocationChange: (values: Record<number, string>) => void;
}) {
  const t = useT();
  // Same scoped finance schedule endpoint and page size as Student360's Échéancier.
  const query = useMemo(
    () => academicYearId ? { academic_year_id: Number(academicYearId), page: 1, page_size: 100 } : null,
    [academicYearId],
  );
  const schedule = useStudentFinanceInstallmentsPage(studentId, query, !!query);
  const eligibleInstallmentIds = useMemo(
    () => collectibleInstallments.map((row) => row.id),
    [collectibleInstallments],
  );
  const displayRows = useMemo(
    () => buildStudentCollectionScheduleRows(schedule.data, collectibleInstallments),
    [schedule.data, collectibleInstallments],
  );
  // Do not silently treat a failed history read as a complete payment history.
  const historyUnavailable = !!schedule.error || (!schedule.loading && !schedule.initialLoading &&
    schedule.data.length === 0 && collectibleInstallments.length > 0);
  return (
    <>
      {historyUnavailable ? (
        <p className="tiny muted" role="status" data-testid="student-collection-history-unavailable">
          {t('admin.finance.collectionWorkflow.monthlyHistoryUnavailable')}
        </p>
      ) : null}
      <MonthlyInstallmentPicker
        installments={displayRows}
        loading={collectibleLoading || ((schedule.loading || schedule.initialLoading) && !schedule.data.length)}
        currency={currency}
        selectedIds={selectedIds}
        eligibleInstallmentIds={eligibleInstallmentIds}
        allocationInputs={allocationInputs}
        onAllocationChange={onAllocationChange}
      />
    </>
  );
}
