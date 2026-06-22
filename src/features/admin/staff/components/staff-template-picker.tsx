'use client';

import { Fragment, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/primitives';
import { StaffTemplatePreviewPanel } from '@/features/admin/staff/components/staff-template-preview-panel';
import { useT, type TranslateFn } from '@/features/i18n/locale-context';
import {
  groupStaffTemplatesByMainPosition,
  resolveStaffTemplateBundleLabel,
  resolveStaffTemplateMainPositionLabel,
  splitStaffTemplateDisplayList,
  STAFF_TEMPLATE_BUNDLE_DISPLAY_LIMIT,
} from '@/features/admin/staff/utils/staff-template-utils';
import type { StaffCreationTemplate, StaffTemplatePreview } from '@/types/staff-templates';

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
  previewedCode,
  preview,
  previewLoading,
  previewError,
  previewBundleCodes,
  onSelect,
  onPreview,
}: {
  templates: StaffCreationTemplate[];
  selectedCode: string;
  previewedCode: string | null;
  preview: StaffTemplatePreview | null;
  previewLoading: boolean;
  previewError: string | null;
  previewBundleCodes: string[];
  onSelect: (template: StaffCreationTemplate) => void;
  onPreview: (template: StaffCreationTemplate) => void;
}) {
  const t = useT();
  const groups = groupStaffTemplatesByMainPosition(templates);
  const previewSlotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!previewedCode) return;
    if (!previewLoading && !preview && !previewError) return;
    const node = previewSlotRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    node.focus({ preventScroll: true });
  }, [previewedCode, previewLoading, preview, previewError]);

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
                const previewing = template.code === previewedCode;
                const showPreviewSlot =
                  previewing && (previewLoading || preview != null || previewError != null);
                const positionLabel = resolveStaffTemplateMainPositionLabel(template.main_position);
                const cardClassName = [
                  'staff-smart-create__template-card',
                  selected ? 'is-selected' : '',
                  previewing && !selected ? 'is-previewed' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <Fragment key={template.code}>
                    <article className={cardClassName}>
                      {previewing && !selected ? (
                        <span className="staff-smart-create__template-previewing-badge">
                          {t('admin.staffCenter.smartCreate.previewingNowBadge')}
                        </span>
                      ) : null}
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
                          className="btn btn--ghost btn--sm staff-smart-create__template-preview-btn"
                          onClick={() => onPreview(template)}
                        >
                          {t('admin.staffCenter.smartCreate.previewAction')}
                        </button>
                        {selected ? (
                          <span
                            className="staff-smart-create__template-selected-badge"
                            aria-current="true"
                          >
                            {t('admin.staffCenter.smartCreate.selectedTemplate')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm staff-smart-create__template-select-btn"
                            onClick={() => onSelect(template)}
                          >
                            {t('admin.staffCenter.smartCreate.selectTemplateAction')}
                          </button>
                        )}
                      </div>
                    </article>
                    {showPreviewSlot ? (
                      <div
                        ref={previewSlotRef}
                        className="staff-smart-create__template-preview-slot"
                        tabIndex={-1}
                        aria-live="polite"
                        aria-label={t('admin.staffCenter.smartCreate.previewingTemplateTitle', {
                          name: template.name,
                        })}
                      >
                        <header className="staff-smart-create__template-preview-slot-header">
                          <div>
                            <h4 className="staff-smart-create__template-preview-slot-title">
                              {t('admin.staffCenter.smartCreate.previewingTemplateTitle', {
                                name: template.name,
                              })}
                            </h4>
                            {!selected ? (
                              <p className="tiny muted staff-smart-create__preview-only-notice">
                                {t('admin.staffCenter.smartCreate.previewOnlyNotice')}
                              </p>
                            ) : null}
                          </div>
                          {!selected ? (
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() => onSelect(template)}
                            >
                              {t('admin.staffCenter.smartCreate.selectThisTemplateAction')}
                            </button>
                          ) : null}
                        </header>
                        <StaffTemplatePreviewPanel
                          preview={preview}
                          loading={previewLoading}
                          error={previewError}
                          selectedBundleCodes={previewBundleCodes}
                          hideSummaryTitle
                        />
                      </div>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
