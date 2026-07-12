import { describe, expect, it, vi } from 'vitest';
import { createAdmissionDecision, acceptAdmissionOffer } from '../api/admissions-api';
import { resolveFamilyBatchMixedSummary } from './admission-status-display';
import { evaluateKanbanDragStateChange } from './admission-kanban-drag';

vi.mock('@/lib/api/client', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '@/lib/api/client';

describe('admission action endpoints (no derived state PATCH)', () => {
  it('school rejection uses decision endpoint payload', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: true,
      data: { id: 1, state: 'lost', decision: 'rejected', allowed_actions: {} },
      meta: {},
    } as never);
    await createAdmissionDecision(1, {
      decision: 'rejected',
      decision_notes: 'capacity',
    });
    expect(api.post).toHaveBeenCalled();
    const [, payload] = vi.mocked(api.post).mock.calls[0];
    expect(payload).toMatchObject({ decision: 'rejected', decision_notes: 'capacity' });
    expect(payload).not.toMatchObject({ state: 'lost' });
  });

  it('accept offer uses offer accept endpoint not state PATCH', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: true,
      data: { id: 1, state: 'confirmed', allowed_actions: {} },
      meta: {},
    } as never);
    await acceptAdmissionOffer(10, 22);
    const [url] = vi.mocked(api.post).mock.calls.at(-1)!;
    expect(String(url)).toMatch(/offers/);
  });

  it('does not allow direct drag to confirmed/ready', () => {
    expect(
      evaluateKanbanDragStateChange({ state: 'offer_sent' }, 'ready_for_registration').apply,
    ).toBe(false);
  });
});

describe('family sibling status isolation', () => {
  it('two children with different statuses stay mixed', () => {
    const summary = resolveFamilyBatchMixedSummary([
      {
        state: 'confirmed',
        registration_status: 'awaiting_registration',
        decision: 'accepted',
      },
      {
        state: 'under_review',
        registration_status: 'not_applicable',
        decision: false,
      },
    ]);
    expect(summary).toBe('mixed');
  });
});
