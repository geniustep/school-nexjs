import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatAmendmentPreviewPeriodLabel,
  getAmendmentReasonPresetOptions,
  isSingleMonthSelection,
  reconcileSparsePeriodSelectionWithPreview,
  resolveAffectedMonthLabels,
  resolveAmendmentReasonPresetLabel,
} from './agreement-amendment-preview-model';
import { buildAgreementAnnualSummary } from './agreement-amendment-annual-summary';

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
const sparseGridSource = readFileSync(
  join(componentsDir, 'agreement-amendment-sparse-period-grid.tsx'),
  'utf8',
);
const autoPreviewSource = readFileSync(
  join(componentsDir, 'use-agreement-amendment-auto-preview.ts'),
  'utf8',
);
const feedbackCssSource = readFileSync(
  join(componentsDir, 'agreement-amendment-feedback.css'),
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

  it('uses plain month labels in amendment cards and preview without the legacy suffix', () => {
    const label = formatAmendmentPreviewPeriodLabel(
      { id: 291, label: 'شتنبر 2026', periodKey: '2026-09' },
      'ar',
    );
    expect(label).toBe('شتنبر 2026');
    expect(label).not.toContain('وما بعده');
    expect(previewSource).toContain('formatAmendmentPreviewPeriodLabel');
    expect(sparseGridSource).toContain('formatAmendmentPreviewPeriodLabel');
    expect(previewSource).not.toContain('formatAmendmentEffectivePeriodLabel');
    expect(sparseGridSource).not.toContain('formatAmendmentEffectivePeriodLabel');
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

  it('removes blocked months and their special prices from sparse selection', () => {
    const result = reconcileSparsePeriodSelectionWithPreview({
      selectedPeriodIds: ['291', '292', '293'],
      periodAmountOverrides: { '292': '900', '293': '1200' },
      periodImpacts: [
        { effectivePeriodId: 291, amendable: true },
        { effectivePeriodId: 292, amendable: false },
        { effectivePeriodId: 293, amendable: true },
      ],
    });
    expect(result.blockedPeriodIds).toEqual(['292']);
    expect(result.selectedPeriodIds).toEqual(['291', '293']);
    expect(result.periodAmountOverrides).toEqual({ '293': '1200' });
    expect(result.changed).toBe(true);
  });

  it('reruns preview after sparse period state settles and reacts to sparse controls', () => {
    expect(sparseGridSource).toContain('notifyPreviewAfterStateUpdate');
    expect(sparseGridSource).toContain('window.setTimeout');
    expect(sparseGridSource).toContain("dispatchEvent(new Event('change', { bubbles: true }))");
    expect(autoPreviewSource).toContain(".student-finance-amendment-sparse-period__toggle");
    expect(autoPreviewSource).toContain(".student-finance-amendment-sparse-period__override");
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

  it('keeps the financial preview implementation-neutral for the end user', () => {
    expect(previewSource).toContain('المعاينة المالية قبل التفعيل');
    expect(previewSource).toContain('تم تحديث المعاينة');
    expect(previewSource).toContain('الأشهر المتأثرة');
    expect(previewSource).toContain('التغييرات المتوقعة');
    expect(previewSource).not.toContain('Odoo');
    expect(feedbackCssSource).toContain('.student-finance-amendment-form__action-note');
    expect(feedbackCssSource).toContain('display: none');
    expect(previewSource).toContain('preview.createdInstallments.length');
    expect(previewSource).toContain('preview.updatedInstallments.length');
    expect(previewSource).toContain('preview.cancelledInstallments.length');
    expect(previewSource).toContain('periodImpacts.map');
  });

  it('uses authoritative annual totals directly and never recomputes the annual agreement from services', () => {
    const summary = buildAgreementAnnualSummary({
      id: 42,
      student_id: 7,
      state: 'active',
      financial_summary: { schedule_total: 25000 },
      lines: [
        { id: 1, service_name: 'التمدرس', schedule_total: 12000, unit_price: 1200, schedule_period_count: 10 },
        { id: 2, service_name: 'النقل', schedule_total: 15000, unit_price: 1500, schedule_period_count: 10 },
      ],
    });
    // Deliberately inconsistent service totals prove the UI is not summing them locally.
    expect(summary.total).toBe(25000);
    expect(summary.services.map((service) => service.total)).toEqual([12000, 15000]);
    expect(previewSource).toContain('preview.delta');
    expect(previewSource).toContain('buildAgreementAnnualSummary');
  });
});
