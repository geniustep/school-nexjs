import { describe, expect, it } from 'vitest';
import {
  normalizeAnnualDistributionDetail,
  normalizeAnnualDistributions,
  normalizeBatchApplySummary,
  normalizeBatchValidation,
  normalizeDidacticSequenceDetail,
  normalizeDidacticSequences,
  normalizeDistributionLine,
  normalizeSessionTemplate,
  normalizeTimeline,
} from './normalize-didactic-distribution';

const namedRef = (id: number, name: string) => ({ id, name });

describe('normalizeSessionTemplate', () => {
  it('normalizes a template and applies safe defaults', () => {
    const tpl = normalizeSessionTemplate({
      id: 5,
      order: 2,
      name: ' Build number sense ',
      session_type: 'construction',
      expected_session_count: 3,
      objective: 'Understand place value',
    });
    expect(tpl).toMatchObject({
      id: 5,
      order: 2,
      name: 'Build number sense',
      session_type: 'construction',
      expected_session_count: 3,
      active: true,
    });
  });

  it('rejects templates without a name or session type', () => {
    expect(normalizeSessionTemplate({ session_type: 'practice' })).toBeNull();
    expect(normalizeSessionTemplate({ name: 'x' })).toBeNull();
    expect(normalizeSessionTemplate(null)).toBeNull();
  });
});

describe('normalizeDidacticSequences', () => {
  const raw = {
    items: [
      {
        id: 1,
        name: 'Fractions',
        school: namedRef(1, 'Nour'),
        subject: namedRef(4, 'Math'),
        level: namedRef(3, 'Grade 6'),
        state: 'approved',
        expected_session_count: 8,
        session_template_count: 3,
        allowed_actions: { edit: true, submit_for_review: false },
      },
      { id: null, name: 'broken' },
    ],
  };

  it('keeps only valid rows and preserves backend allowed_actions', () => {
    const rows = normalizeDidacticSequences(raw);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Fractions');
    expect(rows[0].allowed_actions?.edit).toBe(true);
    expect(rows[0].allowed_actions?.submit_for_review).toBe(false);
  });
});

describe('normalizeDidacticSequenceDetail', () => {
  it('unwraps, sorts templates by order, and carries plan fields', () => {
    const detail = normalizeDidacticSequenceDetail({
      item: {
        id: 2,
        name: 'Geometry unit',
        school: namedRef(1, 'Nour'),
        subject: namedRef(4, 'Math'),
        level: namedRef(3, 'Grade 6'),
        state: 'draft',
        objectives: 'Recognise shapes',
        session_templates: [
          { order: 2, name: 'Practice', session_type: 'practice' },
          { order: 1, name: 'Intro', session_type: 'construction' },
        ],
      },
    });
    expect(detail).not.toBeNull();
    expect(detail!.objectives).toBe('Recognise shapes');
    expect(detail!.session_templates.map((t) => t.order)).toEqual([1, 2]);
    expect(detail!.session_templates[0].name).toBe('Intro');
  });
});

describe('normalizeDistributionLine', () => {
  it('normalizes a sequence line with nested sequence summary', () => {
    const line = normalizeDistributionLine({
      id: 9,
      order: 1,
      item_type: 'sequence',
      session_count: 4,
      sequence: {
        id: 1,
        name: 'Fractions',
        school: namedRef(1, 'Nour'),
        subject: namedRef(4, 'Math'),
        level: namedRef(3, 'Grade 6'),
        state: 'approved',
      },
    });
    expect(line).toMatchObject({ id: 9, order: 1, item_type: 'sequence', session_count: 4 });
    expect(line!.sequence?.name).toBe('Fractions');
  });

  it('defaults an unknown item type field but keeps the raw type otherwise', () => {
    expect(normalizeDistributionLine({ order: 3 })?.item_type).toBe('other');
    expect(normalizeDistributionLine({ item_type: 'assessment' })?.item_type).toBe('assessment');
  });
});

describe('normalizeAnnualDistributions + detail', () => {
  const summaryRaw = {
    items: [
      {
        id: 10,
        display_name: 'Math 2026/2027',
        state: 'active',
        active: true,
        totals: { line_count: 5, sequence_count: 3, total_sessions: 20 },
        readiness: {
          has_lines: true,
          sequences_resolved: true,
          dates_valid: true,
          ready_for_activation: true,
        },
        allowed_actions: { activate: false, manage_lines: true },
      },
    ],
  };

  it('reads totals, readiness and allowed_actions straight from the backend', () => {
    const rows = normalizeAnnualDistributions(summaryRaw);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.state).toBe('active');
    expect(row.totals).toEqual({ line_count: 5, sequence_count: 3, total_sessions: 20 });
    expect(row.readiness.ready_for_activation).toBe(true);
    expect(row.readiness.has_lines).toBe(true);
    expect(row.allowed_actions?.manage_lines).toBe(true);
    expect(row.allowed_actions?.activate).toBe(false);
  });

  it('does not invent readiness when the backend omits a flag', () => {
    const row = normalizeAnnualDistributions({
      items: [{ id: 1, state: 'draft', readiness: {} }],
    })[0];
    expect(row.readiness.has_lines).toBe(false);
    expect(row.readiness.ready_for_activation).toBe(false);
  });

  it('normalizes detail lines sorted by order', () => {
    const detail = normalizeAnnualDistributionDetail({
      item: {
        id: 10,
        display_name: 'Math 2026/2027',
        state: 'draft',
        readiness: {},
        lines: [
          { order: 2, item_type: 'assessment', name: 'Exam 1' },
          { order: 1, item_type: 'sequence', name: 'Unit 1' },
        ],
      },
    });
    expect(detail!.lines.map((l) => l.order)).toEqual([1, 2]);
    expect(detail!.lines[0].name).toBe('Unit 1');
  });
});

describe('normalizeTimeline', () => {
  it('preserves instructional_item vs calendar_marker kind discrimination', () => {
    const timeline = normalizeTimeline({
      instructional_items: [
        { id: 1, order: 1, item_type: 'sequence', name: 'Unit 1', session_count: 6 },
      ],
      calendar_markers: [
        { id: 2, marker_type: 'holiday', name: 'Break', is_instructional_break: true },
      ],
      combined_timeline: [
        { kind: 'instructional_item', id: 1, order: 1, item_type: 'sequence', name: 'Unit 1' },
        { kind: 'calendar_marker', id: 2, marker_type: 'holiday', name: 'Break' },
      ],
    });
    expect(timeline.instructional_items[0].kind).toBe('instructional_item');
    expect(timeline.calendar_markers[0].kind).toBe('calendar_marker');
    expect(timeline.combined_timeline.map((e) => e.kind)).toEqual([
      'instructional_item',
      'calendar_marker',
    ]);
  });

  it('falls back to concatenating both lists when no combined array is supplied', () => {
    const timeline = normalizeTimeline({
      instructional_items: [{ id: 1, order: 1, item_type: 'sequence', name: 'A' }],
      calendar_markers: [{ id: 2, marker_type: 'exam', name: 'B' }],
    });
    expect(timeline.combined_timeline).toHaveLength(2);
    expect(timeline.combined_timeline[0].kind).toBe('instructional_item');
    expect(timeline.combined_timeline[1].kind).toBe('calendar_marker');
  });
});

describe('batch normalizers', () => {
  it('marks a response invalid when there are row errors even if valid=true', () => {
    const res = normalizeBatchValidation({
      valid: true,
      row_count: 2,
      errors: [{ row: 2, code: 'invalid_date_range', message: 'bad' }],
      normalized_rows: [
        { order: 1, item_type: 'sequence', name: 'A' },
        { order: 2, item_type: 'sequence', name: 'B' },
      ],
    });
    expect(res.valid).toBe(false);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].code).toBe('invalid_date_range');
    expect(res.normalized_rows).toHaveLength(2);
  });

  it('keeps valid=true only when the backend agrees and there are no errors', () => {
    const res = normalizeBatchValidation({ valid: true, row_count: 1, errors: [], normalized_rows: [] });
    expect(res.valid).toBe(true);
  });

  it('summarizes an apply result with created/updated/skipped/errors', () => {
    const summary = normalizeBatchApplySummary({
      created: 3,
      updated: 1,
      skipped: 2,
      errors: [{ row: 4, code: 'duplicate_order', message: 'dup' }],
    });
    expect(summary).toMatchObject({ created: 3, updated: 1, skipped: 2 });
    expect(summary.errors[0].code).toBe('duplicate_order');
  });
});
