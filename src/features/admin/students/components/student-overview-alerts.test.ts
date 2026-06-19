import { describe, expect, it } from 'vitest';
import { localizeOverviewAlertField } from './student-overview-alerts';

const AR_ALERTS: Record<string, string> = {
  'admin.student360.overview.alerts.known.missingGuardian': 'ولي أمر غير مسجّل',
  'admin.student360.overview.alerts.messages.missingGuardian': 'لا يوجد ولي أمر مسجّل لهذا التلميذ.',
};

function arT(key: string): string {
  return AR_ALERTS[key] ?? key;
}

describe('localizeOverviewAlertField', () => {
  it('translates missing_guardian raw title without alert code', () => {
    const title = localizeOverviewAlertField(
      arT,
      { severity: 'warning', title: 'missing_guardian' },
      'title',
    );
    expect(title).toBe('ولي أمر غير مسجّل');
    expect(title).not.toContain('missing_guardian');
  });

  it('translates missing_guardian message from alert code', () => {
    const message = localizeOverviewAlertField(
      arT,
      {
        severity: 'warning',
        code: 'missing_guardian',
        title: 'missing_guardian',
        message: 'missing_guardian',
      },
      'message',
    );
    expect(message).toBe('لا يوجد ولي أمر مسجّل لهذا التلميذ.');
  });
});
