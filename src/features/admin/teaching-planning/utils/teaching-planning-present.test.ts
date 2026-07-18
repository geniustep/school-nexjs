import { describe, expect, it } from 'vitest';
import {
  filterAssignmentCandidatesForOffering,
  filterTeachingOfferingsClient,
  offeringIsApprovedButNotActivationReady,
  offeringShowsAnnualDistributionRequired,
  resolveTeachingPlanningListEmptyVariant,
  teachingPlanningBlockerLabelKey,
  teachingPlanningComingSoonHasLiveRoute,
  teachingPlanningListHasActiveQuery,
  distributionItemTypeLabelKey,
  moveDown,
  moveUp,
  parseDistributionBatchPaste,
  renumberOrder,
  sessionTypeLabelKey,
  sumExpectedSessionCount,
  TEACHING_PLANNING_COMING_SOON_CARDS,
  TEACHING_PLANNING_HUB_CARDS,
} from './teaching-planning-present';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { TeachingOfferingDetail, TeachingOfferingSummary } from '@/types/teaching-planning';

function baseOffering(
  overrides: Partial<TeachingOfferingDetail> = {},
): TeachingOfferingDetail {
  return {
    id: 7,
    display_name: 'السادس — الرياضيات',
    school: { id: 1, name: 'مدرسة' },
    academic_year: { id: 2, name: '2026/2027' },
    level: { id: 3, name: 'السادس' },
    subject: { id: 4, name: 'الرياضيات' },
    teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
    track: null,
    reference: null,
    state: 'approved',
    active: true,
    effective_from: null,
    effective_to: null,
    assignment_count: 0,
    class_count: 0,
    teacher_count: 0,
    readiness: {
      identity_ready: true,
      reference_ready: true,
      assignments_ready: false,
      assignments_count: 0,
      classes_count: 0,
      teachers_count: 0,
      distribution_ready: false,
      ready_for_approval: true,
      ready_for_activation: false,
      blockers: ['annual_distribution_required'],
    },
    activation_blockers: ['annual_distribution_required'],
    notes: null,
    approved_by_id: null,
    approved_at: null,
    reset_reason: null,
    archived_by_id: null,
    archived_at: null,
    assignments: [],
    ...overrides,
  };
}

describe('teachingPlanningListHasActiveQuery', () => {
  it('detects active filters', () => {
    expect(teachingPlanningListHasActiveQuery({})).toBe(false);
    expect(teachingPlanningListHasActiveQuery({ search: '  math ' })).toBe(true);
    expect(teachingPlanningListHasActiveQuery({ state: 'draft' })).toBe(true);
  });
});

describe('resolveTeachingPlanningListEmptyVariant', () => {
  it('returns noMatch when filters active', () => {
    expect(resolveTeachingPlanningListEmptyVariant({ hasActiveQuery: true })).toBe('noMatch');
    expect(resolveTeachingPlanningListEmptyVariant({ hasActiveQuery: false })).toBe('noData');
  });
});

describe('teachingPlanningBlockerLabelKey', () => {
  it('keeps backend blocker code in the i18n path', () => {
    expect(teachingPlanningBlockerLabelKey('annual_distribution_required')).toBe(
      'admin.teachingPlanning.blockers.annual_distribution_required',
    );
  });
});

describe('filterTeachingOfferingsClient', () => {
  it('filters by display name and subject', () => {
    const rows = [
      {
        id: 1,
        display_name: 'السادس — الرياضيات',
        subject: { id: 1, name: 'الرياضيات' },
        level: { id: 1, name: 'السادس' },
        academic_year: { id: 1, name: '2026/2027' },
      },
      {
        id: 2,
        display_name: 'الخامس — عربية',
        subject: { id: 2, name: 'عربية' },
        level: { id: 2, name: 'الخامس' },
        academic_year: { id: 1, name: '2026/2027' },
      },
    ] as TeachingOfferingSummary[];
    expect(filterTeachingOfferingsClient(rows, 'رياضيات')).toHaveLength(1);
    expect(filterTeachingOfferingsClient(rows, '')).toHaveLength(2);
  });
});

describe('offering readiness helpers', () => {
  it('flags annual_distribution_required and approved-not-activation-ready', () => {
    const offering = baseOffering();
    expect(offeringShowsAnnualDistributionRequired(offering)).toBe(true);
    expect(offeringIsApprovedButNotActivationReady(offering)).toBe(true);
    expect(
      offeringIsApprovedButNotActivationReady(
        baseOffering({
          state: 'draft',
          readiness: { ...offering.readiness, ready_for_activation: false },
        }),
      ),
    ).toBe(false);
  });
});

describe('filterAssignmentCandidatesForOffering', () => {
  const offering = baseOffering({
    assignments: [
      {
        id: 10,
        class: { id: 8, name: '6أ' },
        teacher: { id: 9, name: 'سلمى' },
        subject: { id: 4, name: 'الرياضيات' },
        state: 'active',
        active: true,
        role: 'main',
      },
    ],
  });

  const rows: TeachingAssignment[] = [
    {
      id: 10,
      school: { id: 1, name: 'مدرسة' },
      class: { id: 8, name: '6أ', level_id: 3 },
      subject: { id: 4, name: 'الرياضيات' },
      teacher: { id: 9, name: 'سلمى' },
      weekly_hours: 4,
      role: 'main',
      state: 'active',
      active: true,
      teaching_offering_id: 7,
    },
    {
      id: 11,
      school: { id: 1, name: 'مدرسة' },
      class: { id: 8, name: '6ب', level_id: 3 },
      subject: { id: 4, name: 'الرياضيات' },
      teacher: { id: 12, name: 'ياسين' },
      weekly_hours: 4,
      role: 'main',
      state: 'active',
      active: true,
      teaching_offering_id: null,
    },
    {
      id: 12,
      school: { id: 2, name: 'أخرى' },
      class: { id: 20, name: '6أ', level_id: 3 },
      subject: { id: 4, name: 'الرياضيات' },
      teacher: { id: 12, name: 'ياسين' },
      weekly_hours: 4,
      role: 'main',
      state: 'active',
      active: true,
      teaching_offering_id: null,
    },
    {
      id: 13,
      school: { id: 1, name: 'مدرسة' },
      class: { id: 8, name: '5أ', level_id: 99 },
      subject: { id: 4, name: 'الرياضيات' },
      teacher: { id: 12, name: 'ياسين' },
      weekly_hours: 4,
      role: 'main',
      state: 'active',
      active: true,
      teaching_offering_id: null,
    },
  ];

  it('keeps optional linking filtered by school/level/subject and excludes already linked', () => {
    const candidates = filterAssignmentCandidatesForOffering(rows, offering);
    expect(candidates.map((row) => row.id)).toEqual([11]);
  });

  it('allows clearing offering link by sending null without inventing assignment create', () => {
    const payload = { teaching_offering_id: null as number | null };
    expect(payload).toEqual({ teaching_offering_id: null });
  });
});

describe('hub cards', () => {
  it('exposes offerings, distributions, sequences, references, jathathas, delivery, journal and progress as live links', () => {
    expect(TEACHING_PLANNING_HUB_CARDS.map((c) => c.href)).toEqual([
      '/admin/teaching-planning/offerings',
      '/admin/teaching-planning/distributions',
      '/admin/teaching-planning/sequences',
      '/admin/teaching-planning/references',
      '/admin/teaching-planning/reference-jathathas',
      '/admin/teaching-planning/teacher-jathathas',
      '/admin/teaching-planning/actual-deliveries',
      '/admin/teaching-planning/class-journal',
      '/admin/teaching-planning/progress',
      '/admin/teaching-planning/assessment-support',
    ]);
    // Nothing remains coming-soon now that delivery/journal/progress are implemented.
    expect(teachingPlanningComingSoonHasLiveRoute()).toBe(false);
    expect(TEACHING_PLANNING_COMING_SOON_CARDS).toHaveLength(0);
  });
});

describe('reorder helpers', () => {
  it('renumbers order sequentially from 1', () => {
    const rows = renumberOrder([{ order: 7 }, { order: 3 }, { order: 9 }]);
    expect(rows.map((r) => r.order)).toEqual([1, 2, 3]);
  });

  it('moves a row up and renumbers, and is a no-op at the top', () => {
    const rows = [
      { order: 1, id: 'a' },
      { order: 2, id: 'b' },
      { order: 3, id: 'c' },
    ];
    const moved = moveUp(rows, 2);
    expect(moved.map((r) => r.id)).toEqual(['a', 'c', 'b']);
    expect(moved.map((r) => r.order)).toEqual([1, 2, 3]);
    expect(moveUp(rows, 0)).toBe(rows);
  });

  it('moves a row down and renumbers, and is a no-op at the bottom', () => {
    const rows = [
      { order: 1, id: 'a' },
      { order: 2, id: 'b' },
      { order: 3, id: 'c' },
    ];
    const moved = moveDown(rows, 0);
    expect(moved.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(moveDown(rows, 2)).toBe(rows);
  });
});

describe('sumExpectedSessionCount', () => {
  it('sums active templates only and ignores negatives', () => {
    expect(
      sumExpectedSessionCount([
        { expected_session_count: 3, active: true },
        { expected_session_count: 2, active: false },
        { expected_session_count: -5, active: true },
        { expected_session_count: 4, active: true },
      ]),
    ).toBe(7);
  });
});

describe('parseDistributionBatchPaste', () => {
  it('parses TSV rows, skips a header row, and defaults unknown types', () => {
    const rows = parseDistributionBatchPaste(
      [
        'item_type\tname\tperiod\tstart\tend\tsessions',
        'sequence\tUnit 1\tT1\t2026-09-01\t2026-10-01\t6',
        'quiz\tPop quiz\tT1\t\t\t1',
      ].join('\n'),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      order: 1,
      item_type: 'sequence',
      name: 'Unit 1',
      period_label: 'T1',
      date_start: '2026-09-01',
      date_end: '2026-10-01',
      session_count: 6,
    });
    // Unknown type collapses to 'other'.
    expect(rows[1].item_type).toBe('other');
    expect(rows[1].session_count).toBe(1);
  });

  it('defaults an empty first cell to sequence and returns empty on blank input', () => {
    const rows = parseDistributionBatchPaste('\tOnly a name');
    expect(rows[0].item_type).toBe('sequence');
    expect(parseDistributionBatchPaste('   \n  ')).toEqual([]);
  });
});

describe('label key helpers', () => {
  it('builds namespaced i18n keys for session and item types', () => {
    expect(sessionTypeLabelKey('construction')).toBe(
      'admin.teachingPlanning.sessionTypes.construction',
    );
    expect(distributionItemTypeLabelKey('assessment')).toBe(
      'admin.teachingPlanning.itemTypes.assessment',
    );
  });
});
