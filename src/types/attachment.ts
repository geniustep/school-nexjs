// Secure attachment metadata — mirrors API v1 attachment payloads.

export interface AttachmentMeta {
  id: number;
  name: string;
  mimetype?: string | null;
  size?: number | null;
  download_url?: string | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  is_image?: boolean;
  is_pdf?: boolean;
  is_previewable?: boolean;
}

/** Summary fields returned on list endpoints for attachment indicators. */
export interface AttachmentListMeta {
  has_attachments?: boolean;
  attachment_count?: number;
  first_attachment_name?: string | null;
  first_attachment_mimetype?: string | null;
  first_image_thumbnail_url?: string | null;
}

export interface HomeworkAttachmentsUploadData {
  homework_id: number;
  attachments: AttachmentMeta[];
}

export interface ResourceAttachmentsUploadData {
  resource_id: number;
  attachments: AttachmentMeta[];
}

export interface ExamAttachmentsUploadData {
  exam_id: number;
  attachments: AttachmentMeta[];
}
