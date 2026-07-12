import { describe, expect, it } from 'vitest';
import {
  applyParticipationToDraft,
  applyScoreToDraft,
  buildLinesPatchPayload,
  countDirtyDrafts,
  defaultDraftFromLine,
  phraseForScore,
} from './diagnostic-draft';
import {
  normalizeDiagnosticAllowedActions,
  normalizeDiagnosticCompletion,
  normalizeDiagnosticDetail,
} from './diagnostic-normalize';

describe('diagnostic-draft', () => {
  it('maps score to scored and clears score for absence states', () => {
    const base = defaultDraftFromLine({
      score: null,
      participation_state: 'not_entered',
      teacher_note: null,
    });
    const scored = applyScoreToDraft(base, 9);
    expect(scored).toEqual({
      score: 9,
      participation_state: 'scored',
      teacher_note: '',
    });
    const absent = applyParticipationToDraft(scored, 'absent_justified');
    expect(absent.score).toBeNull();
    expect(absent.participation_state).toBe('absent_justified');
  });

  it('builds only dirty line patches without sending phrase', () => {
    const baselines = new Map([
      [1, { score: 5, participation_state: 'scored', teacher_note: '' }],
      [2, { score: null, participation_state: 'not_entered', teacher_note: '' }],
    ]);
    const drafts = new Map([
      [1, { score: 8, participation_state: 'scored', teacher_note: 'ملاحظة' }],
      [2, { score: null, participation_state: 'not_entered', teacher_note: '' }],
    ]);
    expect(countDirtyDrafts(baselines, drafts)).toBe(1);
    expect(buildLinesPatchPayload(baselines, drafts)).toEqual([
      { id: 1, score: 8, participation_state: 'scored', teacher_note: 'ملاحظة' },
    ]);
  });

  it('resolves phrase from score_scale for local preview only', () => {
    expect(
      phraseForScore(8, [
        { score: 7, phrase: 'جيد' },
        { score: 8, phrase: 'جيد جدًا' },
      ]),
    ).toBe('جيد جدًا');
  });
});

describe('diagnostic-normalize', () => {
  it('normalizes array allowed_actions and fills score distribution keys', () => {
    expect(normalizeDiagnosticAllowedActions(['edit_lines', 'confirm'])).toEqual({
      edit_lines: true,
      confirm: true,
    });
    const completion = normalizeDiagnosticCompletion({
      students_total: 3,
      scored_count: 1,
      average_score: 8,
      score_distribution: { '8': 1 },
    });
    expect(completion.score_distribution['1']).toBe(0);
    expect(completion.score_distribution['8']).toBe(1);
  });

  it('normalizes detail lines and never invents phrase writes', () => {
    const detail = normalizeDiagnosticDetail({
      id: 1,
      state: 'draft',
      allowed_actions: { edit_lines: true },
      completion: {},
      score_scale: [{ score: 6, phrase: 'مقبول' }],
      lines: [
        {
          id: 10,
          roster_sequence: 1,
          student: { id: 5, name: 'Sara', code: 'S1' },
          participation_state: 'not_entered',
          score: false,
          phrase: false,
          teacher_note: false,
        },
      ],
    });
    expect(detail.lines[0]?.score).toBeNull();
    expect(detail.lines[0]?.phrase).toBeNull();
    expect(detail.score_scale[0]?.phrase).toBe('مقبول');
  });
});
