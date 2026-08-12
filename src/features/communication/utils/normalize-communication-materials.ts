import { normalizeSmartLinks } from '@/components/attachments/smart-link-cards';
import type { AttachmentMeta } from '@/types/attachment';
import type { CommunicationContent } from '@/types/communication';
import type { SmartLinkRef } from '@/types/smart-link';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function snapshotArray(value: unknown, keys: string[]): unknown[] {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed;
  const row = record(parsed);
  if (!row) return [];
  for (const key of keys) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
  }
  return [];
}

function firstArray(sources: unknown[]): unknown[] {
  for (const source of sources) {
    if (Array.isArray(source) && source.length > 0) return source;
  }
  return [];
}

function normalizeAttachments(value: unknown): AttachmentMeta[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  return value.flatMap((entry) => {
    const row = record(entry);
    const id = typeof row?.id === 'number' && Number.isFinite(row.id) ? row.id : null;
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    if (id == null || id <= 0 || !name || seen.has(id)) return [];
    seen.add(id);
    const size = typeof row?.size === 'number'
      ? row.size
      : typeof row?.file_size === 'number' ? row.file_size : null;
    return [{
      id,
      name,
      mimetype: typeof row?.mimetype === 'string' ? row.mimetype : null,
      size,
      download_url: typeof row?.download_url === 'string' ? row.download_url : null,
      preview_url: typeof row?.preview_url === 'string' ? row.preview_url : null,
      thumbnail_url: typeof row?.thumbnail_url === 'string' ? row.thumbnail_url : null,
      is_image: row?.is_image === true,
      is_pdf: row?.is_pdf === true,
      is_previewable: typeof row?.is_previewable === 'boolean' ? row.is_previewable : undefined,
    }];
  });
}

export function normalizeCommunicationMaterials(item: CommunicationContent): {
  attachments: AttachmentMeta[];
  links: SmartLinkRef[];
} {
  const content = item as CommunicationContent & Record<string, unknown>;
  const current = record(item.current_version);
  const approved = record(item.approved_version);

  const attachments = firstArray([
    content.attachments,
    current?.attachments,
    snapshotArray(current?.attachment_snapshot_json, ['attachments', 'items']),
    approved?.attachments,
    snapshotArray(approved?.attachment_snapshot_json, ['attachments', 'items']),
  ]);

  const links = firstArray([
    content.links,
    content.smart_links,
    content.link_materials,
    current?.links,
    current?.smart_links,
    current?.link_materials,
    snapshotArray(current?.link_snapshot_json, ['links', 'materials', 'items']),
    approved?.links,
    approved?.smart_links,
    approved?.link_materials,
    snapshotArray(approved?.link_snapshot_json, ['links', 'materials', 'items']),
  ]);

  return {
    attachments: normalizeAttachments(attachments),
    links: normalizeSmartLinks(links),
  };
}
