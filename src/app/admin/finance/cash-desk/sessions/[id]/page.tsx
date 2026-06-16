'use client';

import Link from 'next/link';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ApiErrorView } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { CashSessionDetailView } from '@/features/admin/finance/cash-desk/cash-session-detail-view';
import { CashSessionStatusBadge } from '@/features/admin/finance/cash-desk/cash-session-status-badge';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/finance/finance-ui.css';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW_CASH_SESSIONS } from '@/lib/permissions/finance';
import { normalizeCashSession, cashSessionDisplayNumber } from '@/lib/utils/cash-session-normalize';
import { appendReturnTo, sanitizeReturnTo } from '@/lib/utils/safe-return-url';
import type { CashSession } from '@/types/finance-cash-desk';

export default function CashDeskSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), '/admin/finance/cash-desk/sessions');

  const state = useAdminResource<unknown>(endpoints.admin.financeCashSession(id));
  const session = normalizeCashSession(state.data);

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_CASH_SESSIONS}>
      <ResourceView state={state} loadingLabel={t('admin.finance.cashDesk.loadingSession')}>
        {() =>
          session ? (
            <div className="cash-desk-session-detail-page">
              <PageHeader
                title={cashSessionDisplayNumber(session)}
                subtitle={t('admin.finance.cashDesk.sessionDetailSubtitle')}
                actions={
                  <div className="row">
                    <CashSessionStatusBadge state={session.state} />
                    <Link className="btn btn--ghost" href={appendReturnTo('/admin/finance/cash-desk/sessions', returnTo)}>
                      {t('admin.finance.cashDesk.sessionsHistory')}
                    </Link>
                    <Link className="btn btn--ghost" href="/admin/finance/cash-desk">
                      {t('admin.finance.cashDesk.backToDesk')}
                    </Link>
                  </div>
                }
              />
              <CashSessionDetailView
                session={session as CashSession}
                onReload={state.reload}
                returnTo={appendReturnTo(`/admin/finance/cash-desk/sessions/${id}`, returnTo)}
                readOnly={session.state === 'closed'}
              />
            </div>
          ) : (
            <ApiErrorView
              error={{ code: 'not_found', message: t('admin.finance.cashDesk.sessionNotFound'), details: {} }}
              onRetry={state.reload}
            />
          )
        }
      </ResourceView>
    </RequireAdminPermission>
  );
}
