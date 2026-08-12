'use client';

import { api } from '@/lib/api/client';
import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type {
  SecureMaterial,
  UploadSessionCredential,
  UploadSessionPurpose,
} from './types';

const ROOT = '/attachments/upload-sessions';

function randomKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeMaterial(value: unknown, fallbackClientId: string): SecureMaterial {
  const raw = record(value);
  const link = record(raw.link ?? raw.link_meta ?? raw.url_meta);
  const detected = text(raw.detected_mimetype ?? raw.mimetype);
  const kind = raw.material_kind === 'link' || raw.kind === 'link' || Boolean(raw.url) ? 'link' : 'file';
  const id = num(raw.id ?? raw.material_id) ?? fallbackClientId;
  const stateRaw = text(raw.state);
  const state = stateRaw === 'ready' || stateRaw === 'consumed' ? 'ready' : stateRaw === 'failed' || stateRaw === 'rejected' ? 'failed' : 'uploading';
  return {
    id,
    clientItemId: text(raw.client_item_id) ?? fallbackClientId,
    kind,
    state,
    name:
      text(raw.original_name ?? raw.safe_name ?? raw.name ?? link.title) ??
      (kind === 'link' ? text(raw.url) ?? 'Link' : 'File'),
    size: num(raw.file_size ?? raw.size),
    mimetype: detected,
    url: text(raw.url),
    canonicalUrl: text(raw.canonical_url ?? link.canonical_url ?? raw.url),
    embedUrl: text(raw.embed_url ?? link.embed_url),
    provider: text(raw.provider ?? link.provider),
    canEmbed: Boolean(raw.can_embed ?? link.can_embed),
    clickToLoad: Boolean(raw.click_to_load ?? link.click_to_load),
    error: text(raw.rejection_message ?? raw.error),
  };
}

function extractMaterial(data: unknown, clientId: string): SecureMaterial {
  const raw = record(data);
  const first = Array.isArray(raw.materials) ? raw.materials[0] : undefined;
  return normalizeMaterial(raw.material ?? raw.item ?? first ?? data, clientId);
}

function sessionHeaders(credential: string, idempotencyKey?: string): Record<string, string> {
  return {
    'X-Upload-Session-Credential': credential,
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
  };
}

export async function createUploadSession(params: {
  purpose: UploadSessionPurpose;
  channelId?: number;
  idempotencyKey: string;
}): Promise<ApiResponse<UploadSessionCredential>> {
  const result = await api.post<Record<string, unknown>>(
    ROOT,
    {
      purpose: params.purpose,
      ...(params.channelId != null ? { channel_id: params.channelId } : {}),
    },
    undefined,
    { 'Idempotency-Key': params.idempotencyKey },
  );
  if (!result.success) return result as ApiResponse<UploadSessionCredential>;
  const raw = record(result.data);
  const session = record(raw.session);
  const publicId = text(raw.public_id ?? session.public_id);
  const credential = text(raw.credential ?? session.credential);
  if (!publicId || !credential) {
    return {
      success: false,
      error: { code: 'invalid_contract', message: 'Upload session response is incomplete.', details: {} },
      meta: result.meta,
    };
  }
  return { success: true, data: { publicId, credential }, meta: result.meta };
}

export async function uploadSessionFile(
  session: UploadSessionCredential,
  file: File,
  clientItemId: string,
): Promise<ApiResponse<SecureMaterial>> {
  const form = new FormData();
  form.append('file', file);
  form.append('client_item_id', clientItemId);
  const result = await api.uploadForm<unknown>(
    `${ROOT}/${session.publicId}/files`,
    form,
    undefined,
    sessionHeaders(session.credential),
  );
  if (!result.success) return result as ApiResponse<SecureMaterial>;
  return { ...result, data: extractMaterial(result.data, clientItemId) };
}

export async function addSessionLink(
  session: UploadSessionCredential,
  url: string,
  clientItemId: string,
): Promise<ApiResponse<SecureMaterial>> {
  const result = await api.post<unknown>(
    `${ROOT}/${session.publicId}/links`,
    { url, client_item_id: clientItemId },
    undefined,
    sessionHeaders(session.credential),
  );
  if (!result.success) return result as ApiResponse<SecureMaterial>;
  return { ...result, data: extractMaterial(result.data, clientItemId) };
}

export async function removeSessionMaterial(
  session: UploadSessionCredential,
  materialId: number | string,
): Promise<ApiResponse<unknown>> {
  return api.delete(`${ROOT}/${session.publicId}/materials/${materialId}`, undefined, sessionHeaders(session.credential));
}

export async function cancelUploadSession(session: UploadSessionCredential): Promise<void> {
  await api.post(`${ROOT}/${session.publicId}/cancel`, {}, undefined, sessionHeaders(session.credential));
}

export async function finalizeUploadSession<T>(params: {
  path: string;
  session: UploadSessionCredential;
  idempotencyKey: string;
  body: Record<string, unknown>;
}): Promise<ApiResponse<T>> {
  return api.post<T>(
    params.path,
    params.body,
    undefined,
    sessionHeaders(params.session.credential, params.idempotencyKey),
  );
}

export function createIdempotencyKey(prefix: string): string {
  return randomKey(prefix);
}

export function apiErrorMessage(error: ApiErrorBody | undefined): string {
  return error?.message || 'تعذر إكمال العملية.';
}
