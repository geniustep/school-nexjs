'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentFinanceSubTab } from '../utils/student-finance-sub-tab';

type StudentFinanceWorkspaceHeaderProps = {
  studentId: number;
  academicYears: { id: number; name: string }[];
  effectiveYearId: string;
  yearsLoading: boolean;
  onYearChange: (yearId: string) => void;
  billingPartnerId?: number | null;
  subTab: StudentFinanceSubTab;
  canCollect: boolean;
  collectPaymentAllowed?: boolean;
  allowInstallmentCollection?: boolean;
  collectBlockMessage?: string | null;
  shouldHideCollectButton?: boolean;
  onOpenSchedule: () => void;
  onOpenAgreements: () => void;
  onRecordPayment: () => void;
  showChangePlan?: boolean;
  showReviewAgreement?: boolean;
  reviewAgreementKind?: 'fix' | 'review';
  onOpenChangePlan?: () => void;
  onReviewAgreement?: () => void;
  changePlanHint?: string | null;
};

/**
 * Finance is already nested inside Student 360. Keep this header intentionally
 * compact: the global app header owns the academic-year context and the student
 * header owns the primary payment action.
 */
export function StudentFinanceWorkspaceHeader(_props: StudentFinanceWorkspaceHeaderProps) {
  const t = useT();
  void _props;

  return (
    <header className="student-finance-command-bar">
      <div className="student-finance-command-bar__accent" aria-hidden="true" />
      <div className="student-finance-command-bar__inner" style={{ paddingBlock: 12 }}>
        <h2 className="student-finance-command-bar__title">
          {t('admin.student360.financeWorkspace.pageTitle')}
        </h2>
      </div>
    </header>
  );
}
