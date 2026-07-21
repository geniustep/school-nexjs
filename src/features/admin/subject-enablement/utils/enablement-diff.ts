import type { SubjectLevelEnablementRow } from '@/types/subject-enablement';

export type EnablementChangeSummary = {
  enableIds: number[];
  disableIds: number[];
  unchangedIds: number[];
  dirty: boolean;
};

/** Diff draft enabled set against server rows (operational subject ids). */
export function diffEnablementSelection(
  rows: SubjectLevelEnablementRow[],
  draftEnabledIds: ReadonlySet<number>,
): EnablementChangeSummary {
  const enableIds: number[] = [];
  const disableIds: number[] = [];
  const unchangedIds: number[] = [];

  for (const row of rows) {
    const id = row.operationalSubjectId;
    const serverOn = row.status === 'enabled';
    const draftOn = draftEnabledIds.has(id);
    if (serverOn === draftOn) {
      unchangedIds.push(id);
    } else if (draftOn) {
      enableIds.push(id);
    } else {
      disableIds.push(id);
    }
  }

  return {
    enableIds,
    disableIds,
    unchangedIds,
    dirty: enableIds.length > 0 || disableIds.length > 0,
  };
}

/** Diff for subject-centric editor: draft enabled level ids vs server. */
export function diffLevelEnablementSelection(
  levelIds: number[],
  serverEnabledLevelIds: ReadonlySet<number>,
  draftEnabledLevelIds: ReadonlySet<number>,
): EnablementChangeSummary {
  const enableIds: number[] = [];
  const disableIds: number[] = [];
  const unchangedIds: number[] = [];

  for (const id of levelIds) {
    const serverOn = serverEnabledLevelIds.has(id);
    const draftOn = draftEnabledLevelIds.has(id);
    if (serverOn === draftOn) {
      unchangedIds.push(id);
    } else if (draftOn) {
      enableIds.push(id);
    } else {
      disableIds.push(id);
    }
  }

  return {
    enableIds,
    disableIds,
    unchangedIds,
    dirty: enableIds.length > 0 || disableIds.length > 0,
  };
}

export function serverEnabledSubjectIds(rows: SubjectLevelEnablementRow[]): Set<number> {
  return new Set(rows.filter((r) => r.status === 'enabled').map((r) => r.operationalSubjectId));
}
