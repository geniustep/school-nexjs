export {
  ATTACHMENT_MAX_FILES as HOMEWORK_ATTACHMENT_MAX_FILES,
  ATTACHMENT_MAX_BYTES as HOMEWORK_ATTACHMENT_MAX_BYTES,
  fileExtension,
  isAllowedAttachment as isAllowedHomeworkAttachment,
  validateAttachmentUploadFiles as validateHomeworkUploadFiles,
  buildAttachmentsFormData as buildHomeworkAttachmentsFormData,
  type AttachmentUploadRejectReason as HomeworkUploadRejectReason,
  type AttachmentUploadValidationResult as HomeworkUploadValidationResult,
} from './upload-policy';
