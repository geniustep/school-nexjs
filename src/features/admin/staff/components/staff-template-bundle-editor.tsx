'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  isStaffTemplateBundleRemovable,
  resolveAddableStaffTemplateBundleCodes,
  resolveForbiddenStaffTemplateBundleCodes,
  resolveRequiredBundleCodes,
  resolveSelectedEditableBundleCodes,
  resolveStaffTemplateBundleLabel,
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const requiredCodes = useMemo(() => resolveRequiredBundleCodes(template), [template]);
  const editableCodes = useMemo(
    () => resolveSelectedEditableBundleCodes(template, selectedBundleCodes),
    [template, selectedBundleCodes],
  );
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
    setPickerOpen(false);
  }

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
                  {resolveStaffTemplateBundleLabel(code, t)}
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
                  {resolveStaffTemplateBundleLabel(code, t)}
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

      {addableCodes.length ? (
        <div className="staff-smart-create__bundle-add">
          {!pickerOpen ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={disabled}
              onClick={() => setPickerOpen(true)}
            >
              {t('admin.staffCenter.smartCreate.addBundleAction')}
            </button>
          ) : (
            <label className="staff-smart-create__field staff-smart-create__bundle-add-picker">
              <span className="tiny muted">{t('admin.staffCenter.smartCreate.addBundleAction')}</span>
              <select
                className="input"
                defaultValue=""
                disabled={disabled}
                onChange={(event) => {
                  if (event.target.value) addBundle(event.target.value);
                  event.target.value = '';
                }}
              >
                <option value="">{t('admin.staffCenter.smartCreate.addBundlePlaceholder')}</option>
                {addableCodes.map((code) => (
                  <option key={code} value={code}>
                    {resolveStaffTemplateBundleLabel(code, t)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : null}

      {forbiddenCodes.length ? (
        <div className="staff-smart-create__bundle-group staff-smart-create__bundle-group--forbidden">
          <h4 className="staff-smart-create__bundle-group-title">
            {t('admin.staffCenter.smartCreate.forbiddenBundlesTitle')}
          </h4>
          <ul className="staff-smart-create__bundle-chips">
            {forbiddenCodes.map((code) => (
              <li key={code}>
                <span className="staff-smart-create__bundle-chip staff-smart-create__bundle-chip--forbidden">
                  {resolveStaffTemplateBundleLabel(code, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
