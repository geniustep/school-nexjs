'use client';

import { Card } from '@/components/ui/primitives';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { EmptyState } from '@/components/states/states';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import {
  resolveAdjustmentPolicyLabel,
  resolveAdjustmentTypeLabel,
} from '../utils/reference-labels';
import { resolveDraftAgreementPresentation } from '../utils/resolve-draft-agreement-presentation';
import { resolveStudentFinanceCurrency } from '../utils/resolve-student-finance-currency';
import type { StudentFinancePanelProps } from './student-finance-panel-props';

export function StudentFinanceAdjustmentsPanel({
  workspace,
  financialOverview,
}: StudentFinancePanelProps) {
  const t = useT();
  const { formatDate } = useFormat();
  const currency = resolveStudentFinanceCurrency({
    financialOverview,
    workspaceSummary: workspace?.summary,
  });
  const adjustments = workspace?.current_agreement?.adjustments ?? [];
  const draftPresentation = resolveDraftAgreementPresentation({
    financialOverview,
    workspaceAgreement: workspace?.current_agreement ?? null,
  });

  if (!adjustments.length) {
    return (
      <EmptyState
        title={t('admin.student360.financeWorkspace.adjustments.emptyTitle')}
        description={
          draftPresentation.enrollmentCustomizations.length > 0
            ? t('admin.student360.financeWorkspace.adjustments.emptyWithEnrollmentCustomizations')
            : t('admin.student360.financeWorkspace.adjustments.emptyDescription')
        }
      />
    );
  }

  return (
    <Card className="student-finance-section">
      <Student360SectionHeader
        title={t('admin.student360.financeWorkspace.tabs.adjustments')}
        description={t('admin.student360.financeWorkspace.adjustments.description')}
      />
      <div className="student-finance-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.student360.financialAgreement.adjustments.type')}</th>
              <th>{t('admin.student360.financialAgreement.adjustments.reason')}</th>
              <th>{t('admin.student360.financialAgreement.adjustments.amount')}</th>
              <th>{t('admin.student360.financialAgreement.adjustments.policy')}</th>
              <th>{t('admin.student360.financeWorkspace.adjustments.columns.date')}</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((adj) => (
              <tr key={adj.id}>
                <td>{resolveAdjustmentTypeLabel(t, adj.adjustment_type)}</td>
                <td dir="auto">{adj.reason ?? t('common.dash')}</td>
                <td>
                  {adj.percentage != null ? (
                    <span dir="ltr">{adj.percentage}%</span>
                  ) : (
                    <FinanceMoney amount={adj.amount ?? undefined} currency={currency} />
                  )}
                </td>
                <td>{resolveAdjustmentPolicyLabel(t, adj.application_policy)}</td>
                <td>{adj.created_at ? formatDate(adj.created_at) : t('common.dash')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
