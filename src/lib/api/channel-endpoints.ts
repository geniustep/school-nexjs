import { endpoints } from '@/lib/api/endpoints';
import type { Role } from '@/types/user';

export interface ChannelEndpoints {
  list: string;
  detail: (channelId: number | string) => string;
  messages: (channelId: number | string) => string;
}

export function channelsEndpointsForRole(role: Role): ChannelEndpoints {
  if (role === 'admin') {
    return {
      list: endpoints.admin.channels,
      detail: endpoints.admin.channel,
      messages: endpoints.admin.channelMessages,
    };
  }
  return endpoints.channels;
}
