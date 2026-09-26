'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/primitives';
import { useLocale } from '@/features/i18n/locale-context';
import { HistoricalActivationCampaigns } from './historical-activation-campaigns';
import styles from './activation-campaign.module.css';

export default function ParentActivationCampaignPage() {
  const { t } = useLocale();

  return (
    <div className={`page-shell ${styles.historyPage}`}>
      <PageHeader
        title={t('admin.parentActivation.title')}
        subtitle={t('admin.parentActivation.subtitle')}
        actions={
          <div className={styles.headerActions}>
            <Link
              href="/admin/parents/activation-campaign/prepare"
              className="btn btn--primary btn--sm"
            >
              {t('admin.parentActivation.prepare')}
            </Link>
            <Link href="/admin/parents" className="btn btn--ghost btn--sm">
              {t('admin.parentActivation.backToParents')}
            </Link>
          </div>
        }
      />

      <HistoricalActivationCampaigns />
    </div>
  );
}
