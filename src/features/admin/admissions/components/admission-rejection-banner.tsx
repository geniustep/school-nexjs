'use client';

import { Badge } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import {
  isAdmissionRejected,
  resolveRejectionDecidedAt,
  resolveRejectionDecidedBy,
  resolveRejectionReason,
} from '../utils/admission-rejection';
import { AdmissionReopenAction } from './admission-reopen-action';

export function AdmissionRejectionBanner({
  detail,
  onUpdated,
}: {
  detail: AdmissionDetail;
  onUpdated: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (!isAdmissionRejected(detail)) return null;

  const reason = resolveRejectionReason(detail);
  const decidedAt = resolveRejectionDecidedAt(detail);
  const decidedBy = resolveRejectionDecidedBy(detail);

  return (
    <section className="admissions-rejection-banner" aria-live="polite">
      <div className="admissions-rejection-banner__header">
        <Badge tone="red">{t('admin.admissions.rejection.status')}</Badge>
        <AdmissionReopenAction detail={detail} onUpdated={onUpdated} />
      </div>
        <dl className="admissions-rejection-banner__dl">
          <div className="admissions-rejection-banner__row">
            <dt>{t('admin.admissions.rejection.reason')}</dt>
            <dd>{reason || t('common.dash')}</dd>
          </div>
          {decidedAt ? (
            <div className="admissions-rejection-banner__row">
              <dt>{t('admin.admissions.rejection.decidedAt')}</dt>
              <dd>{formatDate(decidedAt)}</dd>
            </div>
          ) : null}
          {decidedBy ? (
            <div className="admissions-rejection-banner__row">
              <dt>{t('admin.admissions.rejection.decidedBy')}</dt>
              <dd>{decidedBy}</dd>
            </div>
          ) : null}
        </dl>
      </section>
  );
}
