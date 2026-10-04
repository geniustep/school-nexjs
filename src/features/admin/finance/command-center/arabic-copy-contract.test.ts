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
        };
      };
    };
  };
}

describe('Finance Command Center Arabic terminology', () => {
  it('uses plain operational wording for overdue-duration grouping', () => {
    const copy = arabicMessages().admin.finance.commandCenter;

    expect(copy.agingTitle).toBe('الرصيد حسب مدة التأخر');
    expect(copy.agingSubtitle).toBe(
      'توزيع الرصيد غير المسدد حسب مدة التأخر عن الاستحقاق.',
    );
    expect(copy.loadingAging).not.toContain('أعمار');
    expect(copy.agingTitle).not.toContain('أعمار');
    expect(copy.agingUnavailableTitle).not.toContain('Aging');
  });
});
