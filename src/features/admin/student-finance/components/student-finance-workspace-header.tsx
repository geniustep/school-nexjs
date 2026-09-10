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
 * Finance is already nested inside Student 360. The finance workspace owns its
 * own compact context, so the large student profile hero is intentionally
 * suppressed while Finance is mounted. Agreement and schedule remain internal
 * routes for exceptional workflows, but are not user-facing finance tabs.
 */
export function StudentFinanceWorkspaceHeader(_props: StudentFinanceWorkspaceHeaderProps) {
  const t = useT();
  void _props;

  return (
    <>
      <style jsx global>{`
        .student-360-shell:has(.student-finance-workspace)
          .student-360-profile-hero
          .student-360-header {
          display: none;
        }

        .student-360-shell:has(.student-finance-workspace) .student-360-profile-hero {
          border-radius: 12px;
          box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
        }

        .student-360-shell:has(.student-finance-workspace)
          .student-360-profile-hero
          .student-360-tabs-sticky {
          border-top: 0;
          border-radius: 12px;
        }

        .student-finance-workspace
          .student-finance-subtabs__group:has(.student-finance-subtabs__tab[data-tab='agreements']),
        .student-finance-workspace
          .student-finance-subtabs__group:has(.student-finance-subtabs__tab[data-tab='schedule']) {
          display: none;
        }
      `}</style>

      <header className="student-finance-command-bar">
        <div className="student-finance-command-bar__accent" aria-hidden="true" />
        <div className="student-finance-command-bar__inner" style={{ paddingBlock: 12 }}>
          <h2 className="student-finance-command-bar__title">
            {t('admin.student360.financeWorkspace.pageTitle')}
          </h2>
        </div>
      </header>
    </>
  );
}
