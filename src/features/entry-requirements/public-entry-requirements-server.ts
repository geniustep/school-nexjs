import 'server-only';

import { buildOdooApiUrl } from '@/lib/api/build-odoo-api-url';
import { config } from '@/lib/config';
import { resolveTenantRuntimeConfigFromServerHeaders } from '@/lib/tenant';
import type { RequirementItem } from '@/features/entry-requirements/entry-requirements-contract';

export type PublicRequirementAttachment = {
  id: number;
  name: string;
  mimetype: string;
  size: number;
};

export type PublicRequirementList = {
  list_id: number;
  school_id: number;
  school_name: string | null;
  academic_year_id: number;
  academic_year: string | null;
  level_id: number;
  level: string | null;
  track_id: number | null;
  track: string | null;
  class_id: number | null;
  class_name: string | null;
  name: string;
  revision: number;
  state: 'published';
  is_current: boolean;
  published_at: string | null;
  notes: string | null;
  item_count: number;
  items: RequirementItem[];
  attachment_count: number;
  attachments: PublicRequirementAttachment[];
  read_only: true;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

export function isValidPublicEntryRequirementToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,200}$/.test(token);
}

function publicListPath(token: string): string {
  return `/public/entry-requirement-lists/by-token/${encodeURIComponent(token)}`;
}

export async function fetchPublicEntryRequirementList(token: string): Promise<PublicRequirementList | null> {
  if (!isValidPublicEntryRequirementToken(token)) return null;
  const runtime = await resolveTenantRuntimeConfigFromServerHeaders();
  if (!runtime.ok) return null;
  const url = buildOdooApiUrl(
    runtime.config.backendBaseUrl,
    config.apiPrefix,
    publicListPath(token),
  );
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiEnvelope<PublicRequirementList>;
    if (!payload.success || !payload.data || payload.data.state !== 'published' || !payload.data.read_only) {
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}

export async function publicEntryRequirementAttachmentUrl(
  token: string,
  attachmentId: number,
): Promise<string | null> {
  if (!isValidPublicEntryRequirementToken(token) || !Number.isSafeInteger(attachmentId) || attachmentId <= 0) {
    return null;
  }
  const runtime = await resolveTenantRuntimeConfigFromServerHeaders();
  if (!runtime.ok) return null;
  return buildOdooApiUrl(
    runtime.config.backendBaseUrl,
    config.apiPrefix,
    `${publicListPath(token)}/attachments/${attachmentId}/download`,
  );
}
