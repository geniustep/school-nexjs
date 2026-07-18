import type { CommunicationContent } from '@/types/communication';

/**
 * Author resubmit visibility — Backend remains the authority via allowed_actions.
 * Admin UI additionally requires channel_id + message content type for the 228 path.
 */
export function canResubmitPendingContent(
  item: Pick<
    CommunicationContent,
    'state' | 'allowed_actions' | 'author' | 'channel_id' | 'content_type'
  >,
  options?: {
    currentUserId?: number | null;
    /** When true, require content_type message + channel_id (admin detail / channel path). */
    requireChannelMessage?: boolean;
  },
): boolean {
  if (item.state !== 'changes_requested') return false;
  const actions = item.allowed_actions ?? [];
  if (!actions.includes('resubmit')) return false;

  if (options?.requireChannelMessage) {
    if (item.content_type && item.content_type !== 'message') return false;
    if (item.channel_id == null) return false;
  }

  const userId = options?.currentUserId;
  if (userId != null && item.author?.id != null && item.author.id !== userId) {
    return false;
  }

  return true;
}
