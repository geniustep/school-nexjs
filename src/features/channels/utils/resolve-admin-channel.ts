import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { FAMILY_AUDIENCE_QUERY } from '@/features/channels/utils/channel-audience-present';
import type { ApiErrorBody } from '@/types/api';
import type { AdminChannel } from '@/types/admin-channel';

/**
 * Resolve an admin channel for chat UI.
 * Backend 228 exposes GET …/messages, but detail GET …/channels/{id} may still 404.
 * Fallback: find the channel in GET /admin/channels (no invented endpoint).
 * Opt-in include_family_audience=1 for privacy-safe class_family presentation.
 */
export async function resolveAdminChannel(
  channelId: number,
): Promise<
  | { ok: true; channel: AdminChannel; source: 'detail' | 'list' }
  | { ok: false; error: ApiErrorBody }
> {
  const detail = await api.get<AdminChannel>(endpoints.admin.channel(channelId), {
    ...FAMILY_AUDIENCE_QUERY,
  });
  if (detail.success) {
    return { ok: true, channel: detail.data, source: 'detail' };
  }

  const detailError = detail.error;
  const status = detailError.details?.status;
  const notFound =
    status === 404 ||
    detailError.code === 'not_found' ||
    detailError.code === 'resource_not_found';

  if (!notFound) {
    return { ok: false, error: detailError };
  }

  const list = await api.get<AdminChannel[]>(endpoints.admin.channels, {
    page: 1,
    limit: 200,
    ...FAMILY_AUDIENCE_QUERY,
  });
  if (!list.success) {
    return {
      ok: false,
      error: list.error,
    };
  }
  const found = pickChannelFromList(list.data, channelId);
  if (!found) {
    return {
      ok: false,
      error: detailError,
    };
  }
  return { ok: true, channel: found, source: 'list' };
}

/** Pick channel from list payload (unit-testable, no network). */
export function pickChannelFromList(
  rows: AdminChannel[] | null | undefined,
  channelId: number,
): AdminChannel | null {
  if (!Array.isArray(rows)) return null;
  return rows.find((c) => c.id === channelId) ?? null;
}
