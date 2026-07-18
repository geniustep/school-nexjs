import { describe, expect, it } from 'vitest';
import { canResubmitPendingContent } from './can-resubmit-pending';

const base = {
  state: 'changes_requested' as const,
  content_type: 'message' as const,
  channel_id: 10,
  author: { id: 7, name: 'Done' },
  allowed_actions: ['resubmit'] as string[],
};

describe('canResubmitPendingContent', () => {
  it('allows author with resubmit action in changes_requested', () => {
    expect(canResubmitPendingContent(base, { currentUserId: 7, requireChannelMessage: true })).toBe(
      true,
    );
  });

  it('hides for non-author', () => {
    expect(canResubmitPendingContent(base, { currentUserId: 99, requireChannelMessage: true })).toBe(
      false,
    );
  });

  it('hides without allowed action resubmit', () => {
    expect(
      canResubmitPendingContent(
        { ...base, allowed_actions: ['approve'] },
        { currentUserId: 7, requireChannelMessage: true },
      ),
    ).toBe(false);
  });

  it('hides when state is not changes_requested', () => {
    expect(
      canResubmitPendingContent(
        { ...base, state: 'submitted' },
        { currentUserId: 7, requireChannelMessage: true },
      ),
    ).toBe(false);
  });

  it('hides homework content when requireChannelMessage', () => {
    expect(
      canResubmitPendingContent(
        { ...base, content_type: 'homework' },
        { currentUserId: 7, requireChannelMessage: true },
      ),
    ).toBe(false);
  });

  it('hides when channel_id missing for admin path', () => {
    expect(
      canResubmitPendingContent(
        { ...base, channel_id: null },
        { currentUserId: 7, requireChannelMessage: true },
      ),
    ).toBe(false);
  });
});
