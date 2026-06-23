'use client';

import { useMemo } from 'react';
import { useLocale, useT } from '@/features/i18n/locale-context';
import {
  isStaffTemplateBundleRemovable,
  resolveAddableStaffTemplateBundleCodes,
  resolveForbiddenStaffTemplateBundleCodes,
  resolveRequiredBundleCodes,
  resolveSelectedEditableBundleCodes,
  resolveStaffTemplateAddBundleActionLabel,
  resolveStaffTemplateBundleLabel,
  resolveStaffTemplateOptionalBundlePool,
} from '@/features/admin/staff/utils/staff-template-utils';
import type { StaffCreationTemplate } from '@/types/staff-templates';

export function StaffTemplateBundleEditor({
  template,
  selectedBundleCodes,
  disabled,
  onChange,
}: {
  template: StaffCreationTemplate;
  selectedBundleCodes: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const bundleLabelOptions = { locale };

  const requiredCodes = useMemo(() => resolveRequiredBundleCodes(template), [template]);
  const editableCodes = useMemo(
    () => resolveSelectedEditableBundleCodes(template, selectedBundleCodes),
    [template, selectedBundleCodes],
  );
  const optionalPool = useMemo(() => resolveStaffTemplateOptionalBundlePool(template), [template]);
  const addableCodes = useMemo(
    () => resolveAddableStaffTemplateBundleCodes(template, selectedBundleCodes),
    [template, selectedBundleCodes],
  );
  const forbiddenCodes = useMemo(() => resolveForbiddenStaffTemplateBundleCodes(template), [template]);

  function removeBundle(code: string) {
    if (!isStaffTemplateBundleRemovable(template, code)) return;
    onChange(selectedBundleCodes.filter((item) => item !== code));
  }

  function addBundle(code: string) {
    if (!code || selectedBundleCodes.includes(code)) return;
    onChange([...selectedBundleCodes, code]);
  }

  const emptyAddableMessage =
    optionalPool.length === 0
      ? t('admin.staffCenter.smartCreate.templateNoExtraBundlesDesc')
      : t('admin.staffCenter.smartCreate.noAddableBundlesDesc');

  return (
    <section className="staff-smart-create__section-card staff-smart-create__bundle-editor">
      <h3 className="staff-smart-create__section-title">
        {t('admin.staffCenter.smartCreate.bundleEditorTitle')}
      </h3>

      {requiredCodes.length ? (
        <div className="staff-smart-create__bundle-group">
          <h4 className="staff-smart-create__bundle-group-title">
            {t('admin.staffCenter.smartCreate.requiredBundlesTitle')}
          </h4>
          <ul className="staff-smart-create__bundle-chips">
            {requiredCodes.map((code) => (
              <li key={code}>
                <span className="staff-smart-create__bundle-chip staff-smart-create__bundle-chip--required">
                  {resolveStaffTemplateBundleLabel(code, t, bundleLabelOptions)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="staff-smart-create__bundle-group">
        <h4 className="staff-smart-create__bundle-group-title">
          {t('admin.staffCenter.smartCreate.selectedBundlesTitle')}
        </h4>
        {editableCodes.length ? (
          <ul className="staff-smart-create__bundle-chips">
            {editableCodes.map((code) => (
              <li key={code}>
                <span className="staff-smart-create__bundle-chip staff-smart-create__bundle-chip--editable">
                  {resolveStaffTemplateBundleLabel(code, t, bundleLabelOptions)}
                  {isStaffTemplateBundleRemovable(template, code) ? (
                    <button
                      type="button"
                      className="staff-smart-create__bundle-chip-remove"
                      aria-label={t('admin.staffCenter.smartCreate.removeBundle')}
                      disabled={disabled}
                      onClick={() => removeBundle(code)}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tiny muted">{t('admin.staffCenter.smartCreate.noSelectedBundles')}</p>
        )}
      </div>

      <div className="staff-smart-create__bundle-group staff-smart-create__bundle-group--addable">
        <h4 className="staff-smart-create__bundle-group-title">
          {t('admin.staffCenter.smartCreate.availableBundlesTitle')}
        </h4>
        {addableCodes.length ? (
          <ul className="staff-smart-create__bundle-add-actions">
            {addableCodes.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm staff-smart-create__bundle-add-btn"
                  disabled={disabled}
                  onClick={() => addBundle(code)}
                >
                  {resolveStaffTemplateAddBundleActionLabel(code, t, bundleLabelOptions)}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tiny muted">{emptyAddableMessage}</p>
        )}
      </div>

      {forbiddenCodes.length ? (
        <div className="staff-smart-create__bundle-group staff-smart-create__bundle-group--forbidden">
          <h4 className="staff-smart-create__bundle-group-title">
            {t('admin.staffCenter.smartCreate.forbiddenBundlesTitle')}
          </h4>
          <ul className="staff-smart-create__bundle-chips">
            {forbiddenCodes.map((code) => (
              <li key={code}>
                <span className="staff-smart-create__bundle-chip staff-smart-create__bundle-chip--forbidden">
                  {resolveStaffTemplateBundleLabel(code, t, bundleLabelOptions)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
