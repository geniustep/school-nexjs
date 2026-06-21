import type {
  AdmissionAcademicYearOption,
  AdmissionCycleOption,
  AdmissionEvaluatorOption,
  AdmissionLevelOption,
  AdmissionOptionItem,
  AdmissionOptions,
  AdmissionOptionsPayload,
  AdmissionStreamOption,
  AdmissionSubjectOption,
  AdmissionValueLabelOption,
} from '@/types/admission';

function optionList(value: unknown): AdmissionOptionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is AdmissionOptionItem => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionOptionItem).label === 'string'
      );
    })
    .map((item) => ({
      id: item.id,
      value: item.value,
      code: typeof item.code === 'string' ? item.code : undefined,
      label: item.label,
    }));
}

function cycleList(value: unknown): AdmissionCycleOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is AdmissionCycleOption =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionCycleOption).code === 'string' &&
        typeof (item as AdmissionCycleOption).name === 'string',
    )
    .map((item) => ({
      id: typeof item.id === 'number' ? item.id : undefined,
      code: item.code,
      name: item.name,
      sequence: typeof item.sequence === 'number' ? item.sequence : undefined,
    }));
}

function levelList(value: unknown): AdmissionLevelOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is AdmissionLevelOption => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionLevelOption).id === 'number' &&
        typeof (item as AdmissionLevelOption).name === 'string' &&
        typeof (item as AdmissionLevelOption).cycle === 'string'
      );
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      code: typeof item.code === 'string' ? item.code : undefined,
      cycle: item.cycle,
      requires_stream: Boolean(item.requires_stream),
    }));
}

function streamList(value: unknown): AdmissionStreamOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is AdmissionStreamOption =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionStreamOption).id === 'number' &&
        typeof (item as AdmissionStreamOption).name === 'string' &&
        typeof (item as AdmissionStreamOption).level_id === 'number',
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      code: typeof item.code === 'string' ? item.code : undefined,
      level_id: item.level_id,
    }));
}

function evaluatorList(value: unknown): AdmissionEvaluatorOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is AdmissionEvaluatorOption =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionEvaluatorOption).id === 'number' &&
        typeof (item as AdmissionEvaluatorOption).name === 'string',
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      role: typeof item.role === 'string' ? item.role : 'staff',
    }));
}

function academicYearList(value: unknown): AdmissionAcademicYearOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is AdmissionAcademicYearOption =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionAcademicYearOption).id === 'number' &&
        typeof (item as AdmissionAcademicYearOption).name === 'string',
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      code: typeof item.code === 'string' ? item.code : undefined,
      is_current: Boolean(item.is_current),
      state: typeof item.state === 'string' ? item.state : undefined,
    }));
}

function subjectList(value: unknown): AdmissionSubjectOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is AdmissionSubjectOption => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionSubjectOption).id === 'number' &&
        typeof (item as AdmissionSubjectOption).name === 'string'
      );
    })
    .map((item) => {
      const label =
        typeof item.label === 'string' && item.label.trim()
          ? item.label.trim()
          : item.name.trim();
      const levelIds = Array.isArray(item.level_ids)
        ? item.level_ids.filter((id): id is number => typeof id === 'number' && id > 0)
        : undefined;
      return {
        id: item.id,
        name: item.name.trim(),
        label,
        code: typeof item.code === 'string' ? item.code : undefined,
        level_ids: levelIds?.length ? levelIds : undefined,
        cycle: typeof item.cycle === 'string' ? item.cycle : undefined,
      };
    });
}

function valueLabelList(value: unknown): AdmissionValueLabelOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is AdmissionValueLabelOption =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as AdmissionValueLabelOption).value === 'string' &&
        typeof (item as AdmissionValueLabelOption).label === 'string',
    )
    .map((item) => ({ value: item.value, label: item.label }));
}

export function normalizeAdmissionOptions(
  data: AdmissionOptionsPayload | null | undefined,
): AdmissionOptions | null {
  if (!data || typeof data !== 'object') return null;
  return {
    states: optionList(data.states),
    priorities: optionList(data.priorities),
    relationships: optionList(data.relationships),
    sources: optionList(data.sources),
    academic_years: academicYearList(data.academic_years),
    cycles: cycleList(data.cycles),
    levels: levelList(data.levels),
    streams: streamList(data.streams),
    evaluators: evaluatorList(data.evaluators),
    subjects: subjectList(data.subjects),
    assessment_types: valueLabelList(data.assessment_types),
    assessment_results: valueLabelList(data.assessment_results),
    assessment_recommendations: valueLabelList(data.assessment_recommendations),
  };
}

export function admissionOptionId(item: AdmissionOptionItem): number | null {
  const raw = item.id ?? item.value;
  const id = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Prefer «visit» source; fall back to first available. */
export function resolveDefaultAdmissionSourceId(
  sources: AdmissionOptionItem[],
): number | null {
  if (!sources.length) return null;
  const visit =
    sources.find((s) => s.code === 'visit') ??
    sources.find((s) => /visit|زيارة/i.test(s.label)) ??
    sources[0];
  return admissionOptionId(visit);
}

export function filterLevelsByCycle(
  levels: AdmissionLevelOption[],
  cycleCode: string,
): AdmissionLevelOption[] {
  const code = cycleCode.trim();
  if (!code) return [];
  return levels.filter((level) => level.cycle === code);
}

export function findAdmissionLevel(
  levels: AdmissionLevelOption[],
  levelId: number | undefined,
): AdmissionLevelOption | undefined {
  if (levelId == null) return undefined;
  return levels.find((level) => level.id === levelId);
}

export function filterStreamsByLevel(
  streams: AdmissionStreamOption[],
  levelId: number | undefined,
): AdmissionStreamOption[] {
  if (levelId == null) return [];
  return streams.filter((stream) => stream.level_id === levelId);
}

export function resolveAdmissionValueLabel(
  options: AdmissionValueLabelOption[],
  value: string | null | undefined,
): string {
  const normalized = value?.trim();
  if (!normalized) return '';
  return options.find((item) => item.value === normalized)?.label ?? normalized;
}

export function resolveEvaluatorName(
  evaluator: AdmissionEvaluatorOption | { id: number; name: string } | null | undefined,
): string {
  if (!evaluator) return '';
  return evaluator.name?.trim() ?? '';
}

const ASSESSMENT_SUBJECT_REQUIRED_TYPES = new Set(['written', 'oral', 'level_check']);

export function assessmentTypeRequiresSubject(assessmentType: string): boolean {
  return ASSESSMENT_SUBJECT_REQUIRED_TYPES.has(assessmentType.trim().toLowerCase());
}

export function filterSubjectsByLevel(
  subjects: AdmissionSubjectOption[],
  levelId: number | undefined | null,
): AdmissionSubjectOption[] {
  if (!subjects.length) return [];
  if (levelId == null || !Number.isFinite(levelId) || levelId <= 0) return subjects;

  const filtered = subjects.filter((subject) => {
    if (!subject.level_ids?.length) return true;
    return subject.level_ids.includes(levelId);
  });

  return filtered.length > 0 ? filtered : subjects;
}

export function resolveAssessmentSubjectLabel(
  assessment: {
    subject_id?: number | false | null;
    subject_label?: string | null;
    subject?: { id?: number; name?: string } | null;
  },
  subjects: AdmissionSubjectOption[],
  unspecifiedLabel: string,
): string {
  const directLabel = assessment.subject_label?.trim();
  if (directLabel && directLabel !== 'غير محددة' && directLabel.toLowerCase() !== 'unspecified') {
    return directLabel;
  }

  const subjectName = assessment.subject?.name?.trim();
  if (subjectName) return subjectName;

  const subjectId =
    typeof assessment.subject_id === 'number' && assessment.subject_id > 0
      ? assessment.subject_id
      : assessment.subject?.id;
  if (subjectId) {
    const match = subjects.find((subject) => subject.id === subjectId);
    if (match) return match.label || match.name;
  }

  return unspecifiedLabel;
}
