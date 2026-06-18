import { describe, expect, it } from 'vitest';
import {
  resolveStudentPhotoCandidates,
  resolveStudentPhotoUrl,
} from './resolve-student-photo-url';

describe('resolveStudentPhotoUrl', () => {
  it('routes Odoo /web/image paths through odoo-web BFF', () => {
    expect(resolveStudentPhotoUrl('/web/image/school.student/854/image_128')).toBe(
      '/api/odoo-web/image/school.student/854/image_128',
    );
  });

  it('routes full image through odoo-web BFF', () => {
    expect(resolveStudentPhotoUrl('/web/image/school.student/854/image_1920')).toBe(
      '/api/odoo-web/image/school.student/854/image_1920',
    );
  });

  it('does not prefix /web/image with /api/odoo', () => {
    const resolved = resolveStudentPhotoUrl('/web/image/school.student/854/image_128');
    expect(resolved).not.toContain('/api/odoo/web/');
  });

  it('rejects bare image_128 tokens', () => {
    expect(resolveStudentPhotoUrl('image_128')).toBeNull();
  });

  it('keeps /api/odoo admin paths unchanged', () => {
    expect(resolveStudentPhotoUrl('/api/odoo/admin/students/1')).toBe(
      '/api/odoo/admin/students/1',
    );
  });
});

describe('resolveStudentPhotoCandidates', () => {
  it('orders full image before thumbnail', () => {
    expect(
      resolveStudentPhotoCandidates({
        thumbnail_url: '/web/image/school.student/854/image_128',
        image_url: '/web/image/school.student/854/image_1920',
      }),
    ).toEqual([
      '/api/odoo-web/image/school.student/854/image_1920',
      '/api/odoo-web/image/school.student/854/image_128',
    ]);
  });

  it('keeps thumbnail as second fallback when full image is absent', () => {
    expect(
      resolveStudentPhotoCandidates({
        thumbnail_url: '/web/image/school.student/854/image_128',
      }),
    ).toEqual(['/api/odoo-web/image/school.student/854/image_128']);
  });

  it('returns empty list when no photo URLs are provided', () => {
    expect(resolveStudentPhotoCandidates(null)).toEqual([]);
    expect(resolveStudentPhotoCandidates({})).toEqual([]);
  });
});
