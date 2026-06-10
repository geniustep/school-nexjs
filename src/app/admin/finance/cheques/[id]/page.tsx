'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { ChequeDueIndicator } from '@/features/admin/finance/cheque-due-indicator';
import { ChequePaymentMarker } from '@/features/admin/finance/cheque-payment-marker';
import { ChequeStatusBadge } from '@/features/admin/finance/cheque-status-badge';
import { ChequeTimeline } from '@/features/admin/finance/cheque-timeline';
import { ChequeTransitionDialog } from '@/features/admin/finance/cheque-transition-dialog';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import {
  FINANCE_VIEW_CHEQUES,
  canCancelCheques,
  canClearCheques,
  canDepositCheques,
  canRejectCheques,
} from '@/lib/permissions/finance';
import { availableChequeTransitions } from '@/lib/utils/cheque';
import type { ChequeTransitionAction } from '@/lib/utils/cheque';
import { financeStudentDisplayName, refName } from '@/lib/utils/finance';
import type { FinanceCheque } from '@/types/finance';

export default function AdminFinanceChequeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const user = useSession();
  const { formatDate } = useFormat();
  const state = useAdminResource<FinanceCheque>(endpoints.admin.financeCheque(id));
  const [dialogAction, setDialogAction] = useState<ChequeTransitionAction | null>(null);

  function canRun(action: ChequeTransitionAction): boolean {
    switch (action) {
      case 'deposit':
        return canDepositCheques(user);
      case 'clear':
        return canClearCheques(user);
      case 'reject':
        return canRejectCheques(user);
      case 'cancel':
        return canCancelCheques(user);
      default:
        return false;
    }
  }

  function transitionPath(action: ChequeTransitionAction): string {
    switch (action) {
      case 'deposit':
        return endpoints.admin.financeChequeDeposit(id);
      case 'clear':
        return endpoints.admin.financeChequeClear(id);
      case 'reject':
        return endpoints.admin.financeChequeReject(id);
      case 'cancel':
        return endpoints.admin.financeChequeCancel(id);
    }
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CHEQUES}>
      <Link href="/admin/finance/cheques" className="back-link">
        ‹ {t('admin.finance.cheques.backToList')}
      </Link>
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(cheque) => {
          const transitions = availableChequeTransitions(cheque.state ?? 'received').filter(canRun);
          const studentId = cheque.student_id ?? cheque.student?.id;
          const studentLabel =
            cheque.student_name ?? financeStudentDisplayName(cheque.student ?? {}) ?? t('common.dash');
          const schoolLabel = refName(cheque.school as { name?: string }) ?? t('common.dash');

          return (
            <>
              <PageHeader
                title={cheque.cheque_number ?? t('admin.finance.cheques.detailTitle')}
                subtitle={studentLabel}
                actions={
                  transitions.length ? (
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {transitions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={action === 'reject' || action === 'cancel' ? 'btn btn--sm' : 'btn btn--primary btn--sm'}
                          onClick={() => setDialogAction(action)}
                        >
                          {t(`admin.finance.cheques.actions.${action}.button`)}
                        </button>
                      ))}
                    </div>
                  ) : undefined
                }
              />

              <div className="card">
                <dl className="detail-list">
                  <div>
                    <dt>{t('admin.finance.cheques.chequeNumber')}</dt>
                    <dd>{cheque.cheque_number ?? t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.cheques.bankName')}</dt>
                    <dd>{cheque.bank_name ?? t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.cheques.holderName')}</dt>
                    <dd>{cheque.holder_name ?? t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('nav.students')}</dt>
                    <dd>
                      {studentId ? (
                        <Link href={`/admin/finance/students/${studentId}`}>{studentLabel}</Link>
                      ) : (
                        studentLabel
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('common.school')}</dt>
                    <dd>{schoolLabel}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.collectionAmount')}</dt>
                    <dd>
                      <FinanceMoney amount={cheque.amount} currency={cheque.currency} />
                    </dd>
                  </div>
                  {cheque.collection_id && (
                    <div>
                      <dt>{t('admin.finance.collectionsTitle')}</dt>
                      <dd>
                        <Link href={`/admin/finance/collections/${cheque.collection_id}`}>
                          {t('admin.finance.cheques.viewCollection')}
                        </Link>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>{t('admin.finance.cheques.receivedDate')}</dt>
                    <dd>{formatDate(cheque.received_date) || t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.cheques.dueDate')}</dt>
                    <dd>{formatDate(cheque.due_date) || t('common.dash')}</dd>
                  </div>
                </dl>
              </div>

              <section className="card">
                <h3>{t('academic.status')}</h3>
                <ChequeStatusBadge state={cheque.state ?? 'received'} />
                <ChequeDueIndicator cheque={cheque} />
                {cheque.reversal_applied && (
                  <p className="finance-cheque-reversal-note">{t('admin.finance.cheques.reversalApplied')}</p>
                )}
                <ChequeTimeline cheque={cheque} />
              </section>

              <ChequePaymentMarker cheque={cheque} variant="admin" />

              {dialogAction && (
                <ChequeTransitionDialog
                  action={dialogAction}
                  path={transitionPath(dialogAction)}
                  open
                  onClose={() => setDialogAction(null)}
                  onSuccess={() => state.reload()}
                />
              )}
            </>
          );
        }}
      </ResourceView>
    </RequireAdminPermission>
  );
}
