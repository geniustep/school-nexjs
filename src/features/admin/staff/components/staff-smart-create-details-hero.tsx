'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { resolveStaffTemplateMainPositionLabel } from '@/features/admin/staff/utils/staff-template-utils';
import type { StaffCreationTemplate } from '@/types/staff-templates';

export function StaffSmartCreateDetailsHero({
  template,
  stepNumber,
  totalSteps,
  onChangeTemplate,
}: {
  template: StaffCreationTemplate;
  stepNumber: number;
  totalSteps: number;
  onChangeTemplate: () => void;
}) {
  const t = useT();
  const positionLabel = resolveStaffTemplateMainPositionLabel(template.main_position);

  return (
    <header className="staff-smart-create__details-hero">
      <div className="staff-smart-create__details-hero-main">
        <span className="staff-smart-create__details-hero-step">
          {t('admin.staffCenter.smartCreate.detailsStepProgress', {
            current: stepNumber,
            total: totalSteps,
          })}
        </span>
        <div className="staff-smart-create__details-hero-heading">
          <h2 className="staff-smart-create__details-hero-title">{template.name}</h2>
          {positionLabel ? (
            <span className="staff-smart-create__position-chip">{positionLabel}</span>
          ) : null}
        </div>
        {template.description ? (
          <p className="staff-smart-create__details-hero-desc">{template.description}</p>
        ) : (
          <p className="staff-smart-create__details-hero-desc">
            {t('admin.staffCenter.smartCreate.selectedTemplateHint')}
          </p>
        )}
        <div className="staff-smart-create__details-hero-badges">
          {template.requires_user_account ? (
            <Badge tone="blue">{t('admin.staffCenter.smartCreate.requiresLoginBadge')}</Badge>
          ) : null}
          {template.creates_teacher_profile ? (
            <Badge tone="green">{t('admin.staffCenter.smartCreate.createsTeacherBadge')}</Badge>
          ) : null}
          {template.sensitive ? (
            <Badge tone="amber">{t('admin.staffCenter.smartCreate.sensitiveBadge')}</Badge>
          ) : null}
        </div>
      </div>
      <div className="staff-smart-create__details-hero-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onChangeTemplate}>
          {t('admin.staffCenter.smartCreate.changeTemplateAction')}
        </button>
      </div>
    </header>
  );
}
