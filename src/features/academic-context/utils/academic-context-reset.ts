import type { AcademicContextSelection } from '@/types/academic-context';

export const EMPTY_ACADEMIC_CONTEXT_SELECTION: AcademicContextSelection = {
  academicYearId: '',
  cycleId: '',
  levelId: '',
  trackId: '',
  teachingLanguageId: '',
  subjectId: '',
  offeringId: '',
  referenceId: '',
  termId: '',
  classId: '',
};

type DependentField = keyof AcademicContextSelection;

const CLEAR_ON_YEAR: DependentField[] = [
  'termId',
  'cycleId',
  'levelId',
  'trackId',
  'teachingLanguageId',
  'subjectId',
  'offeringId',
  'referenceId',
  'classId',
];

const CLEAR_ON_CYCLE: DependentField[] = [
  'levelId',
  'trackId',
  'teachingLanguageId',
  'subjectId',
  'offeringId',
  'referenceId',
  'classId',
];

const CLEAR_ON_LEVEL: DependentField[] = [
  'trackId',
  'teachingLanguageId',
  'subjectId',
  'offeringId',
  'referenceId',
  'classId',
];

const CLEAR_ON_TRACK: DependentField[] = [
  'subjectId',
  'teachingLanguageId',
  'offeringId',
  'referenceId',
];

const CLEAR_ON_LANGUAGE: DependentField[] = ['offeringId', 'referenceId'];

const CLEAR_ON_SUBJECT: DependentField[] = ['offeringId', 'referenceId'];

const CLEAR_ON_OFFERING: DependentField[] = ['referenceId'];

const CLEAR_ON_CLASS: DependentField[] = [
  'subjectId',
  'teachingLanguageId',
  'offeringId',
  'referenceId',
];

function clearFields(
  selection: AcademicContextSelection,
  fields: DependentField[],
): AcademicContextSelection {
  const next = { ...selection };
  for (const field of fields) next[field] = '';
  return next;
}

export type AcademicContextChangeField =
  | 'academicYear'
  | 'cycle'
  | 'level'
  | 'track'
  | 'teachingLanguage'
  | 'subject'
  | 'offering'
  | 'reference'
  | 'term'
  | 'class';

/**
 * Apply a field change with dependent resets (client-side).
 * Backend invalidated_selections may clear additional fields afterwards.
 */
export function applyAcademicContextFieldChange(
  selection: AcademicContextSelection,
  field: AcademicContextChangeField,
  value: string,
): AcademicContextSelection {
  switch (field) {
    case 'academicYear':
      return clearFields({ ...selection, academicYearId: value }, CLEAR_ON_YEAR);
    case 'cycle':
      return clearFields({ ...selection, cycleId: value }, CLEAR_ON_CYCLE);
    case 'level':
      return clearFields({ ...selection, levelId: value }, CLEAR_ON_LEVEL);
    case 'track':
      return clearFields({ ...selection, trackId: value }, CLEAR_ON_TRACK);
    case 'teachingLanguage':
      return clearFields({ ...selection, teachingLanguageId: value }, CLEAR_ON_LANGUAGE);
    case 'subject':
      return clearFields({ ...selection, subjectId: value }, CLEAR_ON_SUBJECT);
    case 'offering':
      return clearFields({ ...selection, offeringId: value }, CLEAR_ON_OFFERING);
    case 'reference':
      return { ...selection, referenceId: value };
    case 'term':
      return { ...selection, termId: value };
    case 'class':
      return clearFields({ ...selection, classId: value }, CLEAR_ON_CLASS);
    default:
      return selection;
  }
}

const INVALIDATION_FIELD_MAP: Record<string, DependentField> = {
  academic_year_id: 'academicYearId',
  academic_year: 'academicYearId',
  term_id: 'termId',
  term: 'termId',
  cycle_id: 'cycleId',
  cycle: 'cycleId',
  level_id: 'levelId',
  level: 'levelId',
  track_id: 'trackId',
  track: 'trackId',
  teaching_language_id: 'teachingLanguageId',
  teaching_language: 'teachingLanguageId',
  subject_id: 'subjectId',
  subject: 'subjectId',
  teaching_offering_id: 'offeringId',
  offering_id: 'offeringId',
  offering: 'offeringId',
  reference_id: 'referenceId',
  reference: 'referenceId',
  class_id: 'classId',
  class: 'classId',
};

export function applyInvalidatedSelections(
  selection: AcademicContextSelection,
  invalidated: Array<{ field: string }>,
): AcademicContextSelection {
  if (!invalidated.length) return selection;
  const next = { ...selection };
  for (const item of invalidated) {
    const key = INVALIDATION_FIELD_MAP[item.field];
    if (key) next[key] = '';
  }
  return next;
}

export function selectionToQuery(selection: AcademicContextSelection): {
  academic_year_id?: number;
  cycle_id?: number;
  level_id?: number;
  track_id?: number;
  teaching_language_id?: number;
  subject_id?: number;
  teaching_offering_id?: number;
  reference_id?: number;
  term_id?: number;
  class_id?: number;
} {
  const num = (v: string) => (v ? Number(v) : undefined);
  return {
    academic_year_id: num(selection.academicYearId),
    cycle_id: num(selection.cycleId),
    level_id: num(selection.levelId),
    track_id: num(selection.trackId),
    teaching_language_id: num(selection.teachingLanguageId),
    subject_id: num(selection.subjectId),
    teaching_offering_id: num(selection.offeringId),
    reference_id: num(selection.referenceId),
    term_id: num(selection.termId),
    class_id: num(selection.classId),
  };
}
