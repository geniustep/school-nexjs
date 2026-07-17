import type { Student360TabId } from './student-360-tabs';

/** Primary student-page CTA: visible in header when finance collect is allowed. */
export function student360HeaderShowsRecordPayment(input: {
  showFinance: boolean;
  canCollect: boolean;
}): boolean {
  return input.showFinance && input.canCollect;
}

export function buildStudent360AcademicContextLine(parts: {
  classLabel?: string | null;
  levelLabel?: string | null;
}): string | null {
  const normalize = (value?: string | null) => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed || trimmed === '—' || trimmed === '-') return '';
    return trimmed;
  };

  const classLabel = normalize(parts.classLabel);
  const levelLabel = normalize(parts.levelLabel);

  // Prefer class display (often already includes section + level). Fall back to level only.
  if (classLabel) return classLabel;
  if (levelLabel) return levelLabel;
  return null;
}

export type Student360HeaderOverflowAction = {
  key: 'guardian' | 'enrollment' | 'document' | 'health';
  tab?: Student360TabId;
};

/** Rare general actions for the header overflow menu (same capability gates as before). */
export function buildStudent360HeaderOverflowActions(input: {
  canManage: boolean;
  canManageGuardians: boolean;
  hasActiveGuardian: boolean;
  hasEnrollment: boolean;
  canManageDocuments: boolean;
  missingDocs: number;
  canManageHealth: boolean;
  hasHealth: boolean;
}): Student360HeaderOverflowAction[] {
  if (!input.canManage) return [];

  const actions: Student360HeaderOverflowAction[] = [];

  if (input.canManageGuardians && !input.hasActiveGuardian) {
    actions.push({ key: 'guardian', tab: 'guardians' });
  }
  if (!input.hasEnrollment) {
    actions.push({ key: 'enrollment' });
  }
  if (input.canManageDocuments && input.missingDocs > 0) {
    actions.push({ key: 'document', tab: 'documents' });
  }
  if (!input.hasHealth && input.canManageHealth) {
    actions.push({ key: 'health', tab: 'health' });
  }

  return actions;
}

export function shouldShowStudent360HeaderAttentionCue(input: {
  alertCount: number;
  missingBasicIdentity: boolean;
  profileReadiness: string;
}): boolean {
  if (input.alertCount > 0) return true;
  if (input.missingBasicIdentity) return true;
  return input.profileReadiness !== 'ready' && input.profileReadiness !== 'complete';
}
