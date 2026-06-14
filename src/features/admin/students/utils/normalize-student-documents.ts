import type {
  StudentDocument,
  StudentDocumentAttachment,
  StudentDocumentCapabilities,
  StudentDocumentSummary,
  StudentDocumentTypeOption,
  StudentDocumentsData,
} from '@/types/student-360';

const DEFAULT_SUMMARY: StudentDocumentSummary = {
  total: 0,
  valid: 0,
  expired: 0,
  missing_required: 0,
};

const DEFAULT_CAPS: StudentDocumentCapabilities = {
  can_view: false,
  can_manage: false,
};

function normalizeDocumentType(value: unknown): StudentDocumentTypeOption | string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const raw = value as Record<string, unknown>;
    if (typeof raw.id === 'number' && typeof raw.code === 'string') {
      return {
        id: raw.id,
        code: raw.code,
        name: typeof raw.name === 'string' ? raw.name : raw.code,
        is_required: raw.is_required === true,
      };
    }
    if (typeof raw.code === 'string') return raw.code;
  }
  return null;
}

function normalizeAttachment(value: unknown): StudentDocumentAttachment | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'number') return null;
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : `attachment-${raw.id}`,
    mimetype: typeof raw.mimetype === 'string' ? raw.mimetype : null,
    size: typeof raw.size === 'number' ? raw.size : null,
  };
}

function normalizeDocumentItem(value: unknown): StudentDocument | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'number') return null;
  return {
    id: raw.id,
    document_type: normalizeDocumentType(raw.document_type),
    document_number: typeof raw.document_number === 'string' ? raw.document_number : null,
    issue_date: typeof raw.issue_date === 'string' ? raw.issue_date : null,
    expiry_date: typeof raw.expiry_date === 'string' ? raw.expiry_date : null,
    state: typeof raw.state === 'string' ? raw.state : 'uploaded',
    notes: typeof raw.notes === 'string' ? raw.notes : null,
    attachment: normalizeAttachment(raw.attachment),
    active: raw.active !== false,
    create_date: typeof raw.create_date === 'string' ? raw.create_date : null,
    write_date: typeof raw.write_date === 'string' ? raw.write_date : null,
  };
}

function normalizeSummary(value: unknown): StudentDocumentSummary {
  if (!value || typeof value !== 'object') return DEFAULT_SUMMARY;
  const raw = value as Record<string, unknown>;
  return {
    total: typeof raw.total === 'number' ? raw.total : 0,
    valid: typeof raw.valid === 'number' ? raw.valid : 0,
    expired: typeof raw.expired === 'number' ? raw.expired : 0,
    missing_required: typeof raw.missing_required === 'number' ? raw.missing_required : 0,
  };
}

function normalizeCapabilities(value: unknown): StudentDocumentCapabilities {
  if (!value || typeof value !== 'object') return DEFAULT_CAPS;
  const raw = value as Record<string, unknown>;
  return {
    can_view: raw.can_view === true,
    can_manage: raw.can_manage === true,
  };
}

/** Normalize GET /admin/students/{id}/documents response shapes. */
export function normalizeStudentDocumentsResponse(data: unknown): StudentDocumentsData | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;

  const itemsSource = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(data)
      ? (data as unknown[])
      : [];

  const items = itemsSource
    .map(normalizeDocumentItem)
    .filter((item): item is StudentDocument => item != null);

  return {
    items,
    summary: normalizeSummary(raw.summary),
    capabilities: normalizeCapabilities(raw.capabilities),
  };
}

export function documentTypeLabel(
  documentType: StudentDocument['document_type'],
): string {
  if (!documentType) return '';
  if (typeof documentType === 'string') return documentType;
  return documentType.name || documentType.code;
}

export function documentTypeCode(
  documentType: StudentDocument['document_type'],
): string {
  if (!documentType) return '';
  if (typeof documentType === 'string') return documentType;
  return documentType.code;
}
