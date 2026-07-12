'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  hasAdmissionStatusWarnings,
  resolveAdmissionStatusBadges,
  type AdmissionStatusFields,
} from '../utils/admission-status-display';
import type { AdmissionUiStageSource } from '../utils/admission-ui-stage';

export function AdmissionStatusBadges({
  record,
  showWarningIcon = true,
}: {
  record: AdmissionStatusFields & AdmissionUiStageSource;
  showWarningIcon?: boolean;
}) {
  const t = useT();
  const badges = resolveAdmissionStatusBadges(record);
  const warn = showWarningIcon && hasAdmissionStatusWarnings(record);

  if (badges.length === 0 && !warn) return null;

  return (
    <div className="admission-status-badges">
      {badges.map((badge) => (
        <Badge key={badge.key} tone={badge.tone}>
          {t(badge.labelKey)}
        </Badge>
      ))}
      {warn ? (
        <span
          className="admission-status-badges__warn"
          title={t('admin.admissions.statusWarnings.iconTitle')}
          aria-label={t('admin.admissions.statusWarnings.iconTitle')}
        >
          ⚠
        </span>
      ) : null}
    </div>
  );
}
