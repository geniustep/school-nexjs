import { describe, expect, it } from 'vitest';
import {
  adminRequestFileClientItemId,
  adminRequestTypeSettingsPayload,
  adminRequestUploadSessionPayload,
  approveReplyPayload,
  createRequestPayload,
  replyPayload,
  requestReplyChangesPayload,
  staffReplyPayload,
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

  it('sends an optional preferred appointment time without identity fields', () => {
    const appointment = {
      target_kind: 'subject_teacher',
      preferred_date: '2026-08-27',
      preferred_period: 'morning',
      preferred_time: '14:30',
      requested_subject_id: 44,
      teacher_id: 99,
      resolved_teacher: { id: 99, name: 'Hidden' },
      resolved_user: { id: 77, name: 'Hidden' },
      user_id: 77,
      school_id: 3,
    } as unknown as NonNullable<Parameters<typeof createRequestPayload>[0]['appointment']>;

    const payload = createRequestPayload({
      type_id: 9,
      student_id: 21,
      subject: 'موعد لمناقشة الرياضيات',
      description: 'أرغب في أخذ موعد لمناقشة تقدم التلميذ.',
      appointment,
    });

    expect(payload).toEqual({
      type_id: 9,
      student_id: 21,
      subject: 'موعد لمناقشة الرياضيات',
      description: 'أرغب في أخذ موعد لمناقشة تقدم التلميذ.',
      appointment: {
        target_kind: 'subject_teacher',
        preferred_date: '2026-08-27',
        preferred_period: 'morning',
        preferred_time: '14:30',
        requested_subject_id: 44,
      },
    });
    for (const forbidden of ['teacher_id', 'assigned_user_id', 'resolved_teacher', 'resolved_user', 'user_id', 'school_id']) {
      expect(payload.appointment).not.toHaveProperty(forbidden);
    }
  });

  it('keeps preferred_time optional for administration appointments', () => {
    const payload = createRequestPayload({
      type_id: 9,
      student_id: 21,
      subject: 'موعد مع الإدارة',
      description: 'أرغب في أخذ موعد مع الإدارة.',
      appointment: {
        target_kind: 'administration',
        preferred_date: '2026-08-28',
        preferred_period: 'any',
      },
    });

    expect(payload).toEqual({
      type_id: 9,
      student_id: 21,
      subject: 'موعد مع الإدارة',
      description: 'أرغب في أخذ موعد مع الإدارة.',
      appointment: {
        target_kind: 'administration',
        preferred_date: '2026-08-28',
        preferred_period: 'any',
      },
    });
    expect(payload.appointment).not.toHaveProperty('preferred_time');
  });

  it('keeps requester replies free of identity and workflow fields', () => {
    const payload = replyPayload({ body: '  معلومات إضافية  ' });
    expect(payload).toEqual({ body: 'معلومات إضافية' });
    for (const forbidden of ['school_id', 'author_user_id', 'author_role', 'state', 'attachment_ids']) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });

  it('uses the same narrow allow-list for staff replies', () => {
    expect(staffReplyPayload({ body: '  جواب الموظف  ', upload_session_id: 'session-1' })).toEqual({
      body: 'جواب الموظف',
      upload_session_id: 'session-1',
    });
  });

  it('builds admin review payloads without identity or assignment fields', () => {
    expect(approveReplyPayload({
      reply_id: 12,
      outcome: 'resolved',
      resolution_summary: '  تمت المعالجة  ',
    })).toEqual({
      reply_id: 12,
      outcome: 'resolved',
      resolution_summary: 'تمت المعالجة',
    });
    expect(requestReplyChangesPayload({ reply_id: 13, reason: '  يرجى التوضيح  ' })).toEqual({
      reply_id: 13,
      reason: 'يرجى التوضيح',
    });
  });

  it('includes service_kind when configuring an appointment request type', () => {
    expect(adminRequestTypeSettingsPayload({
      name: '  موعد مع الإدارة  ',
      requires_student: true,
      service_kind: 'appointment',
    })).toEqual({
      name: 'موعد مع الإدارة',
      requires_student: true,
      service_kind: 'appointment',
    });
  });

  it('binds only staff upload sessions to the assigned administrative request', () => {
    expect(adminRequestUploadSessionPayload()).toEqual({ purpose: 'admin_request' });
    expect(adminRequestUploadSessionPayload(17)).toEqual({
      purpose: 'admin_request',
      admin_request_id: 17,
    });
    expect(adminRequestUploadSessionPayload('17')).toEqual({
      purpose: 'admin_request',
      admin_request_id: '17',
    });
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
