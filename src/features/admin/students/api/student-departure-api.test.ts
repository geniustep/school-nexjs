import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@/lib/api/client', () => ({ api: { post: mocks.post } }));

import {
  confirmStudentDeparture,
  previewStudentDeparture,
} from './student-departure-api';

const decision = {
  departure_type: 'transferred' as const,
  last_day: '2026-09-15',
  reason: 'انتقال',
  note: 'ملاحظة',
  destination_school: 'مدرسة جديدة',
  financial_policy: 'KEEP_CURRENT_STATE_STOP_NEXT_PERIOD' as const,
};

describe('student departure API', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ success: true, data: {} });
  });

  it('posts preview to the governed student departure endpoint without mutation headers', async () => {
    await previewStudentDeparture(42, decision);
    expect(mocks.post).toHaveBeenCalledWith('/admin/students/42/departure/preview', decision);
  });

  it('posts confirm with preview fingerprint and a stable idempotency key in body and header', async () => {
    const payload = {
      ...decision,
      preview_fingerprint: 'fingerprint-1',
      idempotency_key: 'b9a8e58d-0c17-4b50-90e8-2fd01d68aaf9',
    };
    await confirmStudentDeparture(42, payload);
    expect(mocks.post).toHaveBeenCalledWith(
      '/admin/students/42/departure/confirm',
      payload,
      undefined,
      { 'Idempotency-Key': payload.idempotency_key },
    );
  });
});
