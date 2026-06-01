export const HOMEWORK_ATTACHMENT_MAX_FILES = 5;
export const HOMEWORK_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
]);

const BLOCKED_EXT = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.js',
  '.html',
  '.htm',
  '.php',
  '.py',
  '.jar',
  '.apk',
  '.ipa',
  '.zip',
  '.rar',
]);

export type HomeworkUploadRejectReason =
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'too_many_files'
  | 'pick_at_least_one';

export interface HomeworkUploadValidationResult {
  ok: boolean;
  reason?: HomeworkUploadRejectReason;
  /** First offending file name when relevant. */
  fileName?: string;
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot).toLowerCase();
}

export function isAllowedHomeworkAttachment(name: string): boolean {
  const ext = fileExtension(name);
  if (!ext) return false;
  if (BLOCKED_EXT.has(ext)) return false;
  return ALLOWED_EXT.has(ext);
}

export function validateHomeworkUploadFiles(
  files: File[],
  existingCount: number,
): HomeworkUploadValidationResult {
  if (files.length === 0) {
    return { ok: false, reason: 'pick_at_least_one' };
  }
  if (existingCount + files.length > HOMEWORK_ATTACHMENT_MAX_FILES) {
    return { ok: false, reason: 'too_many_files' };
  }
  for (const file of files) {
    if (file.size > HOMEWORK_ATTACHMENT_MAX_BYTES) {
      return { ok: false, reason: 'file_too_large', fileName: file.name };
    }
    if (!isAllowedHomeworkAttachment(file.name)) {
      return { ok: false, reason: 'unsupported_file_type', fileName: file.name };
    }
  }
  return { ok: true };
}

export function buildHomeworkAttachmentsFormData(files: File[]): FormData {
  const fd = new FormData();
  if (files.length === 1) {
    fd.append('file', files[0]);
  } else {
    for (const file of files) {
      fd.append('files', file);
    }
  }
  return fd;
}
