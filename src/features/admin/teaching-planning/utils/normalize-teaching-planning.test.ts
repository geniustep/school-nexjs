import { describe, expect, it } from 'vitest';
import {
  collectTeachingLanguageOptions,
  normalizeTeachingOfferingDetail,
  normalizeTeachingOfferingSummary,
  normalizeTeachingOfferings,
  normalizeTeachingPlanningAllowedActions,
  normalizeTeachingReferenceDetail,
  normalizeTeachingReferences,
  teachingPlanningAllowsAction,
} from './normalize-teaching-planning';

describe('normalizeTeachingPlanningAllowedActions', () => {
  it('keeps boolean map keys exactly as returned by API', () => {
    expect(
      normalizeTeachingPlanningAllowedActions({
        view: true,
        edit: false,
        submit_for_review: true,
        approve: true,
        link_assignments: true,
      }),
    ).toEqual({
      view: true,
      edit: false,
      submit_for_review: true,
      approve: true,
      link_assignments: true,
    });
  });

  it('rejects array allowed_actions (no silent aliasing)', () => {
    expect(normalizeTeachingPlanningAllowedActions(['approve', 'edit'])).toBeUndefined();
  });

  it('ignores non-boolean values', () => {
    expect(
      normalizeTeachingPlanningAllowedActions({
        approve: true,
        edit: '1',
        archive: 1,
      }),
    ).toEqual({ approve: true });
  });
});

describe('teachingPlanningAllowsAction', () => {
  it('never infers grants from missing allowed_actions', () => {
    expect(teachingPlanningAllowsAction(null, 'approve')).toBe(false);
    expect(teachingPlanningAllowsAction({}, 'approve')).toBe(false);
    expect(teachingPlanningAllowsAction({ allowed_actions: undefined }, 'edit')).toBe(false);
  });

  it('uses exact keys submit_for_review / link_assignments (no hyphen aliases)', () => {
    const actions = {
      submit_for_review: true,
      'submit-for-review': true,
      link_assignments: true,
    };
    expect(teachingPlanningAllowsAction(actions, 'submit_for_review')).toBe(true);
    expect(teachingPlanningAllowsAction(actions, 'submit-for-review')).toBe(true);
    expect(teachingPlanningAllowsAction({ allowed_actions: actions }, 'link_assignments')).toBe(
      true,
    );
    expect(teachingPlanningAllowsAction(actions, 'submitReview')).toBe(false);
  });

  it('requires explicit true', () => {
    expect(teachingPlanningAllowsAction({ approve: false }, 'approve')).toBe(false);
  });
});

describe('normalizeTeachingReferences', () => {
  it('maps live list row for teaching reference', () => {
    const rows = normalizeTeachingReferences([
      {
        id: 12,
        name: 'مرجع الرياضيات — السادس ابتدائي',
        school: { id: 1, name: 'مدرسة النور' },
        subject: { id: 4, name: 'الرياضيات', code: 'MATH' },
        level: { id: 3, name: 'السادس ابتدائي' },
        teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
        track: null,
        publisher: 'دار المعرفة',
        edition: 'الطبعة الأولى',
        version_label: '2026',
        reference_code: 'MATH-P6',
        isbn: null,
        state: 'approved',
        active: true,
        supersedes_id: null,
        offering_count: 2,
        allowed_actions: { view: true, edit: false, approve: false, archive: true },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(12);
    expect(rows[0].state).toBe('approved');
    expect(rows[0].teaching_language?.code).toBe('ar_001');
    expect(teachingPlanningAllowsAction(rows[0], 'archive')).toBe(true);
    expect(teachingPlanningAllowsAction(rows[0], 'edit')).toBe(false);
  });
});

describe('normalizeTeachingReferenceDetail', () => {
  it('unwraps { item } mutation envelope', () => {
    const detail = normalizeTeachingReferenceDetail({
      item: {
        id: 5,
        name: 'دليل الأستاذ',
        school: { id: 1, name: 'مدرسة' },
        subject: { id: 2, name: 'عربية' },
        level: { id: 3, name: 'الأول' },
        teaching_language: { id: 1, code: 'ar_001', name: 'Arabic' },
        state: 'draft',
        active: true,
        offering_count: 0,
        notes: 'ملاحظة',
        student_book_attachment_ids: [10],
        teacher_guide_attachment_ids: [],
        supplementary_attachment_ids: [],
        allowed_actions: { edit: true, submit_for_review: true },
      },
    });
    expect(detail?.id).toBe(5);
    expect(detail?.notes).toBe('ملاحظة');
    expect(detail?.student_book_attachment_ids).toEqual([10]);
    expect(teachingPlanningAllowsAction(detail, 'submit_for_review')).toBe(true);
  });
});

describe('normalizeTeachingOfferings', () => {
  it('maps offering with readiness and annual_distribution_required blocker', () => {
    const rows = normalizeTeachingOfferings([
      {
        id: 7,
        display_name: 'السادس ابتدائي — الرياضيات — Arabic — 2026/2027',
        school: { id: 1, name: 'مدرسة النور' },
        academic_year: { id: 2, name: '2026/2027' },
        level: { id: 3, name: 'السادس ابتدائي' },
        subject: { id: 4, name: 'الرياضيات', code: 'MATH' },
        teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
        track: null,
        reference: {
          id: 12,
          name: 'مرجع الرياضيات',
          school: { id: 1, name: 'مدرسة النور' },
          subject: { id: 4, name: 'الرياضيات' },
          level: { id: 3, name: 'السادس ابتدائي' },
          teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
          state: 'approved',
          active: true,
          offering_count: 1,
        },
        state: 'draft',
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
        allowed_actions: {
          view: true,
          edit: true,
          approve: true,
          link_assignments: true,
        },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].readiness.distribution_ready).toBe(false);
    expect(rows[0].activation_blockers).toContain('annual_distribution_required');
    expect(rows[0].readiness.ready_for_activation).toBe(false);
    expect(teachingPlanningAllowsAction(rows[0], 'link_assignments')).toBe(true);
  });
});

describe('normalizeTeachingOfferingDetail', () => {
  it('includes assignment summaries from detail payload', () => {
    const detail = normalizeTeachingOfferingDetail({
      item: {
        id: 7,
        display_name: 'مسار',
        school: { id: 1, name: 'مدرسة' },
        academic_year: { id: 2, name: '2026/2027' },
        level: { id: 3, name: 'مستوى' },
        subject: { id: 4, name: 'مادة' },
        teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
        state: 'approved',
        active: true,
        assignment_count: 1,
        class_count: 1,
        teacher_count: 1,
        readiness: {
          identity_ready: true,
          reference_ready: true,
          assignments_ready: true,
          assignments_count: 1,
          classes_count: 1,
          teachers_count: 1,
          distribution_ready: false,
          ready_for_approval: true,
          ready_for_activation: false,
          blockers: ['annual_distribution_required'],
        },
        activation_blockers: ['annual_distribution_required'],
        assignments: [
          {
            id: 55,
            class: { id: 8, name: '6أ' },
            teacher: { id: 9, name: 'سلمى' },
            subject: { id: 4, name: 'مادة' },
            state: 'active',
            active: true,
            role: 'main',
          },
        ],
        allowed_actions: { view: true, link_assignments: true },
      },
    });
    expect(detail?.assignments).toHaveLength(1);
    expect(detail?.assignments[0].class?.name).toBe('6أ');
  });
});

describe('collectTeachingLanguageOptions', () => {
  it('dedupes languages from mixed sources', () => {
    const offering = normalizeTeachingOfferingSummary({
      id: 1,
      display_name: 'A',
      school: { id: 1, name: 'S' },
      academic_year: { id: 1, name: 'Y' },
      level: { id: 1, name: 'L' },
      subject: { id: 1, name: 'Sub' },
      teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
      state: 'draft',
      active: true,
      readiness: {
        identity_ready: true,
        reference_ready: false,
        assignments_ready: false,
        assignments_count: 0,
        classes_count: 0,
        teachers_count: 0,
        distribution_ready: false,
        ready_for_approval: false,
        ready_for_activation: false,
        blockers: ['annual_distribution_required'],
      },
      activation_blockers: ['annual_distribution_required'],
    });
    const refs = normalizeTeachingReferences([
      {
        id: 2,
        name: 'R',
        school: { id: 1, name: 'S' },
        subject: { id: 1, name: 'Sub' },
        level: { id: 1, name: 'L' },
        teaching_language: { id: 9, code: 'ar_001', name: 'Arabic' },
        state: 'approved',
        active: true,
        offering_count: 0,
      },
      {
        id: 3,
        name: 'R2',
        school: { id: 1, name: 'S' },
        subject: { id: 1, name: 'Sub' },
        level: { id: 1, name: 'L' },
        teaching_language: { id: 10, code: 'fr_FR', name: 'French' },
        state: 'draft',
        active: true,
        offering_count: 0,
      },
    ]);
    const langs = collectTeachingLanguageOptions([offering, ...refs]);
    expect(langs).toHaveLength(2);
    expect(langs.map((l) => l.code).sort()).toEqual(['ar_001', 'fr_FR']);
  });
});
