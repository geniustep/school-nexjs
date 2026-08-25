import { describe, expect, it } from 'vitest';
import { adminRequestStateOptions, adminRequestTypeOptions, filterAdminRequests } from './list-filters';
import type { AdminRequest } from './types';

const REQUESTS: AdminRequest[] = [
  {
    id: 1,
    reference: 'REQ-001',
    subject: 'موعد مع الإدارة',
    description: 'طلب موعد لمناقشة التسجيل',
    state: 'submitted',
    type: { id: 10, name: 'المواعيد', service_kind: 'appointment' },
    student: { id: 21, name: 'سارة الموعد' },
    assigned: { id: 5, name: 'مدير المؤسسة' },
  },
  {
    id: 2,
    reference: 'REQ-002',
    subject: 'شهادة مدرسية',
    state: 'closed',
    type: { id: 11, name: 'الشهادات', service_kind: 'general' },
    student: { id: 22, name: 'أمين التلميذ' },
  },
  {
    id: 3,
    reference: 'REQ-003',
    subject: 'استفسار',
    state: 'under_review',
    type: { id: 12, name: 'الاستفسارات', service_kind: 'general' },
  },
];

describe('admin request list filters', () => {
  it('hides closed requests by default', () => {
    expect(filterAdminRequests(REQUESTS, {
      query: '', typeId: '', state: '', showClosed: false,
    }).map((request) => request.id)).toEqual([1, 3]);
  });

  it('shows closed requests when explicitly requested', () => {
    expect(filterAdminRequests(REQUESTS, {
      query: '', typeId: '', state: '', showClosed: true,
    }).map((request) => request.id)).toEqual([1, 2, 3]);
  });

  it('searches across subject, reference, student and assignee', () => {
    for (const query of ['موعد', 'REQ-001', 'سارة', 'مدير']) {
      expect(filterAdminRequests(REQUESTS, {
        query, typeId: '', state: '', showClosed: false,
      }).map((request) => request.id)).toEqual([1]);
    }
  });

  it('combines type and state filters', () => {
    expect(filterAdminRequests(REQUESTS, {
      query: '', typeId: '12', state: 'under_review', showClosed: false,
    }).map((request) => request.id)).toEqual([3]);
  });

  it('builds type and state options without closed by default', () => {
    expect(adminRequestTypeOptions(REQUESTS)).toHaveLength(3);
    expect(adminRequestStateOptions(REQUESTS, false)).not.toContain('closed');
    expect(adminRequestStateOptions(REQUESTS, true)).toContain('closed');
  });
});
