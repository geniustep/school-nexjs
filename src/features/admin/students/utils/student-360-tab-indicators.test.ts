import { describe, expect, it } from 'vitest';
import { buildStudent360TabIndicators } from './student-360-tab-indicators';
import type { StudentDetailsData } from '@/types/student-360';

const BASE_DETAILS: StudentDetailsData = {
  student: { id: 854, first_name: 'Test', last_name: 'Student', status: 'active' },
  current_enrollment: null,
  enrollment_history: [],
  guardian_relationships: [],
  capabilities: {
    can_manage: true,
    can_manage_guardians: true,
    can_view_finance: false,
    can_view_documents: false,
    can_manage_documents: false,
    can_view_health: true,
    can_manage_health: true,
  },
};

describe('buildStudent360TabIndicators health', () => {
  it('does not show red health indicator for legacy allergies="لا"', () => {
    const indicators = buildStudent360TabIndicators(
      {
        ...BASE_DETAILS,
        health_summary: {
          has_profile: true,
          has_critical_alert: true,
          allergies: 'لا',
          chronic_conditions: 'لا',
          health_alert_level: 'none',
        } as StudentDetailsData['health_summary'],
      },
      { showFinance: false, showHealth: true, showDocuments: false },
    );

    expect(indicators.health).toBeUndefined();
  });

  it('shows red health indicator when health_alert_level is critical', () => {
    const indicators = buildStudent360TabIndicators(
      {
        ...BASE_DETAILS,
        health_summary: {
          has_profile: true,
          health_alert_level: 'critical',
          has_critical_health_alert: true,
        },
      },
      { showFinance: false, showHealth: true, showDocuments: false },
    );

    expect(indicators.health).toEqual({
      tab: 'health',
      label: '!',
      tone: 'red',
    });
  });
});
