import { describe, expect, it } from 'vitest';
import { normalizeTeacherOptions } from './teacher-options';

describe('normalizeTeacherOptions', () => {
  it('maps snake_case API payload to normalized options', () => {
    const result = normalizeTeacherOptions({
      teacher_types: [{ value: 'vacataire', label: 'Vacataire' }],
      qualifications: [{ value: 'master', label: 'Master' }],
      contract_types: [{ value: 'contract', label: 'Contract' }],
      statuses: [{ value: 'active', label: 'Active' }],
      genders: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }],
      schools: [{ id: 3, name: 'School', code: 'S1' }],
      defaults: {
        teacher_type: 'unknown',
        status: 'active',
        active: true,
        prefer_compact_schedule: false,
      },
      constraints: {
        weekly_hours: { min: 0, unit: 'hours' },
        max_continuous_minutes: { min: 1, unit: 'minutes' },
      },
    });

    expect(result?.teacherTypes[0].value).toBe('vacataire');
    expect(result?.genders).toHaveLength(2);
    expect(result?.defaults.teacherType).toBe('unknown');
    expect(result?.constraints.weeklyHours?.min).toBe(0);
    expect(result?.schools).toHaveLength(1);
  });
});
