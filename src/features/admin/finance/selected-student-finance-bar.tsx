'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceStudentSearchResult } from '@/types/finance';

export function SelectedStudentFinanceBar({
  student,
  onChangeStudent,
  allowChange,
}: {
  student: FinanceStudentSearchResult;
  onChangeStudent?: () => void;
  allowChange?: boolean;
}) {
  const t = useT();
  const name = financeStudentDisplayName(student);
  const classLevel = [student.class?.name, student.level?.name].filter(Boolean).join(' · ');

  return (
    <div className="selected-student-finance-bar">
      <div className="selected-student-finance-bar__identity">
        <span className="selected-student-finance-bar__avatar" aria-hidden>
          {name.charAt(0) || '?'}
        </span>
        <div dir="auto">
          <strong className="selected-student-finance-bar__name" title={name}>
            {name}
          </strong>
          {student.code ? (
            <span className="mono muted selected-student-finance-bar__code">{student.code}</span>
          ) : null}
          {classLevel ? <span className="tiny muted block">{classLevel}</span> : null}
        </div>
      </div>
      <div className="selected-student-finance-bar__metrics">
        {(student.remaining_amount ?? student.balance) != null ? (
          <div>
            <span className="tiny muted">{t('admin.finance.remainingAmount')}</span>
            <FinanceMoney amount={student.remaining_amount ?? student.balance} currency={student.currency} />
          </div>
        ) : null}
        {student.overdue_amount != null && student.overdue_amount > 0 ? (
          <div>
            <span className="tiny muted">{t('admin.finance.overdueAmount')}</span>
            <FinanceMoney amount={student.overdue_amount} currency={student.currency} />
          </div>
        ) : null}
      </div>
      {allowChange && onChangeStudent ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onChangeStudent}>
          {t('admin.finance.changeStudent')}
        </button>
      ) : null}
    </div>
  );
}
