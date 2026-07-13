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

function item(id: number, processing_stage: string): AdmissionListItem {
  return {
    id,
    student_name: `S${id}`,
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    processing_stage,
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    offer_required: null,
    registration_status: null,
  } as AdmissionListItem;
}

describe('four-column kanban presentation', () => {
  it('exposes exactly four visible columns', () => {
    expect(ADMISSION_KANBAN_PRESENTATION_COLUMNS).toHaveLength(4);
    expect(ADMISSION_KANBAN_PRESENTATION_COLUMNS.map((c) => c.id)).toEqual([
      'new',
      'initial_follow_up',
      'assessment',
      'decision',
    ]);
  });

  it('fetches both assessment backend stages and groups them', () => {
    expect(admissionKanbanFetchStages()).toEqual([
      'new',
      'initial_follow_up',
      'assessment_ready',
      'assessment_in_progress',
      'decision_ready',
    ]);

    const grouped = groupKanbanColumnsForPresentation([
      col('new', [item(1, 'new')], 1),
      col('initial_follow_up', [], 0),
      col('assessment_ready', [item(2, 'assessment_ready')], 2),
      col('assessment_in_progress', [item(3, 'assessment_in_progress')], 3),
      col('decision_ready', [item(4, 'decision_ready')], 1),
    ]);

    expect(grouped).toHaveLength(4);
    const assessment = grouped.find((c) => c.id === 'assessment')!;
    expect(assessment.items.map((i) => i.id).sort()).toEqual([2, 3]);
    expect(assessment.total).toBe(5);
    expect(grouped.find((c) => c.id === 'decision')?.total).toBe(1);
  });

  it('maps assessment drop to assessment_ready without coercing in_progress', () => {
    expect(presentationColumnDropStage('assessment')).toBe('assessment_ready');
    expect(presentationColumnDropStage('decision')).toBeNull();
  });
});
