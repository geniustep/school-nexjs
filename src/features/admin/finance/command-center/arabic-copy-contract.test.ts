import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function arabicMessages() {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), 'messages/ar.json'), 'utf8'),
  ) as {
    admin: {
      finance: {
        commandCenter: {
          loadingAging: string;
          agingTitle: string;
          agingSubtitle: string;
          agingUnavailableTitle: string;
          aging: {
            current: string;
            '1_30': string;
            '31_60': string;
            '61_90': string;
            '90_plus': string;
          };
          decision: {
            definition: {
              aging: string;
            };
          };
        };
      };
    };
  };
}

describe('Finance Command Center Arabic terminology', () => {
  it('uses plain operational wording for overdue-duration grouping', () => {
    const copy = arabicMessages().admin.finance.commandCenter;

    expect(copy.agingTitle).toBe('المبالغ غير المؤداة حسب مدة التأخر');
    expect(copy.agingSubtitle).toBe(
      'توزيع المبالغ غير المؤداة حسب المدة التي مضت على تاريخ الاستحقاق.',
    );
    expect(copy.aging['1_30']).toBe('متأخر من يوم إلى 30 يومًا');
    expect(copy.aging['31_60']).toBe('متأخر من 31 إلى 60 يومًا');
    expect(copy.aging['61_90']).toBe('متأخر من 61 إلى 90 يومًا');
    expect(copy.aging['90_plus']).toBe('متأخر أكثر من 90 يومًا');
    expect(copy.loadingAging).not.toContain('Aging');
    expect(copy.agingTitle).not.toContain('أعمار');
    expect(copy.agingUnavailableTitle).not.toContain('Aging');
    expect(copy.decision.definition.aging).toContain('المبلغ غير المؤدى');
  });
});
