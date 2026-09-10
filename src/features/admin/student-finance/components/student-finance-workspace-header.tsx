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
 * Finance remains part of Student 360, so the main student profile header stays
 * visible as the page context. Agreement and schedule remain internal routes
 * for exceptional workflows but are not exposed as user-facing finance tabs.
 * On the overview, the compact installment schedule is presented as a left
 * sidebar while agreement and billing context stay in the main column.
 */
export function StudentFinanceWorkspaceHeader(_props: StudentFinanceWorkspaceHeaderProps) {
  const t = useT();
  void _props;

  return (
    <>
      <style jsx global>{`
        .student-finance-workspace
          .student-finance-subtabs__group:has(.student-finance-subtabs__tab[data-tab='agreements']),
        .student-finance-workspace
          .student-finance-subtabs__group:has(.student-finance-subtabs__tab[data-tab='schedule']) {
          display: none;
        }

        .student-finance-workspace:has(
            .student-finance-subtabs__tab[data-tab='overview'].is-active
          )
          .student-finance-workspace__panel {
          display: grid;
          grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
          align-items: start;
          gap: 18px;
        }

        .student-finance-workspace:has(
            .student-finance-subtabs__tab[data-tab='overview'].is-active
          )
          .student-finance-workspace__panel
          > .student-finance-repair-center {
          grid-column: 1 / -1;
        }

        .student-finance-workspace:has(
            .student-finance-subtabs__tab[data-tab='overview'].is-active
          )
          .student-finance-workspace__panel
          > section:not(.student-finance-repair-center) {
          grid-area: auto;
          grid-column: 2;
          min-width: 0;
        }

        .student-finance-workspace:has(
            .student-finance-subtabs__tab[data-tab='overview'].is-active
          )
          .student-finance-workspace__panel
          > section:last-of-type {
          grid-area: auto;
          grid-column: 1;
          align-self: start;
          position: sticky;
          top: 16px;
        }

        [dir='rtl']
          .student-finance-workspace:has(
            .student-finance-subtabs__tab[data-tab='overview'].is-active
          )
          .student-finance-workspace__panel {
          direction: ltr;
        }

        [dir='rtl']
          .student-finance-workspace:has(
            .student-finance-subtabs__tab[data-tab='overview'].is-active
          )
          .student-finance-workspace__panel
          > * {
          direction: rtl;
        }

        @media (max-width: 1100px) {
          .student-finance-workspace:has(
              .student-finance-subtabs__tab[data-tab='overview'].is-active
            )
            .student-finance-workspace__panel {
            display: block;
            direction: inherit;
          }

          .student-finance-workspace:has(
              .student-finance-subtabs__tab[data-tab='overview'].is-active
            )
            .student-finance-workspace__panel
            > section:not(.student-finance-repair-center),
          .student-finance-workspace:has(
              .student-finance-subtabs__tab[data-tab='overview'].is-active
            )
            .student-finance-workspace__panel
            > section:last-of-type {
            grid-area: auto;
            grid-column: auto;
            position: static;
          }

          [dir='rtl']
            .student-finance-workspace:has(
              .student-finance-subtabs__tab[data-tab='overview'].is-active
            )
            .student-finance-workspace__panel
            > * {
            direction: inherit;
          }
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
