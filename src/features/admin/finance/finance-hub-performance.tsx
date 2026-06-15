'use client';

import { FinanceHubSection } from '@/features/admin/finance/finance-hub-header';
import { useT } from '@/features/i18n/locale-context';

export function FinanceHubPerformance() {
  const t = useT();

  return (
    <FinanceHubSection title={t('admin.finance.hub.performanceTitle')}>
      <div className="card finance-hub-performance-empty">
        <p className="finance-hub-performance-empty__title">{t('admin.finance.hub.performanceUnavailableTitle')}</p>
        <p className="muted">{t('admin.finance.hub.performanceUnavailableDesc')}</p>
      </div>
    </FinanceHubSection>
  );
}
