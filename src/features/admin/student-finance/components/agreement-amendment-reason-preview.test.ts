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

describe('Finance Amendment reason and sparse-period UX contract', () => {
  it('keeps management decision available without selecting it for the user', () => {
    const options = getAmendmentReasonPresetOptions('ar');
    expect(options[0]).toEqual({ key: 'manager_decision', label: 'قرار المدير' });
    expect(options.at(-1)).toEqual({ key: 'other', label: 'أخرى' });
    expect(resolveAmendmentReasonPresetLabel('fr', 'manager_decision')).toBe(
      'Décision de la direction',
    );
    expect(reasonSelectorSource).toContain(
      'useState<AmendmentReasonPresetKey | null>(null)',
    );
    expect(reasonSelectorSource).not.toContain(
      "useState<AmendmentReasonPresetKey>('manager_decision')",
    );
  });

  it('requires an explicit reason choice and free text only for Other', () => {
    expect(reasonSelectorSource).toContain("preset === 'other'");
    expect(reasonSelectorSource).toContain('required');
    expect(reasonSelectorSource).not.toContain('scheduleAutoPreview()');
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

  it('turns backend period keys into month names for legacy preview consumers', () => {
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

  it('adopts service-first sparse-period UX without operation or range selectors', () => {
    expect(dialogSource).toContain('<AgreementAmendmentLinePicker');
    expect(dialogSource).toContain('<AgreementAmendmentSparsePeriodGrid');
    expect(dialogSource).toContain('<AgreementAmendmentReasonSelector');
    expect(dialogSource).toContain('<AgreementAmendmentLivePreviewPanel');
    expect(dialogSource).not.toContain('<AgreementAmendmentRangeRail');
    expect(dialogSource).not.toContain('operation.label');
    expect(dialogSource).not.toContain('amendmentPathLegend');
  });
});
