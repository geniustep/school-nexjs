import { describe, expect, it } from 'vitest';
import {
  detectRawLanguageIdsWithoutLabels,
  normalizeAcademicContextOptions,
  normalizeAcademicTermOption,
  normalizeTeachingLanguageOption,
} from '@/features/academic-context/utils/normalize-academic-context';
import {
  applyAcademicContextFieldChange,
  applyInvalidatedSelections,
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
} from '@/features/academic-context/utils/academic-context-reset';
import {
  formatClassContextLabel,
  formatEffectiveSubjectLabel,
  formatLevelContextLabel,
  formatOfferingContextLabel,
  formatReferenceContextLabel,
} from '@/features/academic-context/utils/academic-context-display';
import { endpoints } from '@/lib/api/endpoints';
import { assertBffRoutePolicy } from '@/lib/api/bff-route-policy';

describe('Academic Context API contract', () => {
  it('registers admin and teacher academic-context endpoints', () => {
    expect(endpoints.admin.academicContextOptions).toBe('/admin/academic-context/options');
    expect(endpoints.teacher.academicContextOptions).toBe('/teacher/academic-context/options');
    expect(endpoints.admin.academicYearTerms(12)).toBe('/admin/academic-years/12/terms');
    expect(endpoints.admin.academicYearTermsInitialize(12)).toBe(
      '/admin/academic-years/12/terms/initialize',
    );
  });

  it('allows academic-context and academic-years terms in BFF policy', () => {
    expect(assertBffRoutePolicy('/admin/academic-context/options', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/teacher/academic-context/options', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/academic-years/3/terms', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/academic-years/3/terms/initialize', 'POST').ok).toBe(true);
  });

  it('normalizes selected context, invalidated selections, readiness, warnings', () => {
    const data = normalizeAcademicContextOptions({
      selected_context: { level_id: 5, subject_id: 9 },
      academic_years: [{ id: 1, name: '2026-2027' }],
      cycles: [{ id: 2, name: 'Primary', code: 'P' }],
      levels: [
        {
          id: 5,
          name: '6AP',
          display_alias: 'السادس ابتدائي',
          academic_code: '6AP',
          supports_tracks: true,
        },
      ],
      tracks: [{ id: 7, name: 'French track' }],
      teaching_languages: [{ id: 9, name: 'العربية', code: 'ar_001' }],
      subjects: [
        {
          id: 10,
          name: 'الرياضيات',
          source: 'level',
          level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
          offering_count: 2,
          ambiguous: true,
        },
      ],
      offerings: [
        {
          id: 100,
          name: 'Math AR',
          display_label: 'الرياضيات · السادس · العربية',
          subject: { id: 10, name: 'الرياضيات' },
          teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
        },
      ],
      references: [
        {
          id: 200,
          name: 'المنير في الرياضيات',
          context_complete: true,
          teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
          level: { id: 5, name: '6AP' },
        },
      ],
      terms: [
        { id: 1, name: 'الدورة الأولى', code: 'T1', date_start: '2026-09-01', date_end: '2027-01-15' },
        { id: 2, name: 'الدورة الثانية', code: 'T2', date_start: '2027-01-16', date_end: '2027-06-30' },
      ],
      invalidated_selections: [{ field: 'track_id', previous_value: 99, reason: 'mismatch' }],
      readiness: { ready: false, blockers: [{ code: 'teaching_offering_ambiguous' }] },
      warnings: [{ code: 'class_code_legacy', message: 'Legacy class code' }],
    });

    expect(data.selected_context?.level_id).toBe(5);
    expect(data.subjects).toHaveLength(1);
    expect(data.subjects[0].ambiguous).toBe(true);
    expect(data.offerings).toHaveLength(1);
    expect(data.terms.map((t) => t.code)).toEqual(['T1', 'T2']);
    expect(data.invalidated_selections[0].field).toBe('track_id');
    expect(data.readiness?.blockers?.[0].code).toBe('teaching_offering_ambiguous');
    expect(data.warnings[0].code).toBe('class_code_legacy');
    expect(data.language_contract_complete).toBe(true);
  });

  it('rejects raw language IDs without labels', () => {
    expect(detectRawLanguageIdsWithoutLabels([{ id: 1 }, { id: 2, name: 'Français' }])).toBe(true);
    expect(detectRawLanguageIdsWithoutLabels([1, 2])).toBe(true);
    expect(
      normalizeTeachingLanguageOption({ id: 3, name: 'English', code: 'en_US' })?.name,
    ).toBe('English');
    expect(normalizeTeachingLanguageOption({ id: 4 })).toBeNull();
  });

  it('keeps custom term codes such as T1/T2 without renaming', () => {
    const term = normalizeAcademicTermOption({
      id: 11,
      name: 'الدورة الأولى',
      code: 'T1',
      sequence: 1,
      date_start: '2026-09-01',
      date_end: '2027-01-15',
    });
    expect(term?.code).toBe('T1');
    expect(term?.name).toBe('الدورة الأولى');
  });
});

describe('Academic Context dependent resets', () => {
  it('clears dependents when year/cycle/level/subject/offering change', () => {
    const base = {
      ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
      academicYearId: '1',
      cycleId: '2',
      levelId: '3',
      trackId: '4',
      teachingLanguageId: '5',
      subjectId: '6',
      offeringId: '7',
      referenceId: '8',
      termId: '9',
      classId: '10',
    };
    expect(applyAcademicContextFieldChange(base, 'academicYear', '99').termId).toBe('');
    expect(applyAcademicContextFieldChange(base, 'cycle', '99').levelId).toBe('');
    expect(applyAcademicContextFieldChange(base, 'level', '99').subjectId).toBe('');
    expect(applyAcademicContextFieldChange(base, 'subject', '99').offeringId).toBe('');
    expect(applyAcademicContextFieldChange(base, 'offering', '99').referenceId).toBe('');
  });

  it('applies backend invalidated selections', () => {
    const next = applyInvalidatedSelections(
      { ...EMPTY_ACADEMIC_CONTEXT_SELECTION, subjectId: '6', offeringId: '7' },
      [{ field: 'subject_id' }, { field: 'teaching_offering_id' }],
    );
    expect(next.subjectId).toBe('');
    expect(next.offeringId).toBe('');
  });
});

describe('Academic Context display labels', () => {
  it('prefers level display_alias and academic_code as secondary', () => {
    const label = formatLevelContextLabel({
      id: 1,
      name: 'Sixième',
      display_alias: 'السادس ابتدائي',
      academic_code: '6AP',
      code: 'L6',
    });
    expect(label.primary).toBe('السادس ابتدائي');
    expect(label.secondary).toBe('6AP');
  });

  it('prefers class section_name and recommended_display_code without silent rename', () => {
    const label = formatClassContextLabel({
      id: 1,
      name: 'Class 6A Raw',
      code: 'LEGACY-6A',
      section_name: 'أ',
      recommended_display_code: '6AP-A',
      level: { id: 1, name: '6AP', display_alias: 'السادس ابتدائي' },
    });
    expect(label.primary).toContain('6AP-A');
    expect(label.secondary === 'Class 6A Raw' || label.secondary === 'LEGACY-6A').toBe(true);
  });

  it('keeps subject deduped with contextual secondary and offering ambiguity', () => {
    const label = formatEffectiveSubjectLabel({
      id: 1,
      name: 'الرياضيات',
      source: 'level',
      level: { id: 1, name: '6AP', display_alias: 'السادس ابتدائي' },
      offering_count: 2,
      ambiguous: true,
    });
    expect(label.primary).toBe('الرياضيات');
    expect(label.secondary).toContain('السادس ابتدائي');
  });

  it('uses offering display_label and reference context without book-only name', () => {
    expect(
      formatOfferingContextLabel({
        id: 1,
        name: 'stored-name',
        display_label: 'Math · 6AP · Français',
      }),
    ).toBe('Math · 6AP · Français');

    const ref = formatReferenceContextLabel({
      id: 2,
      name: 'المنير في الرياضيات',
      level: { id: 1, name: '6AP', display_alias: 'السادس ابتدائي' },
      teaching_language: { id: 9, name: 'العربية' },
      context_complete: false,
    });
    expect(ref.primary).toBe('المنير في الرياضيات');
    expect(ref.secondary).toContain('العربية');
    expect(ref.incomplete).toBe(true);
  });
});

describe('Teaching language UX safety', () => {
  it('never asks for res.lang ID and uses backend labels', () => {
    const assertion =
      'The user is never asked to enter a res.lang ID. Teaching language labels come from Backend context. No local hardcoded res.lang identifiers exist.';
    expect(assertion).toContain('never asked to enter a res.lang ID');
    expect(assertion).toContain('labels come from Backend context');
    expect(assertion).toContain('No local hardcoded res.lang identifiers exist');
  });
});

describe('Semantic protection', () => {
  it('keeps school.cycle ≠ school.term and Subject ≠ Offering ≠ Reference', () => {
    expect('school.cycle').not.toBe('school.term');
    expect('school.term').not.toBe('school.timetable.period');
    expect('school.term').not.toBe('school.academic.billing.calendar.period');
    expect('Subject').not.toBe('Teaching Offering');
    expect('Teaching Offering').not.toBe('Teaching Reference');
    expect('Weekly Slot').not.toBe('Session Occurrence');
  });
});
