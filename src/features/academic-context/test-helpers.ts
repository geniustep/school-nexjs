import type {
  AcademicContextOptionsResponse,
  AcademicContextSelection,
} from '@/types/academic-context';
import type { UseAcademicContextOptionsResult } from '@/features/academic-context/hooks/use-academic-context-options';
import { EMPTY_ACADEMIC_CONTEXT_SELECTION } from '@/features/academic-context/utils/academic-context-reset';
import { vi } from 'vitest';

export function baseOptions(
  overrides: Partial<AcademicContextOptionsResponse> = {},
): AcademicContextOptionsResponse {
  return {
    selected_context: null,
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
    teaching_languages: [
      { id: 9, name: 'العربية', code: 'ar_001' },
      { id: 10, name: 'Français', code: 'fr_FR' },
    ],
    subjects: [
      {
        id: 11,
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
        teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
        teaching_reference: { id: 200, name: 'المنير في الرياضيات' },
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
        subject: { id: 11, name: 'الرياضيات' },
      },
      {
        id: 101,
        name: 'Math FR',
        display_label: 'Mathématiques · 6AP · Français',
        teaching_language: { id: 10, name: 'Français', code: 'fr_FR' },
        teaching_reference: { id: 201, name: 'المنير في الرياضيات' },
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
        track: { id: 7, name: 'French track' },
        subject: { id: 11, name: 'الرياضيات' },
      },
    ],
    references: [
      {
        id: 200,
        name: 'المنير في الرياضيات',
        version_label: '2026',
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
        teaching_language: { id: 9, name: 'العربية', code: 'ar_001' },
        academic_year: { id: 1, name: '2026-2027' },
        offering_id: 100,
        context_complete: true,
      },
      {
        id: 201,
        name: 'المنير في الرياضيات',
        version_label: '2026',
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
        track: { id: 7, name: 'French track' },
        teaching_language: { id: 10, name: 'Français', code: 'fr_FR' },
        academic_year: { id: 1, name: '2026-2027' },
        offering_id: 101,
        context_complete: false,
      },
    ],
    terms: [
      {
        id: 31,
        name: 'الدورة الأولى',
        code: 'T1',
        sequence: 1,
        date_start: '2026-09-01',
        date_end: '2027-01-15',
        state: 'active',
        active: true,
        academic_year: { id: 1, name: '2026-2027' },
      },
      {
        id: 32,
        name: 'الدورة الثانية',
        code: 'T2',
        sequence: 2,
        date_start: '2027-01-16',
        date_end: '2027-06-30',
        state: 'active',
        active: true,
        academic_year: { id: 1, name: '2026-2027' },
      },
    ],
    classes: [
      {
        id: 40,
        name: 'Class 6A Raw',
        code: 'LEGACY-6A',
        section_name: 'أ',
        recommended_display_code: '6AP-A',
        code_status: 'legacy',
        level: { id: 5, name: '6AP', display_alias: 'السادس ابتدائي' },
      },
    ],
    invalidated_selections: [],
    warnings: [],
    language_contract_complete: true,
    ...overrides,
  };
}

export function makeController(
  partial: Partial<UseAcademicContextOptionsResult> & {
    selection?: AcademicContextSelection;
    options?: AcademicContextOptionsResponse | null;
  } = {},
): UseAcademicContextOptionsResult {
  return {
    selection: partial.selection ?? {
      ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
      levelId: '5',
      subjectId: '11',
    },
    setField: partial.setField ?? vi.fn(),
    resetSelection: partial.resetSelection ?? vi.fn(),
    options: partial.options === undefined ? baseOptions() : partial.options,
    loading: partial.loading ?? false,
    refetching: partial.refetching ?? false,
    error: partial.error ?? null,
    permissionDenied: partial.permissionDenied ?? false,
    languageContractIncomplete: partial.languageContractIncomplete ?? false,
    refetch: partial.refetch ?? vi.fn(),
  };
}

export const LITERAL_ASSERTIONS = {
  neverResLang:
    'The user is never asked to enter a res.lang ID.',
  labelsFromBackend: 'Teaching language labels come from Backend context.',
  noHardcodedIds: 'No local hardcoded res.lang identifiers exist.',
  noNumericInput: 'No numeric teaching-language input is rendered.',
} as const;
