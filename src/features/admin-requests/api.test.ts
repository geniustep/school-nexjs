import { describe, expect, it } from 'vitest';
import { createRequestPayload, replyPayload } from './api';

describe('admin request client payloads', () => {
  it('uses the Odoo create allow-list only', () => {
    expect(createRequestPayload({
      type_id: 7,
      student_id: 21,
      subject: '  طلب إداري  ',
      description: '  تفاصيل الطلب  ',
      upload_session_id: 'd110dcb3-a353-40d5-a896-c3136b02d1d1',
    })).toEqual({
      type_id: 7,
      student_id: 21,
      subject: 'طلب إداري',
      description: 'تفاصيل الطلب',
      upload_session_id: 'd110dcb3-a353-40d5-a896-c3136b02d1d1',
    });
  });

  it('keeps requester replies free of identity and workflow fields', () => {
    const payload = replyPayload({ body: '  معلومات إضافية  ' });
    expect(payload).toEqual({ body: 'معلومات إضافية' });
    for (const forbidden of ['school_id', 'author_user_id', 'author_role', 'state', 'attachment_ids']) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });
});
