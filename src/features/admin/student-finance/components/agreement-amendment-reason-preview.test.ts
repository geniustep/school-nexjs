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

describe('Finance Amendment reason and live-preview UX contract', () => {
  it('defaults to management decision and keeps Other as the custom option', () => {
    const options = getAmendmentReasonPresetOptions('ar');
    expect(options[0]).toEqual({ key: 'manager_decision', label: 'قرار المدير' });
    expect(options.at(-1)).toEqual({ key: 'other', label: 'أخرى' });
    expect(resolveAmendmentReasonPresetLabel('fr', 'manager_decision')).toBe(
      'Décision de la direction',
    );
  });

  it('requires free text only when Other is selected', () => {
    expect(reasonSelectorSource).toContain("useState<AmendmentReasonPresetKey>('manager_decision')");
    expect(reasonSelectorSource).toContain("preset === 'other'");
    expect(reasonSelectorSource).toContain('required');
    expect(reasonSelectorSource).toContain('scheduleAutoPreview()');
  });

  it('keeps one selected month visible before a backend preview exists', () => {
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

  it('turns backend period keys into month names and never needs installment labels', () => {
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

  it('renders the guided panel continuously instead of waiting for a preview response', () => {
    expect(dialogSource).toContain('<AgreementAmendmentReasonSelector');
    expect(dialogSource).toContain('<AgreementAmendmentLivePreviewPanel');
    expect(dialogSource).toContain('student-finance-amendment-preview--legacy');
  });
});
