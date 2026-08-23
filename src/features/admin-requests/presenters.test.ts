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

  it('hides operational QA markers from seeded request type names', () => {
    expect(adminRequestTypeLabel('QA Complaint 20260823')).toBe('شكاية');
    expect(adminRequestTypeLabel('QA Inquiry 20260823')).toBe('استفسار');
    expect(adminRequestTypeLabel('QA Appointment 20260823')).toBe('طلب موعد');
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

  it('supports generic select option payloads with value and label', () => {
    expect(staffOptionRows({ options: [{ value: 31, label: 'ليلى بنعمر' }] })).toEqual([
      { id: 31, name: 'ليلى بنعمر' },
    ]);
  });

  it('supports nested user objects', () => {
    expect(staffOptionRows({ items: [{ staff_id: 9, user: { id: 55, name: 'يوسف المرابط' } }] })).toEqual([
      { id: 55, name: 'يوسف المرابط' },
    ]);
  });
});
