import { describe, expect, it } from 'vitest';
import type { GradebookResults, GradebookStudentResult } from '@/types/gradebook';
import {
  countGradebookResultStatuses,
  formatResultNumeric,
  formatResultScorePair,
  gradebookResultStatusLabelKey,
  isFinalAggregateStatus,
  normalizeGradebookResultsPayload,
  resolveStudentDisplayName,
} from './gradebook-results-present';

function student(partial: Partial<GradebookStudentResult> & { aggregate: GradebookStudentResult['aggregate'] }): GradebookStudentResult {
  return {
    student_line_id: partial.student_line_id ?? 1,
    student_id: partial.student_id ?? 10,
    cells: partial.cells ?? [],
    slots: partial.slots ?? [],
    aggregate: partial.aggregate,
  };
}

describe('gradebook results presenters', () => {
  it('maps Results payload fields without inventing summary averages', () => {
    const raw: GradebookResults = {
      gradebook_id: 223,
      state: 'open',
      mode: 'simple',
      scheme_id: 129,
      scheme_version: 1,
      students: [
        student({
          student_line_id: 240,
          student_id: 1705,
          aggregate: {
            status: 'not_computable',
            score: null,
            max_score: null,
            normalized_score: null,
            completed_cells: 2,
            expected_cells: 2,
            included_cells: 1,
            missing_cells: 0,
            blocking_cells: 1,
            reason: 'participation_state_blocks_aggregation',
          },
        }),
        student({
          student_line_id: 241,
          student_id: 1706,
          aggregate: {
            status: 'available',
            score: null,
            max_score: null,
            normalized_score: null,
            completed_cells: 0,
            expected_cells: 2,
            included_cells: 0,
            missing_cells: 2,
            blocking_cells: 0,
          },
        }),
        student({
          student_line_id: 242,
          student_id: 1707,
          aggregate: {
            status: 'partial',
            score: 5,
            max_score: 10,
            normalized_score: 0.5,
            completed_cells: 1,
            expected_cells: 2,
            included_cells: 1,
            missing_cells: 1,
            blocking_cells: 0,
          },
        }),
        student({
          student_line_id: 243,
          student_id: 1708,
          aggregate: {
            status: 'complete',
            score: 0,
            max_score: 10,
            normalized_score: 0,
            completed_cells: 2,
            expected_cells: 2,
            included_cells: 2,
            missing_cells: 0,
            blocking_cells: 0,
          },
        }),
      ],
    };

    const normalized = normalizeGradebookResultsPayload(raw);
    expect(normalized.students).toHaveLength(4);
    expect(normalized.students[0]?.aggregate.completed_cells).toBe(2);
    expect(normalized.students[0]?.aggregate.missing_cells).toBe(0);
    expect(normalized.students[1]?.aggregate.missing_cells).toBe(2);

    const counts = countGradebookResultStatuses(normalized.students);
    expect(counts).toEqual({
      studentsTotal: 4,
      available: 1,
      complete: 1,
      partial: 1,
      notComputable: 1,
      other: 0,
    });
  });

  it('displays score=0 as a real zero and keeps missing distinct', () => {
    expect(formatResultNumeric(0)).toEqual({ kind: 'value', text: '0', value: 0 });
    expect(formatResultNumeric(null)).toEqual({ kind: 'missing' });
    expect(formatResultNumeric(undefined)).toEqual({ kind: 'missing' });

    const zeroPair = formatResultScorePair(0, 10);
    expect(zeroPair.score.kind).toBe('value');
    expect(zeroPair.text).toBe('0 / 10');

    const missingPair = formatResultScorePair(null, 10);
    expect(missingPair.score.kind).toBe('missing');
    expect(missingPair.text).toBe('—');
  });

  it('does not treat partial as a final aggregate status', () => {
    expect(isFinalAggregateStatus('partial')).toBe(false);
    expect(isFinalAggregateStatus('available')).toBe(false);
    expect(isFinalAggregateStatus('not_computable')).toBe(false);
    expect(isFinalAggregateStatus('complete')).toBe(true);
    expect(gradebookResultStatusLabelKey('partial')).toBe('admin.gradebooks.results.status.partial');
    expect(gradebookResultStatusLabelKey('not_computable')).toBe(
      'admin.gradebooks.results.status.not_computable',
    );
  });

  it('resolves student display name from roster by student_line_id', () => {
    const name = resolveStudentDisplayName(
      student({
        student_line_id: 240,
        student_id: 1705,
        aggregate: {
          status: 'available',
          score: null,
          max_score: null,
          normalized_score: null,
          completed_cells: 0,
          expected_cells: 2,
          included_cells: 0,
          missing_cells: 2,
          blocking_cells: 0,
        },
      }),
      [
        {
          gradebook_student_id: 240,
          student_id: 1705,
          display_name: 'محمد أمين',
          roster_sequence: 1,
        },
      ],
    );
    expect(name).toBe('محمد أمين');
  });
});
