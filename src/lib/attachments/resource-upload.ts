import type { ResourceDetail } from '@/types/resource';

export {
  ATTACHMENT_MAX_FILES as RESOURCE_ATTACHMENT_MAX_FILES,
  ATTACHMENT_MAX_BYTES as RESOURCE_ATTACHMENT_MAX_BYTES,
  fileExtension,
  isAllowedAttachment as isAllowedResourceAttachment,
  validateAttachmentUploadFiles as validateResourceUploadFiles,
  buildAttachmentsFormData as buildResourceAttachmentsFormData,
  type AttachmentUploadRejectReason as ResourceUploadRejectReason,
  type AttachmentUploadValidationResult as ResourceUploadValidationResult,
} from './upload-policy';

/** Whether the teacher portal may upload attachments for this resource. */
export function canUploadResourceAttachments(r: ResourceDetail): boolean {
  return r.state !== 'archived';
}
