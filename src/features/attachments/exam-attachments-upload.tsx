'use client';

import { AttachmentsUpload } from '@/features/attachments/attachments-upload';
import { endpoints } from '@/lib/api/endpoints';

interface ExamAttachmentsUploadProps {
  examId: number;
  existingCount: number;
  onUploaded: () => void;
  messageScope: 'admin' | 'teacher';
}

export function ExamAttachmentsUpload({
  examId,
  existingCount,
  onUploaded,
  messageScope,
}: ExamAttachmentsUploadProps) {
  const uploadPath =
    messageScope === 'admin'
      ? endpoints.admin.examAttachments(examId)
      : endpoints.teacher.examAttachments(examId);

  return (
    <AttachmentsUpload
      uploadPath={uploadPath}
      existingCount={existingCount}
      onUploaded={onUploaded}
      messageScope={messageScope}
      successMessageKey={`${messageScope}.examAttachmentsUploadSuccess`}
    />
  );
}
