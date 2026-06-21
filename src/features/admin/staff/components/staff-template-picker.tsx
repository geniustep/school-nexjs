'use client';

import { Badge } from '@/components/ui/primitives';
import { useT, type TranslateFn } from '@/features/i18n/locale-context';
import {
  groupStaffTemplatesByMainPosition,
  resolveStaffTemplateBundleLabel,
  resolveStaffTemplateMainPositionLabel,
  splitStaffTemplateDisplayList,
  STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT,
} from '@/features/admin/staff/utils/staff-template-utils';
import type { StaffCreationTemplate } from '@/types/staff-templates';

function TemplateBundleChips({
  bundleCodes,
  t,
}: {
  bundleCodes: string[];
  t: TranslateFn;
}) {
  const { visible, overflowCount } = splitStaffTemplateDisplayList(
    bundleCodes,
    STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT,
  );

  if (!visible.length) return null;

  return (
    <ul className="staff-smart-create__bundle-chips">
      {visible.map((code) => (
        <li key={code}>
          <span className="staff-smart-create__bundle-chip">
            {resolveStaffTemplateBundleLabel(code, t)}
          </span>
        </li>
      ))}
      {overflowCount > 0 ? (
        <li>
          <span className="staff-smart-create__bundle-chip staff-smart-create__bundle-chip--more">
            {t('admin.staffCenter.smartCreate.moreItems', { count: overflowCount })}
          </span>
        </li>
      ) : null}
    </ul>
  );
}

export function StaffTemplatePicker({
  templates,
  selectedCode,
  onSelect,
  onPreview,
}: {
  templates: StaffCreationTemplate[];
  selectedCode: string;
  onSelect: (template: StaffCreationTemplate) => void;
  onPreview: (template: StaffCreationTemplate) => void;
}) {
  const t = useT();
  const groups = groupStaffTemplatesByMainPosition(templates);

  return (
    <div className="staff-smart-create__templates">
      {groups.map((group) => {
        const groupTitle =
          group.label || t('admin.staffCenter.smartCreate.otherPositionGroup');
        return (
          <section key={group.key} className="staff-smart-create__template-group">
            <h3 className="staff-smart-create__group-title">
              {groupTitle}
              <span className="staff-smart-create__group-count">
                {t('admin.staffCenter.smartCreate.templatesInGroup', {
                  count: group.templates.length,
                })}
              </span>
            </h3>
            <div className="staff-smart-create__template-grid">
              {group.templates.map((template) => {
                const selected = template.code === selectedCode;
                const positionLabel = resolveStaffTemplateMainPositionLabel(template.main_position);
                return (
                  <article
                    key={template.code}
                    className={`staff-smart-create__template-card${selected ? ' is-selected' : ''}`}
                  >
                    <header className="staff-smart-create__template-card-header">
                      <div className="staff-smart-create__template-card-heading">
                        <h4>{template.name}</h4>
                        {positionLabel ? (
                          <span className="staff-smart-create__position-chip">{positionLabel}</span>
                        ) : null}
                      </div>
                      <div className="staff-smart-create__template-badges">
                        {template.sensitive ? (
                          <Badge tone="amber">{t('admin.staffCenter.smartCreate.sensitiveBadge')}</Badge>
                        ) : null}
                        {template.requires_user_account ? (
                          <Badge tone="blue">
                            {t('admin.staffCenter.smartCreate.requiresLoginBadge')}
                          </Badge>
                        ) : null}
                        {template.creates_teacher_profile ? (
                          <Badge tone="green">
                            {t('admin.staffCenter.smartCreate.createsTeacherBadge')}
                          </Badge>
                        ) : null}
                      </div>
                    </header>
                    {template.description ? (
                      <p className="tiny muted staff-smart-create__template-desc">{template.description}</p>
                    ) : null}
                    {template.bundle_codes?.length ? (
                      <div className="staff-smart-create__template-bundles">
                        <span className="tiny muted staff-smart-create__template-bundles-label">
                          {t('admin.staffCenter.smartCreate.responsibilityBundles')}
                        </span>
                        <TemplateBundleChips bundleCodes={template.bundle_codes} t={t} />
                      </div>
                    ) : null}
                    <div className="staff-smart-create__template-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => onPreview(template)}
                      >
                        {t('admin.staffCenter.smartCreate.previewAction')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm${selected ? ' btn--primary' : ''}`}
                        onClick={() => onSelect(template)}
                      >
                        {selected
                          ? t('admin.staffCenter.smartCreate.selectedTemplate')
                          : t('admin.staffCenter.smartCreate.selectTemplateAction')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
