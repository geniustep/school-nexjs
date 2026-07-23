export type { AcademicContextFiltersProps } from './components/academic-context-filters';
export { AcademicContextFilters } from './components/academic-context-filters';
export {
  useAcademicContextOptions,
  type AcademicContextAudience,
  type UseAcademicContextOptionsArgs,
  type UseAcademicContextOptionsResult,
} from './hooks/use-academic-context-options';
export {
  fetchAdminAcademicContextOptions,
  fetchTeacherAcademicContextOptions,
  fetchAcademicYearTerms,
  createAcademicTerm,
  initializeAcademicYearTerms,
  updateAcademicTerm,
} from './api/academic-context-api';
export {
  EMPTY_ACADEMIC_CONTEXT_SELECTION,
  applyAcademicContextFieldChange,
  applyInvalidatedSelections,
  selectionToQuery,
} from './utils/academic-context-reset';
export {
  formatClassContextLabel,
  formatEffectiveSubjectLabel,
  formatLanguageOptionLabel,
  formatLevelContextLabel,
  formatOfferingContextLabel,
  formatReferenceContextLabel,
  formatTermOptionLabel,
} from './utils/academic-context-display';
