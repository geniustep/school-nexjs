// Secure attachment metadata — mirrors API v1 attachment payloads.

export interface AttachmentMeta {
  id: number;
  name: string;
  mimetype?: string | null;
  size?: number | null;
  download_url?: string | null;
}

export interface HomeworkAttachmentsUploadData {
  homework_id: number;
  attachments: AttachmentMeta[];
}
