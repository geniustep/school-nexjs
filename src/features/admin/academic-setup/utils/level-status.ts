import type { LevelGroup } from '../types';
import { resolveTracksCount } from './normalize-level';

export type LevelStatusKey =
  | 'active'
  | 'needs_classes'
  | 'needs_subjects'
  | 'needs_review'
  | 'complete';

export function computeLevelStatus(
  group: LevelGroup,
  subjectCount: number,
): LevelStatusKey {
  const classCount = group.classes_count ?? group.classes.length;

  if (classCount === 0) return 'needs_classes';
  if (group.needsReview > 0) return 'needs_review';
  if (subjectCount === 0) return 'needs_subjects';
  if (group.needsReview === 0 && classCount > 0 && subjectCount > 0) return 'complete';
  return 'active';
}

export function levelHasLinkedTracks(group: LevelGroup): boolean {
  const tracksCount = resolveTracksCount(group);
  return tracksCount != null && tracksCount > 0;
}

export const LEVEL_STATUS_TONE: Record<LevelStatusKey, 'green' | 'blue' | 'amber' | 'slate'> = {
  active: 'blue',
  needs_classes: 'amber',
  needs_subjects: 'amber',
  needs_review: 'amber',
  complete: 'green',
};

export function classStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const key = `admin.academicSetup.classStatus.${status}`;
  const msg = t(key);
  if (msg !== key) return msg;
  const globalKey = `states.${status}`;
  const global = t(globalKey);
  return global !== globalKey ? global : status;
}
