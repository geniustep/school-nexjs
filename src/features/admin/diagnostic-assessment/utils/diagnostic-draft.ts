import type {
  DiagnosticAllowedActions,
  DiagnosticLinePatch,
  DiagnosticParticipationState,
  DiagnosticScoreScaleItem,
} from '@/types/diagnostic-assessment';

export type DiagnosticWorkspaceRole = 'admin' | 'teacher';

export interface LineDraftValue {
  score: number | null;
  participation_state: DiagnosticParticipationState | string;
  teacher_note: string;
}

export function canEditDiagnosticLines(
  role: DiagnosticWorkspaceRole,
  actions: DiagnosticAllowedActions | null | undefined,
): boolean {
  return Boolean(actions?.edit_lines);
}

export function phraseForScore(
  score: number | null | undefined,
  scale: DiagnosticScoreScaleItem[] | undefined,
): string | null {
  if (score == null) return null;
  const match = scale?.find((item) => item.score === score);
  return match?.phrase ?? null;
}

export function defaultDraftFromLine(line: {
  score: number | null;
  participation_state: string;
  teacher_note: string | null;
}): LineDraftValue {
  return {
    score: line.score,
    participation_state: line.participation_state || 'not_entered',
    teacher_note: line.teacher_note ?? '',
  };
}

export function isDraftDirty(baseline: LineDraftValue, draft: LineDraftValue): boolean {
  return (
    baseline.score !== draft.score ||
    baseline.participation_state !== draft.participation_state ||
    (baseline.teacher_note || '') !== (draft.teacher_note || '')
  );
}

export function countDirtyDrafts(
  baselines: Map<number, LineDraftValue>,
  drafts: Map<number, LineDraftValue>,
): number {
  let count = 0;
  for (const [lineId, draft] of drafts) {
    const baseline = baselines.get(lineId);
    if (!baseline || isDraftDirty(baseline, draft)) count += 1;
  }
  return count;
}

export function buildLinesPatchPayload(
  baselines: Map<number, LineDraftValue>,
  drafts: Map<number, LineDraftValue>,
): DiagnosticLinePatch[] {
  const lines: DiagnosticLinePatch[] = [];
  for (const [lineId, draft] of drafts) {
    const baseline = baselines.get(lineId);
    if (baseline && !isDraftDirty(baseline, draft)) continue;

    const patch: DiagnosticLinePatch = { id: lineId };
    const state = draft.participation_state;

    if (
      state === 'absent' ||
      state === 'absent_justified' ||
      state === 'incomplete' ||
      state === 'not_entered'
    ) {
      patch.participation_state = state;
      patch.score = null;
    } else if (draft.score != null) {
      patch.score = draft.score;
      patch.participation_state = 'scored';
    } else {
      patch.participation_state = 'not_entered';
      patch.score = null;
    }

    patch.teacher_note = draft.teacher_note?.trim() ? draft.teacher_note.trim() : null;
    lines.push(patch);
  }
  return lines;
}

export function applyScoreToDraft(draft: LineDraftValue, score: number | null): LineDraftValue {
  if (score == null) {
    return {
      ...draft,
      score: null,
      participation_state: 'not_entered',
    };
  }
  return {
    ...draft,
    score,
    participation_state: 'scored',
  };
}

export function applyParticipationToDraft(
  draft: LineDraftValue,
  state: DiagnosticParticipationState | string,
): LineDraftValue {
  if (state === 'scored') {
    return {
      ...draft,
      participation_state: draft.score != null ? 'scored' : 'not_entered',
    };
  }
  if (
    state === 'absent' ||
    state === 'absent_justified' ||
    state === 'incomplete' ||
    state === 'not_entered'
  ) {
    return {
      ...draft,
      participation_state: state,
      score: null,
    };
  }
  return { ...draft, participation_state: state };
}

export const DIAGNOSTIC_PARTICIPATION_OPTIONS: DiagnosticParticipationState[] = [
  'not_entered',
  'scored',
  'absent',
  'absent_justified',
  'incomplete',
];
