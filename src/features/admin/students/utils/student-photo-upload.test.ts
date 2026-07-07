import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  isAllowedStudentPhotoFile,
  uploadStudentPhotoDocument,
  validateStudentPhotoFile,
} from './student-photo-upload';
import { api } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  api: {
    uploadForm: vi.fn(),
  },
}));

describe('validateStudentPhotoFile', () => {
  it('accepts jpeg images', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    expect(validateStudentPhotoFile(file)).toEqual({ ok: true });
  });

  it('rejects pdf files for photo upload', () => {
    const file = new File(['x'], 'photo.pdf', { type: 'application/pdf' });
    const result = validateStudentPhotoFile(file);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('photo_file_type_not_allowed');
  });
});

describe('isAllowedStudentPhotoFile', () => {
  it('allows webp images', () => {
    const file = new File(['x'], 'photo.webp', { type: 'image/webp' });
    expect(isAllowedStudentPhotoFile(file)).toBe(true);
  });
});

describe('uploadStudentPhotoDocument', () => {
  beforeEach(() => {
    vi.mocked(api.uploadForm).mockReset();
  });

  it('creates a student photo document when none exists', async () => {
    vi.mocked(api.uploadForm).mockResolvedValue({ success: true, data: {}, meta: {} });
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    await uploadStudentPhotoDocument({
      studentId: 42,
      file,
      documents: [],
      documentTypes: [{ id: 9, code: 'student_photo', name: 'Student photo', is_required: false }],
      activeSchoolId: 3,
    });

    expect(api.uploadForm).toHaveBeenCalledWith(
      '/admin/students/42/documents',
      expect.any(FormData),
      { active_school_id: 3 },
    );
    const fd = vi.mocked(api.uploadForm).mock.calls[0]?.[1] as FormData;
    expect(fd.get('document_type_id')).toBe('9');
    expect(fd.get('file')).toBe(file);
  });

  it('replaces an existing student photo document', async () => {
    vi.mocked(api.uploadForm).mockResolvedValue({ success: true, data: {}, meta: {} });
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    await uploadStudentPhotoDocument({
      studentId: 42,
      file,
      documents: [
        {
          id: 77,
          document_type: { id: 9, code: 'student_photo', name: 'Student photo', is_required: false },
          document_number: null,
          issue_date: null,
          expiry_date: null,
          state: 'uploaded',
          notes: null,
          attachment: { id: 1, name: 'photo.png', mimetype: 'image/png', size: 10 },
          active: true,
          create_date: null,
          write_date: null,
        },
      ],
      documentTypes: [],
      activeSchoolId: null,
    });

    expect(api.uploadForm).toHaveBeenCalledWith(
      '/admin/students/42/documents/77/replace',
      expect.any(FormData),
      undefined,
    );
  });
});
