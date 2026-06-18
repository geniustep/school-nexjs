'use client';

import { Student360CompactEmpty } from '@/features/admin/students/components/student-360-compact-empty';
import { useT } from '@/features/i18n/locale-context';

export function StudentFinanceLedgerPanel() {
  const t = useT();

  return (
    <Student360CompactEmpty
      title={t('admin.student360.financeWorkspace.ledger.emptyTitle')}
      description={t('admin.student360.financeWorkspace.ledger.emptyDescription')}
    />
  );
}
