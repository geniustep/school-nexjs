import { describe, expect, it } from 'vitest';
import type { StudentFinanceWorkspace } from '../types';
import { isCreateFromCurrentFeesActionAllowed } from './resolve-create-from-current-fees-action';

function ws(partial: Partial<StudentFinanceWorkspace>): StudentFinanceWorkspace {
  return { summary: {} as StudentFinanceWorkspace['summary'], ...partial } as StudentFinanceWorkspace;
}

describe('isCreateFromCurrentFeesActionAllowed', () => {
  it('returns false when there is no workspace', () => {
    expect(isCreateFromCurrentFeesActionAllowed({ workspace: null })).toBe(false);
  });

  it('returns false when no explicit signal is present', () => {
    expect(
      isCreateFromCurrentFeesActionAllowed({
        workspace: ws({ allowed_actions: { create_agreement: true } }),
      }),
    ).toBe(false);
  });

  it('allows when workspace allowed_actions explicitly permits it', () => {
    expect(
      isCreateFromCurrentFeesActionAllowed({
        workspace: ws({ allowed_actions: { create_agreement_from_current_fees: true } }),
      }),
    ).toBe(true);
  });

  it('allows when the current agreement allowed_actions explicitly permits it', () => {
    expect(
      isCreateFromCurrentFeesActionAllowed({
        workspace: ws({
          current_agreement: {
            id: 1,
            student_id: 1,
            state: 'draft',
            allowed_actions: { create_agreement_from_current_fees: true },
          },
        }),
      }),
    ).toBe(true);
  });

  it('allows when agreement repair recommends creating from current fees', () => {
    expect(
      isCreateFromCurrentFeesActionAllowed({
        workspace: ws({
          agreement_repair: {
            required: true,
            recommended_action: 'create_active_agreement_from_current_fees',
          },
        }),
      }),
    ).toBe(true);
  });

  it('does not allow for an unrelated recommended action', () => {
    expect(
      isCreateFromCurrentFeesActionAllowed({
        workspace: ws({
          agreement_repair: { required: true, recommended_action: 'review_inactive_agreement' },
        }),
      }),
    ).toBe(false);
  });
});
