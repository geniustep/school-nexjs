import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getAmendmentReasonPresetOptions,
  isSingleMonthSelection,
  resolveAffectedMonthLabels,
  resolveAmendmentReasonPresetLabel,
} from './agreement-amendment-preview-model';

const componentsDir = join(
  process.cwd(),
  'src',
  'features',
  'admin',
  'student-finance',
  'components',
);

const reasonSelectorSource = readFileSync(
  join(componentsDir, 'agreement-amendment-reason-selector.tsx'),
  'utf8',
);
const dialogSource = readFileSync(
  join(componentsDir, 'student-finance-agreement-amendment-dialog.tsx'),
  'utf8',
);
const previewSource = readFileSync(
  join(componentsDir, 'agreement-amendment-live-preview-panel.tsx'),
  'utf8',
);

describe('Finance Amendment reason and sparse-period UX contract', () => {
  it('keeps management decision first and uses it as the default reason', () => {
    const options = getAmendmentReasonPresetOptions('ar');
    expect(options[0]).toEqual({ key: 'manager_decision', label: 'قرار المدير' });
    expect(options.at(-1)).toEqual({ key: 'other', label: 'أخرى' });
    expect(resolveAmendmentReasonPresetLabel('fr', 'manager_decision')).toBe(
      'Décision de la direction',
    );
    expect(dialogSource).toContain(
      "reason: resolveAmendmentReasonPresetLabel(locale, 'manager_decision')",
    );
    expect(reasonSelectorSource).toContain("return value.trim() ? 'other' : 'manager_decision'");
  });

  it('renders reason as a compact controlled selector with free text only for Other', () => {
    expect(reasonSelectorSource).toContain('<select');
    expect(reasonSelectorSource).toContain("preset === 'other'");
    expect(reasonSelectorSource).toContain('<textarea');
    expect(reasonSelectorSource).not.toContain('type="radio"');
  });

  it('keeps legacy month-label helpers compatible for older amendment consumers', () => {
    const periods = [
      { id: 291, label: 'شتنبر 2026', periodKey: '2026-09' },
      { id: 292, label: 'أكتوبر 2026', periodKey: '2026-10' },
    ];
    expect(isSingleMonthSelection('291', '291')).toBe(true);
    expect(
      resolveAffectedMonthLabels({
        periods,
        affectedPeriods: [],
        effectivePeriodId: '291',
        effectivePeriodEndId: '291',
        locale: 'ar',
      }),
    ).toEqual(['شتنبر 2026']);
  });

  it('turns backend period keys into month names for preview consumers', () => {
    const periods = [
      { id: 291, label: 'شتنبر 2026', periodKey: '2026-09' },
      { id: 292, label: 'أكتوبر 2026', periodKey: '2026-10' },
    ];
    expect(
      resolveAffectedMonthLabels({
        periods,
        affectedPeriods: ['2026-09', '2026-10'],
        effectivePeriodId: '291',
        effectivePeriodEndId: '',
        locale: 'ar',
      }),
    ).toEqual(['شتنبر 2026', 'أكتوبر 2026']);
  });

  it('restores modify, add, and remove operations with modify as the default', () => {
    expect(dialogSource).toContain("operationType: 'modify_line'");
    expect(dialogSource).toContain("['modify_line', copy.modify]");
    expect(dialogSource).toContain("['add_line', copy.add]");
    expect(dialogSource).toContain("['cancel_line', copy.remove]");
    expect(dialogSource).toContain('<AgreementAmendmentSparsePeriodGrid');
    expect(dialogSource).toContain('<AgreementAmendmentMonthRail');
  });

  it('places reason before price and always renders preview and apply actions', () => {
    expect(dialogSource.indexOf('<AgreementAmendmentReasonSelector')).toBeLessThan(
      dialogSource.indexOf('student-finance-amendment-new-price'),
    );
    expect(dialogSource).toContain('type="submit"');
    expect(dialogSource).toContain('disabled={applyLoading || previewLoading || !applyReady}');
    expect(dialogSource).not.toContain('previewReady && preview?.canApply ? (');
  });

  it('keeps the preview backend-authoritative and shows Odoo-confirmed impact', () => {
    expect(previewSource).toContain('النتيجة المالية المؤكدة من Odoo');
    expect(previewSource).toContain('preview.createdInstallments.length');
    expect(previewSource).toContain('preview.updatedInstallments.length');
    expect(previewSource).toContain('preview.cancelledInstallments.length');
    expect(previewSource).toContain('periodImpacts.map');
  });
});
