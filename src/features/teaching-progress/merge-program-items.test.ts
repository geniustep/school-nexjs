import { describe, expect, it } from 'vitest';
import { mergeTeacherProgramItems } from '@/features/teaching-progress/merge-program-items';

describe('mergeTeacherProgramItems', () => {
  it('merges remaining with summary lines by distribution_line_id', () => {
    const rows = mergeTeacherProgramItems({
      remaining: [
        {
          distribution_line_id: 101,
          title: 'A',
          sequence_order: 1,
          postponed: true,
          latest_postponement_reason: 'دعم',
        },
      ],
      summaryLines: [
        {
          id: 900,
          status: 'delayed',
          class: null,
          subject: null,
          offering: null,
          distribution_line: { id: 101, name: 'A' },
          last_delivery_id: 44,
          coverage_percent: 50,
        },
      ],
      suggestionLineId: 101,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].progress_line_id).toBe(900);
    expect(rows[0].last_delivery_id).toBe(44);
    expect(rows[0].is_suggested).toBe(true);
    expect(rows[0].latest_postponement_reason).toBe('دعم');
  });

  it('falls back to summary lines when remaining is empty', () => {
    const rows = mergeTeacherProgramItems({
      remaining: [],
      summaryLines: [
        {
          id: 1,
          status: 'not_started',
          class: null,
          subject: null,
          offering: null,
          distribution_line: { id: 5, name: 'B' },
          title: 'B',
          sequence_order: 2,
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].distribution_line_id).toBe(5);
  });
});
