export {
  ATTACHMENT_MAX_FILES as ADMIN_ATTACHMENT_MAX_FILES,
  ATTACHMENT_MAX_BYTES as ADMIN_ATTACHMENT_MAX_BYTES,
  validateAttachmentUploadFiles as validateAdminUploadFiles,
  buildAttachmentsFormData as buildAdminAttachmentsFormData,
  type AttachmentUploadRejectReason as AdminUploadRejectReason,
  type AttachmentUploadValidationResult as AdminUploadValidationResult,
} from './upload-policy';

/** Whether the admin portal may upload attachments for this entity. */
export function canUploadAdminAttachments(state: string): boolean {
  return state !== 'archived';
}
