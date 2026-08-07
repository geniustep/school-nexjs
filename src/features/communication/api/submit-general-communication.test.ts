import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/communication/api/admin-communication-api', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/communication/api/admin-communication-api')
  >('@/features/communication/api/admin-communication-api');
  return {
    ...actual,
    createAdminCommunicationContent: createMock,
    updateAdminCommunicationContent: updateMock,
  };
});

import { submitGroupGeneralCommunication } from './submit-general-communication';

describe('submitGroupGeneralCommunication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({
      success: true,
      data: { id: 90, state: 'draft' },
      meta: {},
    });
    updateMock.mockResolvedValue({
      success: true,
      data: { id: 90, state: 'draft' },
      meta: {},
    });
  });

  it('creates draft then submits and classifies 202 as pending_review without inventing publish', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 202,
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 90,
            state: 'submitted',
            communication_content_id: 90,
          },
          meta: {},
        }),
      }),
    );

    const result = await submitGroupGeneralCommunication({
      draftId: null,
      subject: 'S',
      body: 'B',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'guardians' },
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      '/api/odoo/admin/communication/content/90/submit',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome.kind).toBe('pending_review');
      expect(result.outcome.httpStatus).toBe(202);
    }
  });

  it('PATCHes existing draft before submit and accepts 201', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 201,
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 90, state: 'published' },
          meta: {},
        }),
      }),
    );

    const result = await submitGroupGeneralCommunication({
      draftId: 90,
      subject: 'S2',
      body: 'B2',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'staff' },
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(90, {
      subject: 'S2',
      body: 'B2',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'staff' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome.kind).toBe('accepted');
      expect(result.outcome.httpStatus).toBe(201);
    }
  });
});
