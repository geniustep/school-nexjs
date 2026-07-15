'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { FinancialAgreementLine } from '../types';
import type { AgreementAmendmentLineOption } from '../utils/resolve-amendment-form-options';
import {
  resolveAgreementLineOperationalState,
  type AgreementLineLifecycleSource,
} from '../utils/resolve-agreement-line-operational-state';

export function AgreementLineOperationalStateBadge({
  source,
  showDescription = false,
  className,
}: {
  source:
    | FinancialAgreementLine
    | AgreementAmendmentLineOption
    | AgreementLineLifecycleSource
    | null
    | undefined;
  showDescription?: boolean;
  className?: string;
}) {
  const t = useT();
  const presentation = resolveAgreementLineOperationalState(
    source as AgreementLineLifecycleSource | null | undefined,
  );
  const label = t(presentation.labelKey);
  const description =
    showDescription && presentation.descriptionKey
      ? t(presentation.descriptionKey)
      : null;

  return (
    <div className={['student-finance-line-lifecycle', className].filter(Boolean).join(' ')}>
      <Badge tone={presentation.badgeTone}>{label !== presentation.labelKey ? label : t('admin.student360.financialAgreement.lineOperationalState.unavailable')}</Badge>
      {description && description !== presentation.descriptionKey ? (
        <span className="tiny muted student-finance-line-lifecycle__desc" dir="auto">
          {description}
        </span>
      ) : null}
    </div>
  );
}
