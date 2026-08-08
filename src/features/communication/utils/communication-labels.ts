import type { CommunicationContentState } from '@/types/communication';

export function communicationStateMessageKey(state: CommunicationContentState | null | undefined): string {
  switch (state) {
    case 'draft':
      return 'communication.state.draft';
    case 'submitted':
      return 'communication.state.submitted';
    case 'changes_requested':
      return 'communication.state.changesRequested';
    case 'approved':
      return 'communication.state.approvedAwaitingPublish';
    case 'scheduled':
      return 'communication.state.scheduled';
    case 'publishing':
      return 'communication.state.publishing';
    case 'published':
      return 'communication.state.published';
    case 'cancelled':
      return 'communication.state.cancelled';
    case 'archived':
      return 'communication.state.archived';
    default:
      return 'communication.state.unknown';
  }
}

export function communicationContentTypeMessageKey(type: string | null | undefined): string {
  switch (type) {
    case 'message':
      return 'communication.contentType.message';
    case 'announcement':
      return 'communication.contentType.announcement';
    case 'homework':
      return 'communication.contentType.homework';
    case 'resource':
      return 'communication.contentType.resource';
    default:
      return 'communication.contentType.other';
  }
}

/** Translate backend role codes using existing localized product labels. */
export function communicationActorRoleMessageKey(role: string | null | undefined): string | null {
  switch ((role ?? '').trim().toLowerCase()) {
    case 'admin':
      return 'roles.admin';
    case 'teacher':
      return 'roles.teacher';
    case 'parent':
    case 'guardian':
      return 'roles.parent';
    case 'student':
      return 'roles.student';
    case 'system':
      return 'nav.adminSystem';
    default:
      return null;
  }
}

/** Map audit decision codes to existing translated workflow labels. */
export function communicationAuditDecisionMessageKey(
  decision: string | null | undefined,
): string {
  switch ((decision ?? '').trim().toLowerCase()) {
    case 'created':
    case 'draft':
      return 'communication.state.draft';
    case 'submit':
    case 'submitted':
    case 'resubmit':
    case 'resubmitted':
      return 'communication.state.submitted';
    case 'request_changes':
    case 'changes_requested':
      return 'communication.state.changesRequested';
    case 'approve':
    case 'approved':
      return 'states.approved';
    case 'schedule':
    case 'scheduled':
      return 'communication.state.scheduled';
    case 'publish':
    case 'published':
      return 'communication.state.published';
    case 'cancel':
    case 'cancelled':
      return 'communication.state.cancelled';
    case 'archive':
    case 'archived':
      return 'communication.state.archived';
    default:
      return 'communication.state.unknown';
  }
}

export function stripHtmlPreview(html: string | null | undefined, max = 160): string {
  if (!html) return '';
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
