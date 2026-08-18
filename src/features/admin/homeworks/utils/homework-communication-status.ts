export interface HomeworkCommunicationStatusLike {
  communication_content_id?: number | null;
  communication_state?: string | null;
  is_family_visible?: boolean;
  pending_approval?: boolean;
}

export type HomeworkCommunicationStatusKind =
  | 'family-visible'
  | 'pending-approval'
  | 'not-started'
  | 'communication-state'
  | 'unavailable';

export interface HomeworkCommunicationPresentation {
  kind: HomeworkCommunicationStatusKind;
  tone: 'green' | 'amber' | 'slate';
}

export function hasHomeworkCommunicationContract(
  item: HomeworkCommunicationStatusLike,
): boolean {
  return (
    item.communication_content_id !== undefined ||
    item.communication_state !== undefined ||
    item.is_family_visible !== undefined ||
    item.pending_approval !== undefined
  );
}

export function resolveHomeworkCommunicationStatus(
  item: HomeworkCommunicationStatusLike,
): HomeworkCommunicationPresentation {
  if (!hasHomeworkCommunicationContract(item)) {
    return { kind: 'unavailable', tone: 'slate' };
  }

  if (item.is_family_visible === true) {
    return { kind: 'family-visible', tone: 'green' };
  }

  if (item.pending_approval === true) {
    return { kind: 'pending-approval', tone: 'amber' };
  }

  if (item.communication_content_id === null) {
    return { kind: 'not-started', tone: 'slate' };
  }

  return { kind: 'communication-state', tone: 'slate' };
}
