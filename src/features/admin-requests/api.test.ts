import { describe, expect, it } from 'vitest';
import {
  adminRequestFileClientItemId,
  createRequestPayload,
  replyPayload,
  staffActionPayload,
} from './api';

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

  it('limits assignee actions to their narrow payloads', () => {
    expect(staffActionPayload('wait_requester', { reason: '  نحتاج وثيقة  ' })).toEqual({
      reason: 'نحتاج وثيقة',
    });
    expect(staffActionPayload('resolve', { resolution_summary: '  تمت المعالجة  ' })).toEqual({
      resolution_summary: 'تمت المعالجة',
    });
    expect(staffActionPayload('wait_requester', { resolution_summary: 'ignored' })).toBeUndefined();
  });

  it('creates a stable opaque client_item_id for upload retries', () => {
    const file = { name: 'وثيقة مدرسية.pdf', size: 24576, lastModified: 1787517000000 };
    const first = adminRequestFileClientItemId(file);
    const second = adminRequestFileClientItemId(file);
    expect(first).toBe(second);
    expect(first).toMatch(/^arq-[a-z0-9-]+$/);
    expect(first).not.toContain(file.name);
    expect(adminRequestFileClientItemId({ ...file, size: file.size + 1 })).not.toBe(first);
  });
});
