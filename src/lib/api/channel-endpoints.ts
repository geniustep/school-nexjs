import { endpoints } from '@/lib/api/endpoints';
import type { Role } from '@/types/user';

export interface ChannelEndpoints {
  list: string;
  detail: (channelId: number | string) => string;
  messages: (channelId: number | string) => string;
  /** B4 — role-correct recipient preview (admin vs portal). */
  messageRecipientPreview: (channelId: number | string) => string;
  /** Author's pending communication contents for this channel (portal). */
  myPendingMessages: (channelId: number | string) => string;
  pendingMessageResubmit: (channelId: number | string, contentId: number | string) => string;
  /** Admin queue of pending channel messages. */
  adminPendingMessages: (channelId: number | string) => string;
}

export function channelsEndpointsForRole(role: Role): ChannelEndpoints {
  if (role === 'admin') {
    return {
      list: endpoints.admin.channels,
      detail: endpoints.admin.channel,
      // Backend 228: admin published list (not portal GET — forbidden for admin).
      messages: endpoints.admin.channelMessages,
      // B4: admin preview must not use portal path.
      messageRecipientPreview: endpoints.admin.channelMessageRecipientPreview,
      // Admin authors use admin pending list; portal my-pending is forbidden for admin accounts.
      myPendingMessages: endpoints.admin.channelPendingMessages,
      // Backend 228: admin must use admin resubmit, never portal resubmit.
      pendingMessageResubmit: endpoints.admin.channelPendingMessageResubmit,
      adminPendingMessages: endpoints.admin.channelPendingMessages,
    };
  }
  return {
    list: endpoints.channels.list,
    detail: endpoints.channels.detail,
    messages: endpoints.channels.messages,
    messageRecipientPreview: endpoints.channels.messageRecipientPreview,
    myPendingMessages: endpoints.channels.myPendingMessages,
    pendingMessageResubmit: endpoints.channels.pendingMessageResubmit,
    adminPendingMessages: endpoints.admin.channelPendingMessages,
  };
}

/** True when the recipient-preview path is the admin (B4) endpoint. */
export function isAdminChannelRecipientPreviewPath(path: string): boolean {
  return /^\/admin\/channels\/[^/]+\/messages\/recipient-preview$/.test(path);
}

/** True when the messages path is the admin published-messages endpoint. */
export function isAdminChannelMessagesPath(path: string): boolean {
  return /^\/admin\/channels\/[^/]+\/messages$/.test(path);
}

/** True when the resubmit path is the admin (228) endpoint. */
export function isAdminPendingResubmitPath(path: string): boolean {
  return /^\/admin\/channels\/[^/]+\/pending-messages\/[^/]+\/resubmit$/.test(path);
}
