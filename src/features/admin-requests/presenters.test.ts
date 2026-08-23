import { describe, expect, it } from 'vitest';
import {
  adminRequestActionLabel,
  adminRequestRoleLabel,
  adminRequestStateLabel,
  adminRequestTypeLabel,
  staffOptionRows,
} from './presenters';

describe('admin request Arabic presenters', () => {
  it('translates workflow states and actions shown in the portal', () => {
    expect(adminRequestStateLabel('under_review')).toBe('قيد المراجعة');
    expect(adminRequestStateLabel('resolved')).toBe('تمت المعالجة');
    expect(adminRequestActionLabel('wait_requester')).toBe('طلب معلومات إضافية');
    expect(adminRequestActionLabel('refer')).toBe('إحالة إلى موظف');
  });

  it('translates requester roles', () => {
    expect(adminRequestRoleLabel('parent')).toBe('ولي الأمر');
    expect(adminRequestRoleLabel('student')).toBe('التلميذ');
    expect(adminRequestRoleLabel('admin')).toBe('الإدارة');
  });

  it('translates seeded QA request type names without losing their suffix', () => {
    expect(adminRequestTypeLabel('QA Complaint 20260823')).toBe('شكاية — QA 20260823');
    expect(adminRequestTypeLabel('QA Inquiry 20260823')).toBe('استفسار — QA 20260823');
  });
});

describe('admin request staff options', () => {
  it('normalizes a direct option list', () => {
    expect(staffOptionRows([{ id: 7, name: 'أحمد الإدريسي', job_title: 'الحراسة العامة' }])).toEqual([
      { id: 7, name: 'أحمد الإدريسي', detail: 'الحراسة العامة' },
    ]);
  });

  it('prefers the linked user id when the endpoint returns a staff record', () => {
    expect(staffOptionRows({ items: [{ id: 17, user_id: [42, 'سلمى العلوي'], display_name: 'سلمى العلوي' }] })).toEqual([
      { id: 42, name: 'سلمى العلوي' },
    ]);
  });

  it('supports wrapped staff option payloads', () => {
    expect(staffOptionRows({ data: { staff: [{ user_id: 12, full_name: 'محمد أمين' }] } })).toEqual([
      { id: 12, name: 'محمد أمين' },
    ]);
  });
});
