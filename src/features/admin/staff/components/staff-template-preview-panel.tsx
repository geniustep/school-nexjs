'use client';

import { InfoBanner } from '@/components/ui/primitives';
import { useLocale, useT, type TranslateFn } from '@/features/i18n/locale-context';
import {
  formatStaffTemplatePreviewWarning,
  formatStaffTemplateRequiredField,
  resolvePreviewMissingAssignmentFields,
  resolveStaffTemplateBundleLabel,
  resolveStaffTemplateCapabilityItems,
  resolveStaffTemplateCapabilityLabel,
  splitStaffTemplateDisplayList,
  STAFF_TEMPLATE_CAPABILITY_DISPLAY_LIMIT,
} from '@/features/admin/staff/utils/staff-template-utils';
import type { StaffTemplateAssignments, StaffTemplateCapabilityItem, StaffTemplatePreview } from '@/types/staff-templates';

function CapabilityItemsList({
  items,
  locale,
  variant,
  emptyLabel,
  moreLabelKey,
  t,
}: {
  items: StaffTemplateCapabilityItem[];
  locale: 'ar' | 'en' | 'fr' | 'es';
  variant: 'allowed' | 'forbidden';
  emptyLabel: string;
  moreLabelKey: string;
  t: TranslateFn;
}) {
  const { visible, overflowCount } = splitStaffTemplateDisplayList(
    items,
    STAFF_TEMPLATE_CAPABILITY_DISPLAY_LIMIT,
  );
  const marker = variant === 'allowed' ? '✓' : '✕';

  if (!items.length) {
    return <p className="tiny muted">{emptyLabel}</p>;
  }

  return (
    <ul
      className={`staff-smart-create__capability-list staff-smart-create__capability-list--${variant}`}
    >
      {visible.map((item) => (
        <li key={item.code}>
          {marker} {resolveStaffTemplateCapabilityLabel(item, locale, t)}
        </li>
      ))}
      {overflowCount > 0 ? (
        <li className="staff-smart-create__capability-more">
          {t(moreLabelKey, { count: overflowCount })}
        </li>
      ) : null}
    </ul>
  );
}

export function StaffTemplatePreviewPanel({
  preview,
  loading,
  error,
  missingFields,
  selectedBundleCodes,
  assignments,
  hideSummaryTitle = false,
}: {
  preview: StaffTemplatePreview | null;
  loading: boolean;
  error: string | null;
  missingFields?: string[];
  selectedBundleCodes?: string[];
  assignments?: StaffTemplateAssignments;
  hideSummaryTitle?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();

  if (loading) {
    return <p className="tiny muted">{t('admin.staffCenter.smartCreate.previewLoading')}</p>;
  }

  if (error) {
    return (
      <InfoBanner
        tone="amber"
        icon="⚠"
        title={t('admin.staffCenter.smartCreate.previewErrorTitle')}
        description={t('admin.staffCenter.smartCreate.previewErrorDesc')}
      />
    );
  }

  if (!preview) {
    return (
      <p className="tiny muted">{t('admin.staffCenter.smartCreate.previewEmpty')}</p>
    );
  }

  const allowedItems = resolveStaffTemplateCapabilityItems(preview, 'allowed');
  const forbiddenItems = resolveStaffTemplateCapabilityItems(preview, 'forbidden');
  const warnings = (preview.warnings ?? []).map((item) => formatStaffTemplatePreviewWarning(item, t)).filter(Boolean);
  const requiredFields = [
    ...resolvePreviewMissingAssignmentFields(preview, assignments ?? {}),
    ...(missingFields ?? []),
  ]
    .filter(Boolean)
    .map((field) => formatStaffTemplateRequiredField(field, t));

  const bundleCodes = preview.selected_bundle_codes?.length
    ? preview.selected_bundle_codes
    : selectedBundleCodes?.length
      ? selectedBundleCodes
      : preview.responsibility_bundles ?? [];

  const bundleSplit = splitStaffTemplateDisplayList(
    bundleCodes,
    STAFF_TEMPLATE_CAPABILITY_DISPLAY_LIMIT,
  );

  return (
    <div className="staff-smart-create__preview">
      {!hideSummaryTitle ? (
        <h3 className="staff-smart-create__preview-title">
          {t('admin.staffCenter.smartCreate.previewSummaryTitle')}
        </h3>
      ) : null}

      {!preview.allowed_to_create ? (
        <InfoBanner
          tone="amber"
          icon="⚠"
          title={t('admin.staffCenter.smartCreate.notAllowedTitle')}
          description={
            requiredFields.length
              ? t('admin.staffCenter.smartCreate.notAllowedMissingDesc')
              : t('admin.staffCenter.smartCreate.notAllowedDesc')
          }
        />
      ) : null}

      <div className="staff-smart-create__preview-grid">
        <section className="staff-smart-create__preview-card">
          {bundleSplit.visible.length ? (
            <div className="staff-smart-create__preview-section">
              <h4>{t('admin.staffCenter.smartCreate.selectedBundlesPreviewTitle')}</h4>
              <ul className="staff-smart-create__bundle-chips">
                {bundleSplit.visible.map((item) => (
                  <li key={item}>
                    <span className="staff-smart-create__bundle-chip">
                      {resolveStaffTemplateBundleLabel(item, t)}
                    </span>
                  </li>
                ))}
                {bundleSplit.overflowCount > 0 ? (
                  <li>
                    <span className="staff-smart-create__bundle-chip staff-smart-create__bundle-chip--more">
                      {t('admin.staffCenter.smartCreate.moreItems', {
                        count: bundleSplit.overflowCount,
                      })}
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="staff-smart-create__preview-section">
            <h4>{t('admin.staffCenter.smartCreate.canDoTitle')}</h4>
            <CapabilityItemsList
              items={allowedItems}
              locale={locale}
              variant="allowed"
              emptyLabel={t('admin.staffCenter.noEffectiveCapabilities')}
              moreLabelKey="admin.staffCenter.smartCreate.moreCapabilities"
              t={t}
            />
          </div>
        </section>

        <section className="staff-smart-create__preview-card">
          <div className="staff-smart-create__preview-section">
            <h4>{t('admin.staffCenter.smartCreate.cannotDoTitle')}</h4>
            <CapabilityItemsList
              items={forbiddenItems}
              locale={locale}
              variant="forbidden"
              emptyLabel={t('admin.staffCenter.smartCreate.noForbiddenCapabilities')}
              moreLabelKey="admin.staffCenter.smartCreate.moreCapabilities"
              t={t}
            />
          </div>

          {requiredFields.length ? (
            <div className="staff-smart-create__preview-section">
              <h4>{t('admin.staffCenter.smartCreate.missingRequiredFields')}</h4>
              <p className="tiny muted">{t('admin.staffCenter.smartCreate.completeTheseFields')}</p>
              <ul className="staff-smart-create__warning-list">
                {requiredFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {warnings.length ? (
            <div className="staff-smart-create__preview-section">
              <h4>{t('admin.staffCenter.warningsTitle', { count: warnings.length })}</h4>
              <ul className="staff-smart-create__warning-list">
                {warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
