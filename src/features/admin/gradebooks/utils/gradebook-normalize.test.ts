import { describe, expect, it } from 'vitest';
import {
  normalizeBatchEntryUpdateResponse,
  normalizeGradebookDetailPayload,
} from './gradebook-normalize';

describe('gradebook-normalize', () => {
  it('maps live Odoo wire format into UI contract', () => {
    const detail = normalizeGradebookDetailPayload({
      id: 222,
      context: {
        state: 'open',
        subject: { id: 211, name: 'اللغة العربية' },
        class: { id: 2058, name: 'P6A' },
        term: { id: 20, name: 'الفصل الأول' },
      },
      structure: {
        mode: 'composite',
        slots: [{ id: 165, name: 'تقييم 1', sequence: 10 }],
        components: [{ id: 33, name: 'القراءة', code: 'READ' }],
        cells: [{ id: 207, slot_id: 165, component_id: 33, effective_max_score: 10 }],
      },
      roster: [
        {
          gradebook_student_id: 214,
          student_id: 1705,
          display_name: 'منير',
          massar_code: null,
          roster_sequence: 10001,
        },
      ],
      matrix: {
        entries: [
          {
            student_line_id: 214,
            cell_id: 207,
            score: null,
            score_is_set: false,
            participation_state: 'not_entered',
            editable: true,
          },
        ],
      },
      completion: {
        completion_percent: 0,
        unresolved_entries: 1,
        students_total: 1,
        cells_total: 1,
      },
      allowed_actions: { edit_entries: true, submit: true },
    });

    expect(detail.structure.slots[0]).toEqual({
      slot_id: 165,
      label: 'تقييم 1',
      sequence: 10,
    });
    expect(detail.structure.cells[0].cell_id).toBe(207);
    expect(detail.structure.cells[0].component_label).toBe('القراءة');
    expect(detail.matrix).toHaveLength(1);
    expect(detail.matrix[0].student_line_id).toBe(214);
  });

  it('maps entries_changed from batch save response', () => {
    const res = normalizeBatchEntryUpdateResponse({
      updated_count: 1,
      completion: {
        completion_percent: 1,
        unresolved_entries: 0,
        students_total: 1,
        cells_total: 1,
      },
      entries_changed: [
        {
          student_line_id: 156,
          cell_id: 175,
          score: 0,
          score_is_set: true,
          participation_state: 'taken',
        },
      ],
    });
    expect(res.entries?.[0]?.score).toBe(0);
    expect(res.completion.completion_percent).toBe(1);
  });
});
