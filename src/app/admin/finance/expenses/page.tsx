'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status proposed — visual QA is required before marking adopted.
 * Expenses V1 accounting preflight only; no financial mutation operations.
 */
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView } from '@/components/states/states';
import { Badge, Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useLocale } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import {
  expensesReadinessCopy,
} from '@/features/admin/finance/expenses-readiness-copy';
import '@/features/admin/finance/expenses-readiness.css';

interface ExpenseReadiness {
  contract_version: 'expenses-readiness-v1';
  school_id: number;
  readiness: 'requires_accounting_audit';
  accounting_checks: {
    school_company: boolean;
    purchase_journal: boolean;
    cash_or_bank_journal: boolean;
  };
  approval_enabled: false;
  payment_enabled: false;
  blocking_reasons: string[];
  allowed_actions: string[];
}

const PREFLIGHT_API = '/admin/finance/expenses/readiness';

export default function AdminFinanceExpensesReadinessPage() {
  const { locale, dir } = useLocale();
  const copy = expensesReadinessCopy(locale);
  const state = useAdminResource<ExpenseReadiness>(PREFLIGHT_API);
  const checks = state.data?.accounting_checks;
  const rows = [
    { key: 'school_company', label: copy.company, passed: checks?.school_company },
    { key: 'purchase_journal', label: copy.purchase, passed: checks?.purchase_journal },
    { key: 'cash_or_bank_journal', label: copy.payment, passed: checks?.cash_or_bank_journal },
  ];

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <div className="admin-workspace expenses-readiness" dir={dir}>
        <Link href="/admin/finance" className="expenses-readiness__return back-link">
          {dir === 'rtl' ? '›' : '‹'} {copy.back}
        </Link>
        <div className="expenses-readiness__header">
          <div className="expenses-readiness__intro">
            <PageHeader title={copy.title} subtitle={copy.subtitle} />
            <Badge tone="blue">{copy.phase}</Badge>
          </div>
        </div>
        <InfoBanner
          tone="amber"
          title={copy.warningTitle}
          description={copy.warningDescription}
          icon="!"
        />
        <section aria-label={copy.checksHeading} className="expenses-readiness" aria-busy={state.initialLoading}>
          <div className="expenses-readiness__intro">
            <SectionHead title={copy.checksHeading} />
            <button
              type="button"
              className="btn btn--ghost expenses-readiness__refresh"
              onClick={() => state.reload()}
              disabled={state.fetching}
            >
              {copy.reload}
            </button>
          </div>
          {state.initialLoading && <p role="status" className="expenses-readiness__footnote">{copy.loading}</p>}
          {state.error && <ApiErrorView error={state.error} onRetry={state.reload} />}
          {state.data && <p className="expenses-readiness__identity">{copy.school}: {state.data.school_id}</p>}
          <div className="expenses-readiness__check-grid" aria-live="polite">
            {rows.map((row) => (
              <Card key={row.key} className="expenses-readiness__check-card">
                <span className="expenses-readiness__check-label">{row.label}</span>
                <div className="expenses-readiness__status">
                  {checks ? (
                    <Badge tone={row.passed ? 'green' : 'amber'}>
                      {row.passed ? copy.present : copy.absent}
                    </Badge>
                  ) : <Badge tone="slate">{copy.notChecked}</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </section>
        <Card>
          <SectionHead title={copy.footerHeading} />
          <p className="expenses-readiness__footnote">{copy.footerDescription}</p>
          <p className="expenses-readiness__footnote">{copy.actionsBlocked}</p>
        </Card>
      </div>
    </RequireAdminPermission>
  );
}
