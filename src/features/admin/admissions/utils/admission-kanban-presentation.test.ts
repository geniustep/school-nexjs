import { describe, expect, it } from 'vitest';
import type { AdmissionListItem } from '@/types/admission';
import type { AdmissionsKanbanColumn } from '../hooks/use-admissions-kanban-board';
import {
  ADMISSION_KANBAN_PRESENTATION_COLUMNS,
  admissionKanbanFetchStages,
  groupKanbanColumnsForPresentation,
  presentationColumnDropStage,
} from './admission-kanban-presentation';

function col(
  state: string,
  items: AdmissionListItem[],
  total = items.length,
): AdmissionsKanbanColumn {
  return {
    state,
    items,
    total,
    page: 1,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
  };
}

function item(id: number, application_status: string): AdmissionListItem {
  return {
    id,
    student_name: `S${id}`,
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
    offer_required: null,
    registration_status: null,
  } as AdmissionListItem;
}

describe('application_status kanban presentation', () => {
  it('exposes three follow_up application_status columns', () => {
    expect(ADMISSION_KANBAN_PRESENTATION_COLUMNS).toHaveLength(3);
    expect(ADMISSION_KANBAN_PRESENTATION_COLUMNS.map((c) => c.id)).toEqual([
      'new',
      'follow_up',
      'in_assessment',
    ]);
  });

  it('fetches application_status columns without processing_stage merge', () => {
    expect(admissionKanbanFetchStages()).toEqual(['new', 'follow_up', 'in_assessment']);
    expect(admissionKanbanFetchStages('awaiting_decision')).toEqual([
      'decision_pending',
      'waitlisted',
    ]);

    const grouped = groupKanbanColumnsForPresentation([
      col('new', [item(1, 'new')], 1),
      col('follow_up', [item(2, 'follow_up')], 1),
      col('in_assessment', [item(3, 'in_assessment')], 2),
    ]);

    expect(grouped).toHaveLength(3);
    expect(grouped.map((c) => c.id)).toEqual(['new', 'follow_up', 'in_assessment']);
    expect(grouped.find((c) => c.id === 'in_assessment')?.total).toBe(2);
  });

  it('disables drop targets for modern application_status boards', () => {
    expect(presentationColumnDropStage('follow_up')).toBe('follow_up');
    expect(presentationColumnDropStage('in_assessment')).toBe('in_assessment');
    expect(presentationColumnDropStage('decision_pending')).toBe('decision_pending');
    expect(presentationColumnDropStage('registered')).toBeNull();
  });
});
