'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { paymentStatusTone, timingStatusTone } from '../utils/reference-labels';

export function InstallmentPaymentStatusBadge({ status }: { status: string }) {
  const t = useT();
  const key = `admin.student360.financeOps.paymentStatus.${status}`;
  const label = t(key);
  const text = label === key ? status : label;
  return <Badge tone={paymentStatusTone(status)}>{text}</Badge>;
}

export function InstallmentTimingStatusBadge({
  status,
  hiddenFromParent,
}: {
  status: string;
  hiddenFromParent?: boolean;
}) {
  const t = useT();
  const key = `admin.student360.financeOps.timingStatus.${status}`;
  const label = t(key);
  const text = label === key ? status : label;
  return (
    <span className="student-finance-status-group">
      <Badge tone={timingStatusTone(status)}>{text}</Badge>
      {hiddenFromParent ? (
        <span className="student-finance-hidden-indicator tiny muted">
          {t('admin.student360.financeOps.hiddenFromParent')}
        </span>
      ) : null}
    </span>
  );
}

export function InstallmentStatusBadges({
  paymentStatus,
  timingStatus,
  isVisible,
}: {
  paymentStatus: string;
  timingStatus: string;
  isVisible?: boolean;
}) {
  return (
    <span className="student-finance-dual-badges">
      <InstallmentPaymentStatusBadge status={paymentStatus} />
      <InstallmentTimingStatusBadge
        status={timingStatus}
        hiddenFromParent={isVisible === false}
      />
    </span>
  );
}

export function InstallmentCompositeStatus({
  paymentStatus,
  timingStatus,
}: {
  paymentStatus: string;
  timingStatus: string;
}) {
  const t = useT();
  const key = `admin.finance.collectionWorkflow.compositeStatus.${paymentStatus}_${timingStatus}`;
  const label = t(key);
  if (label !== key) {
    return <Badge tone={timingStatusTone(timingStatus)}>{label}</Badge>;
  }
  if (timingStatus === 'hidden') {
    return (
      <Badge tone="slate">{t('admin.finance.collectionWorkflow.notCollectibleNow')}</Badge>
    );
  }
  return (
    <InstallmentStatusBadges paymentStatus={paymentStatus} timingStatus={timingStatus} />
  );
}
