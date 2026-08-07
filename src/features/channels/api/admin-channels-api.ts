/**
 * Admin channel lifecycle API — BFF `/api/odoo` only.
 * Contract: Odoo 18.0.1.0.254 (1b6f9b62…).
 */

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AdminChannel,
  AdminChannelListMeta,
  CreateAdminChannelInput,
  DeleteAdminChannelResult,
  UndeliverableGuardianRow,
  UpdateAdminChannelInput,
} from '@/types/admin-channel';
import { ADMIN_MANUAL_CHANNEL_TYPES, ADMIN_SYSTEM_CHANNEL_TYPES } from '@/types/admin-channel';

const CREATE_ALLOWLIST = [
  'name',
  'description',
  'channel_type',
  'class_id',
  'read_only',
  'allow_attachments',
  'notify_email',
] as const;

const UPDATE_ALLOWLIST = [
  'name',
  'description',
  'read_only',
  'allow_attachments',
  'notify_email',
] as const;

const CREATABLE = new Set<string>([
  ...ADMIN_MANUAL_CHANNEL_TYPES,
  ...ADMIN_SYSTEM_CHANNEL_TYPES,
]);

function trimOrOmit(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/** Build create body — allowlist only; never school_id / allowed_actions / counts. */
export function buildCreateAdminChannelPayload(
  input: CreateAdminChannelInput,
): Record<string, unknown> {
  const channelType = String(input.channel_type || '').trim();
  if (!CREATABLE.has(channelType)) {
    throw new Error('invalid_channel_type');
  }

  const body: Record<string, unknown> = {
    name: String(input.name || '').trim(),
    channel_type: channelType,
  };

  const description = trimOrOmit(input.description ?? undefined);
  if (description !== undefined) body.description = description;

  if (typeof input.read_only === 'boolean') body.read_only = input.read_only;
  if (typeof input.allow_attachments === 'boolean') {
    body.allow_attachments = input.allow_attachments;
  }
  if (typeof input.notify_email === 'boolean') body.notify_email = input.notify_email;

  if (
    channelType === 'class' ||
    (ADMIN_SYSTEM_CHANNEL_TYPES as readonly string[]).includes(channelType)
  ) {
    if (typeof input.class_id === 'number' && Number.isFinite(input.class_id)) {
      body.class_id = Math.trunc(input.class_id);
    }
  }

  // Strip any accidental non-allowlist keys.
  for (const key of Object.keys(body)) {
    if (!(CREATE_ALLOWLIST as readonly string[]).includes(key)) {
      delete body[key];
    }
  }
  return body;
}

/** Build update body — never system identity fields. */
export function buildUpdateAdminChannelPayload(
  input: UpdateAdminChannelInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (typeof input.name === 'string') {
    body.name = input.name.trim();
  }
  if (input.description !== undefined) {
    const description = input.description == null ? '' : String(input.description).trim();
    body.description = description;
  }
  if (typeof input.read_only === 'boolean') body.read_only = input.read_only;
  if (typeof input.allow_attachments === 'boolean') {
    body.allow_attachments = input.allow_attachments;
  }
  if (typeof input.notify_email === 'boolean') body.notify_email = input.notify_email;

  for (const key of Object.keys(body)) {
    if (!(UPDATE_ALLOWLIST as readonly string[]).includes(key)) {
      delete body[key];
    }
  }
  return body;
}

export type ListAdminChannelsQuery = ListParams & {
  include_archived?: string | number | boolean;
  include_family_audience?: string | number | boolean;
  type?: string;
};

export async function listAdminChannels(
  query?: ListAdminChannelsQuery,
): Promise<ApiResponse<AdminChannel[]>> {
  const res = await api.get<AdminChannel[]>(endpoints.admin.channels, query);
  return {
    ...res,
    meta: (res.meta ?? {}) as AdminChannelListMeta,
  };
}

export async function getAdminChannel(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdminChannel>> {
  return api.get<AdminChannel>(endpoints.admin.channel(id), query);
}

export async function createAdminChannel(
  input: CreateAdminChannelInput,
  query?: ListParams,
): Promise<ApiResponse<AdminChannel>> {
  const body = buildCreateAdminChannelPayload(input);
  return api.post<AdminChannel>(endpoints.admin.channels, body, query);
}

export async function updateAdminChannel(
  id: number | string,
  input: UpdateAdminChannelInput,
  query?: ListParams,
): Promise<ApiResponse<AdminChannel>> {
  const body = buildUpdateAdminChannelPayload(input);
  return api.patch<AdminChannel>(endpoints.admin.channel(id), body, query);
}

export async function deleteAdminChannel(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<DeleteAdminChannelResult>> {
  return api.delete<DeleteAdminChannelResult>(endpoints.admin.channel(id), query);
}

export async function archiveAdminChannel(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdminChannel>> {
  return api.post<AdminChannel>(endpoints.admin.channelArchive(id), {}, query);
}

export async function restoreAdminChannel(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AdminChannel>> {
  return api.post<AdminChannel>(endpoints.admin.channelRestore(id), {}, query);
}

export type ListUndeliverableGuardiansQuery = ListParams & {
  page?: number;
  page_size?: number;
};

/** GET undeliverable guardians — on-demand only; never N+1 from channel list. */
export async function listUndeliverableGuardians(
  channelId: number | string,
  query?: ListUndeliverableGuardiansQuery,
): Promise<ApiResponse<UndeliverableGuardianRow[]>> {
  return api.get<UndeliverableGuardianRow[]>(
    endpoints.admin.channelUndeliverableGuardians(channelId),
    query,
  );
}
