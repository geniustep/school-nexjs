import { describe, expect, it } from 'vitest';
import { resolveHomeworkCommunicationStatus } from './homework-communication-status';

describe('resolveHomeworkCommunicationStatus', () => {
  it('keeps an older response without the contract explicitly unavailable', () => {
    expect(resolveHomeworkCommunicationStatus({})).toEqual({
      kind: 'unavailable',
      tone: 'slate',
    });
  });

  it('does not claim family delivery before communication starts', () => {
    expect(
      resolveHomeworkCommunicationStatus({
        communication_content_id: null,
        communication_state: null,
        is_family_visible: false,
        pending_approval: false,
      }),
    ).toEqual({ kind: 'not-started', tone: 'slate' });
  });

  it('shows pending communication review from the backend flag', () => {
    expect(
      resolveHomeworkCommunicationStatus({
        communication_content_id: 700,
        communication_state: 'submitted',
        is_family_visible: false,
        pending_approval: true,
      }),
    ).toEqual({ kind: 'pending-approval', tone: 'amber' });
  });

  it('shows actual family visibility only from is_family_visible', () => {
    expect(
      resolveHomeworkCommunicationStatus({
        communication_content_id: 709,
        communication_state: 'published',
        is_family_visible: true,
        pending_approval: false,
      }),
    ).toEqual({ kind: 'family-visible', tone: 'green' });
  });

  it('never infers family visibility from the academic published state', () => {
    const academicallyPublished = {
      state: 'published',
      communication_content_id: 700,
      communication_state: 'submitted',
      is_family_visible: false,
      pending_approval: true,
    };

    expect(resolveHomeworkCommunicationStatus(academicallyPublished).kind).not.toBe(
      'family-visible',
    );
  });
});
