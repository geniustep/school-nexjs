import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  resolveGeneralCommunicationContentType,
  submitGroupGeneralCommunication,
} from './submit-general-communication';

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults the group journey to message when no explicit intent is present', () => {
    expect(resolveGeneralCommunicationContentType('')).toBe('message');
    expect(resolveGeneralCommunicationContentType('?content_type=unknown')).toBe('message');
  });

  it('resolves announcement intent from the compose query', () => {
    expect(resolveGeneralCommunicationContentType('?content_type=announcement')).toBe(
      'announcement',
    );
  });

  it('creates message draft then submits and classifies 202 as pending_review', async () => {
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

    expect(createMock).toHaveBeenCalledWith({
      subject: 'S',
      body: 'B',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'guardians' },
      content_type: 'message',
    });
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

  it('creates announcement content when the announcement intent is selected', async () => {
    vi.stubGlobal('window', { location: { search: '?content_type=announcement' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 202,
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 90, state: 'submitted', communication_content_id: 90 },
          meta: {},
        }),
      }),
    );

    await submitGroupGeneralCommunication({
      draftId: null,
      subject: 'Announcement',
      body: 'Body',
      recipient_scope: { scope_type: 'school', beneficiary_kind: 'guardians' },
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Announcement',
        body: 'Body',
        content_type: 'announcement',
      }),
    );
  });

  it('PATCHes existing draft with the current content type before submit and accepts 201', async () => {
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
      content_type: 'message',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome.kind).toBe('accepted');
      expect(result.outcome.httpStatus).toBe(201);
    }
  });
});
