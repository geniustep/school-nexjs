import type {
  EnableSubjectResult,
  EnableSubjectsResponse,
  EnableSubjectsSummary,
  ReferenceSubjectOption,
} from '@/types/academic-subjects';

export type SubjectFilterMode = 'all' | 'available' | 'enabled' | 'required' | 'optional';

export type SubjectSourceFilter = 'all' | 'level' | 'track';

export function sortReferenceSubjects(
  subjects: ReferenceSubjectOption[],
): ReferenceSubjectOption[] {
  return [...subjects].sort(
    (a, b) => a.sequence - b.sequence || a.code.localeCompare(b.code),
  );
}

/** Deduplicate by reference subject id — API may return level + track copies. */
export function dedupeReferenceSubjects(
  subjects: ReferenceSubjectOption[],
): ReferenceSubjectOption[] {
  const map = new Map<number, ReferenceSubjectOption>();
  for (const subject of sortReferenceSubjects(subjects)) {
    if (!map.has(subject.id)) {
      map.set(subject.id, subject);
    }
  }
  return [...map.values()];
}

export function filterReferenceSubjects(
  subjects: ReferenceSubjectOption[],
  {
    search = '',
    mode = 'all',
    source = 'all',
  }: {
    search?: string;
    mode?: SubjectFilterMode;
    source?: SubjectSourceFilter;
  },
): ReferenceSubjectOption[] {
  const q = search.trim().toLowerCase();
  return subjects.filter((subject) => {
    if (mode === 'available' && subject.enabled) return false;
    if (mode === 'enabled' && !subject.enabled) return false;
    if (mode === 'required' && !subject.required) return false;
    if (mode === 'optional' && !subject.optional) return false;
    if (source !== 'all' && subject.source !== source) return false;
    if (!q) return true;
    const haystack = [subject.name, subject.display_name, subject.code].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export function isReferenceSubjectSelectable(subject: ReferenceSubjectOption): boolean {
  return !subject.enabled && subject.can_enable && subject.active;
}

export function buildEnableSubjectsPayload(
  selectedIds: Iterable<number>,
  subjects: ReferenceSubjectOption[],
): number[] {
  const enabledIds = new Set(subjects.filter((s) => s.enabled).map((s) => s.id));
  return [...selectedIds].filter((id) => {
    const subject = subjects.find((s) => s.id === id);
    return subject ? isReferenceSubjectSelectable(subject) && !enabledIds.has(id) : false;
  });
}

export function buildEnableSubjectsSummary(
  results: EnableSubjectResult[],
  requested: number,
): EnableSubjectsSummary {
  let enabled = 0;
  let already_enabled = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'enabled') enabled += 1;
    else if (r.status === 'already_enabled') already_enabled += 1;
    else failed += 1;
  }
  return { requested, enabled, already_enabled, failed };
}

export type EnableSubjectsOutcome = {
  fullSuccess: boolean;
  partialSuccess: boolean;
  enabledCount: number;
  alreadyEnabledCount: number;
  failedCount: number;
  failedIds: number[];
  newSchoolSubjectIds: number[];
  errorsByRefId: Map<number, string>;
};

export function aggregateEnableSubjectResults(
  results: EnableSubjectResult[],
): EnableSubjectsOutcome {
  let enabledCount = 0;
  let alreadyEnabledCount = 0;
  let failedCount = 0;
  const failedIds: number[] = [];
  const newSchoolSubjectIds: number[] = [];
  const errorsByRefId = new Map<number, string>();

  for (const r of results) {
    if (r.status === 'enabled') {
      enabledCount += 1;
      if (r.school_subject?.id) newSchoolSubjectIds.push(r.school_subject.id);
    } else if (r.status === 'already_enabled') {
      alreadyEnabledCount += 1;
    } else {
      failedCount += 1;
      failedIds.push(r.reference_subject_id);
      if (r.error?.message || r.error?.code) {
        errorsByRefId.set(
          r.reference_subject_id,
          r.error.message || r.error.code,
        );
      }
    }
  }

  const fullSuccess =
    failedCount === 0 && (enabledCount > 0 || alreadyEnabledCount > 0);
  const partialSuccess = enabledCount > 0 && failedCount > 0;

  return {
    fullSuccess,
    partialSuccess,
    enabledCount,
    alreadyEnabledCount,
    failedCount,
    failedIds,
    newSchoolSubjectIds,
    errorsByRefId,
  };
}

export function selectableRequiredIds(
  subjects: ReferenceSubjectOption[],
): number[] {
  return subjects
    .filter((s) => s.required && isReferenceSubjectSelectable(s))
    .map((s) => s.id);
}

export function selectableAvailableIds(
  subjects: ReferenceSubjectOption[],
): number[] {
  return subjects.filter(isReferenceSubjectSelectable).map((s) => s.id);
}

export function parseEnableSubjectsResponse(
  data: EnableSubjectsResponse | null | undefined,
): { results: EnableSubjectResult[]; summary: EnableSubjectsSummary } {
  const results = data?.results ?? [];
  const summary =
    data?.summary ??
    buildEnableSubjectsSummary(results, results.length);
  return { results, summary };
}

export function referenceSubjectSubtitle(subject: ReferenceSubjectOption): string {
  return subject.code;
}
