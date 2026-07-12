'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  hasAdmissionStatusWarnings,
  resolveAdmissionStatusBadges,
  type AdmissionStatusFields,
} from '../utils/admission-status-display';
import type { AdmissionUiStageSource } from '../utils/admission-ui-stage';
import { shouldShowFamilyBadge } from '../utils/family-admission-visibility';

export function AdmissionStatusBadges({
  record,
  showWarningIcon = true,
  hideUiStagePrimary = false,
}: {
  record: AdmissionStatusFields &
    AdmissionUiStageSource & {
      family_batch_id?: number | null;
      family_size?: number | null;
    };
  showWarningIcon?: boolean;
  /** Skip primary badge when it only restates the pipeline ui_stage (Kanban column). */
  hideUiStagePrimary?: boolean;
}) {
  const t = useT();
  const includeFamily = shouldShowFamilyBadge(record);
  const includeWarning =
    showWarningIcon && !includeFamily && hasAdmissionStatusWarnings(record);
  let badges = resolveAdmissionStatusBadges(record, {
    includeFamily,
    includeWarning,
  });

  if (hideUiStagePrimary) {
    badges = badges.filter((badge) => !badge.key.startsWith('primary:ui_stage'));
  }

  if (badges.length === 0) return null;

  return (
    <div className="admission-status-badges" data-testid="admission-status-badges">
      {badges.map((badge) => (
        <Badge key={badge.key} tone={badge.tone}>
          {badge.key === 'family'
            ? t('admin.admissions.family.badgeShort')
            : t(badge.labelKey)}
        </Badge>
      ))}
    </div>
  );
}
