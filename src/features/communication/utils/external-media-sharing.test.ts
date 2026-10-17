import { describe, expect, it } from 'vitest';
import { eligibleForExternalMediaShare, effectiveExternalMediaShare } from './external-media-sharing';
import type { RecipientScope } from '@/types/recipient-scope';

const school: RecipientScope = { scope_type: 'school', beneficiary_kind: 'everyone' };
const classScope: RecipientScope = { scope_type: 'class', beneficiary_kind: 'guardians', scope_id: 5 };
const levelScope: RecipientScope = { scope_type: 'level', beneficiary_kind: 'students', scope_id: 3 };

describe('announcement external media sharing choice', () => {
  it('allows new school-wide announcements when admin opted in', () => {
    expect(eligibleForExternalMediaShare('announcement', school)).toBe(true);
    expect(effectiveExternalMediaShare('announcement', school, true)).toBe(true);
  });
  it('respects explicit opt out', () => {
    expect(effectiveExternalMediaShare('announcement', school, false)).toBe(false);
  });
  it('fails closed on missing permission', () => {
    expect(effectiveExternalMediaShare('announcement', school, undefined)).toBe(false);
  });
  it('never allows restricted audiences', () => {
    expect(effectiveExternalMediaShare('announcement', classScope, true)).toBe(false);
    expect(effectiveExternalMediaShare('announcement', levelScope, true)).toBe(false);
    expect(effectiveExternalMediaShare('announcement', null, true)).toBe(false);
  });
  it('never enables the permission on messages', () => {
    expect(effectiveExternalMediaShare('message', school, true)).toBe(false);
  });
});
