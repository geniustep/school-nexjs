import { describe, expect, it } from 'vitest';
import {
  filterKanbanItemsByApplicationStatus,
  partitionKanbanItemsByApplicationStatus,
} from './admission-kanban-status-partition';
import { didFamilyApprovalFailToAdvanceStatus } from './admission-family-approval-status';
import type { AdmissionListItem } from '@/types/admission';

function item(id: number, application_status: string): AdmissionListItem {
  return {
    id,
    student_name: `طالب ${id}`,
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    application_status,
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
  } as AdmissionListItem;
}

describe('admission-kanban-status-partition', () => {
  it('filters a mixed board into the matching column only', () => {
    const mixed = [
      item(1, 'new'),
      item(2, 'follow_up'),
      item(3, 'new'),
      item(4, 'accepted'),
    ];
    expect(filterKanbanItemsByApplicationStatus(mixed, 'new').map((r) => r.id)).toEqual([
      1, 3,
    ]);
    expect(filterKanbanItemsByApplicationStatus(mixed, 'follow_up').map((r) => r.id)).toEqual([
      2,
    ]);
  });

  it('partitions without duplicating across new / follow_up / in_assessment', () => {
    const mixed = [
      item(1, 'new'),
      item(2, 'follow_up'),
      item(3, 'in_assessment'),
      item(4, 'new'),
      item(5, 'accepted'),
    ];
    const parts = partitionKanbanItemsByApplicationStatus(mixed, [
      'new',
      'follow_up',
      'in_assessment',
    ]);
    expect(parts.new.map((r) => r.id)).toEqual([1, 4]);
    expect(parts.follow_up.map((r) => r.id)).toEqual([2]);
    expect(parts.in_assessment.map((r) => r.id)).toEqual([3]);
    const allIds = [...parts.new, ...parts.follow_up, ...parts.in_assessment].map((r) => r.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe('didFamilyApprovalFailToAdvanceStatus', () => {
  it('flags accepted after family approval as Backend gap', () => {
    expect(
      didFamilyApprovalFailToAdvanceStatus('record_family_approval', {
        application_status: 'accepted',
      }),
    ).toBe(true);
  });

  it('passes when Backend advanced to ready_for_registration', () => {
    expect(
      didFamilyApprovalFailToAdvanceStatus('record_family_approval', {
        application_status: 'ready_for_registration',
      }),
    ).toBe(false);
  });
});
