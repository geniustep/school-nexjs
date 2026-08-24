'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md @design-status adopted */
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Badge, Card, InfoBanner, PageHeader, StatCard } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useLocale } from '@/features/i18n/locale-context';
import { getParentActivationExclusionLabel } from '@/features/parents/parent-activation-exclusion-reason';
import type { ParentActivationCampaign } from '@/types/parent-activation-campaign';

export default function ParentActivationCampaignPage() {
  const { locale, t } = useLocale();
  const [name, setName] = useState('');
  const [campaign, setCampaign] = useState<ParentActivationCampaign | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const response = await api.post<ParentActivationCampaign>(
      endpoints.admin.parentActivationCampaignPrepare,
      name.trim() ? { name: name.trim() } : {},
    );
    setSubmitting(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setCampaign(response.data);
  }

  return <div className="page-shell">
    <PageHeader title={t('admin.parentActivation.title')} subtitle={t('admin.parentActivation.subtitle')} actions={<Link href="/admin/parents" className="btn btn--ghost btn--sm">{t('admin.parentActivation.backToParents')}</Link>} />
    <InfoBanner title={t('admin.parentActivation.previewOnlyTitle')} description={t('admin.parentActivation.previewOnlyDescription')} tone="amber" />
    <Card>
      <h2>{t('admin.parentActivation.stepOneTitle')}</h2>
      <p className="muted">{t('admin.parentActivation.stepOneDescription')}</p>
      <form onSubmit={prepare} className="form-stack">
        <label className="field"><span className="field__label">{t('admin.parentActivation.nameLabel')}</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div><button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? t('admin.parentActivation.preparing') : t('admin.parentActivation.prepare')}</button></div>
      </form>
    </Card>
    {campaign ? <section className="section" aria-live="polite">
      <div className="section__head"><div><h2>{campaign.name}</h2><p className="muted">{t('admin.parentActivation.previewReady')}</p></div><Badge tone="blue">{t('admin.parentActivation.prepared')}</Badge></div>
      <div className="stat-grid">
        <StatCard label={t('admin.parentActivation.total')} value={campaign.counts.total} tone="slate" />
        <StatCard label={t('admin.parentActivation.ready')} value={campaign.counts.ready} tone="green" />
        <StatCard label={t('admin.parentActivation.excluded')} value={campaign.counts.excluded} tone="amber" />
      </div>
      <Card><h3>{t('admin.parentActivation.recipients')}</h3>
        {campaign.recipients.length === 0 ? <p className="muted">{t('admin.parentActivation.noRecipients')}</p> : <ul className="stack-list">
          {campaign.recipients.map((recipient) => {
            const exclusionLabel = getParentActivationExclusionLabel(locale, t, recipient.exclusion_reason);
            return <li key={recipient.parent_id} className="between">
              <Link href={`/admin/parents/${recipient.parent_id}`} dir="auto">{recipient.parent_name}</Link>
              {recipient.eligible_for_send ? <Badge tone="green">{t('admin.parentActivation.eligible')}</Badge> : <span><Badge tone="amber">{t('admin.parentActivation.excluded')}</Badge>{exclusionLabel ? <span className="tiny muted"> {exclusionLabel}</span> : null}</span>}
            </li>;
          })}
        </ul>}
      </Card>
    </section> : null}
  </div>;
}
