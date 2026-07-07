import { describe, expect, it } from 'vitest';
import {
  diffLimitedPatchPayload,
  filterLimitedPatchPayload,
  isAllowedLimitedPatchKey,
} from './admission-limited-patch';
import type { PatchAdmissionPayload } from '@/types/admission';

describe('admission limited patch', () => {
  it('filters unsupported keys such as gender and requested_class_id', () => {
    const filtered = filterLimitedPatchPayload({
      next_action: 'call',
      gender: 'male',
      birth_date: '2015-01-01',
      guardian_name: 'Parent',
      requested_class_id: 12,
      requested_level_id: 10,
    });

    expect(filtered).toEqual({
      next_action: 'call',
      requested_level_id: 10,
    });
    expect(isAllowedLimitedPatchKey('gender')).toBe(false);
    expect(isAllowedLimitedPatchKey('requested_level_id')).toBe(true);
  });

  it('returns only changed limited fields', () => {
    const baseline: PatchAdmissionPayload = {
      guardian_phone: '0611111111',
      requested_level_id: 10,
    };
    const current: PatchAdmissionPayload = {
      guardian_phone: '0622222222',
      requested_level_id: 10,
      gender: 'female',
    };

    expect(diffLimitedPatchPayload(current, baseline)).toEqual({
      guardian_phone: '0622222222',
    });
  });
});
