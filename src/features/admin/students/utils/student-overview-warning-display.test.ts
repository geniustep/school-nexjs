import { describe, expect, it } from 'vitest';
import {
  dedupeOverviewAlerts,
  filterSchoolingWarningItems,
  localizeOverviewAlertField,
  localizeOverviewWarningToken,
} from './student-overview-warning-display';

const AR_ALERTS: Record<string, string> = {
  'admin.student360.overview.alerts.known.missingGuardian': 'ولي أمر غير مسجّل',
  'admin.student360.overview.alerts.messages.missingGuardian': 'لا يوجد ولي أمر مسجّل لهذا التلميذ.',
  'admin.student360.overview.alerts.known.missingPhoto': 'صورة التلميذ غير متوفرة',
  'admin.student360.overview.alerts.unknownReview': 'تنبيه يحتاج مراجعة',
};

function arT(key: string): string {
  return AR_ALERTS[key] ?? key;
}

describe('student overview warning display', () => {
  it('filters missing_guardian from schooling warnings', () => {
    expect(filterSchoolingWarningItems(['missing_guardian', 'missing_photo'])).toEqual(['missing_photo']);
  });

  it('dedupes duplicate overview alerts by code', () => {
    const alerts = dedupeOverviewAlerts([
      { severity: 'warning', code: 'missing_guardian', title: 'missing_guardian' },
      { severity: 'warning', title: 'missing_guardian' },
    ]);
    expect(alerts).toHaveLength(1);
  });

  it('translates missing_guardian alert fields', () => {
    const title = localizeOverviewAlertField(
      arT,
      { severity: 'warning', title: 'missing_guardian' },
      'title',
    );
    expect(title).toBe('ولي أمر غير مسجّل');
    expect(title).not.toContain('missing_guardian');
  });

  it('localizes schooling warning tokens and uses fallback for unknown codes', () => {
    expect(localizeOverviewWarningToken(arT, 'missing_photo')).toBe('صورة التلميذ غير متوفرة');
    expect(localizeOverviewWarningToken(arT, 'missing_health_file')).toBe('تنبيه يحتاج مراجعة');
  });
});
