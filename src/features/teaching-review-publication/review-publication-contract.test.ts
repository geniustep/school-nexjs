import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import {
  TEACHING_ARCHIVE_MANAGE_CAPABILITY,
  TEACHING_ARCHIVE_VIEW_CAPABILITY,
  TEACHING_EXPORT_CAPABILITY,
  TEACHING_OFFICIAL_PRINT_CAPABILITY,
  TEACHING_PERIOD_CLOSE_CAPABILITY,
  TEACHING_PERIOD_EXCEPTIONAL_CORRECTION_CAPABILITY,
  TEACHING_PERIOD_REOPEN_CAPABILITY,
  TEACHING_REVIEW_APPROVE_CAPABILITY,
  TEACHING_REVIEW_MANAGE_CAPABILITY,
  TEACHING_REVIEW_VIEW_CAPABILITY,
} from '@/lib/permissions/teaching-planning';
import { TEACHING_EXPORT_FORMATS } from '@/types/teaching-review-publication';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('teaching stage 9 Odoo 224 contract adoption', () => {
  it('registers exact admin and teacher Stage 9 endpoints', () => {
    expect(endpoints.admin.teachingReviewQueue).toBe('/admin/teaching/review-queue');
    expect(endpoints.admin.teachingDocumentApproveOfficial('homework', 1)).toBe(
      '/admin/teaching/documents/homework/1/approve-official',
    );
    expect(endpoints.admin.teachingArchive).toBe('/admin/teaching/archive');
    expect(endpoints.admin.teachingExports).toBe('/admin/teaching/exports');
    expect(endpoints.admin.teachingPeriodClosurePreview).toBe(
      '/admin/teaching/period-closures/preview',
    );
    expect(endpoints.admin.teachingPeriodClosureClose).toBe(
      '/admin/teaching/period-closures/close',
    );
    expect(endpoints.teacher.teachingClosureStatus).toBe('/teacher/teaching/closure-status');
    expect(endpoints.teacher.teachingPublications).toBe('/teacher/teaching/publications');
    expect(endpoints.teacher.teachingDocumentReviewStatus('homework', 9)).toBe(
      '/teacher/teaching/documents/homework/9/review-status',
    );
  });

  it('keeps Stage 9 capability codes aligned with Odoo bindings', () => {
    expect(TEACHING_REVIEW_VIEW_CAPABILITY).toBe('teaching.review.view');
    expect(TEACHING_REVIEW_MANAGE_CAPABILITY).toBe('teaching.review.manage');
    expect(TEACHING_REVIEW_APPROVE_CAPABILITY).toBe('teaching.review.approve');
    expect(TEACHING_OFFICIAL_PRINT_CAPABILITY).toBe('teaching.official_print');
    expect(TEACHING_ARCHIVE_VIEW_CAPABILITY).toBe('teaching.archive.view');
    expect(TEACHING_ARCHIVE_MANAGE_CAPABILITY).toBe('teaching.archive.manage');
    expect(TEACHING_EXPORT_CAPABILITY).toBe('teaching.export');
    expect(TEACHING_PERIOD_CLOSE_CAPABILITY).toBe('teaching.period_close');
    expect(TEACHING_PERIOD_REOPEN_CAPABILITY).toBe('teaching.period_reopen');
    expect(TEACHING_PERIOD_EXCEPTIONAL_CORRECTION_CAPABILITY).toBe(
      'teaching.period_exceptional_correction',
    );
  });

  it('does not expose XLSX as an available export action', () => {
    expect(TEACHING_EXPORT_FORMATS).not.toContain('xlsx');
    const adminPage = read(
      'src/features/admin/teaching-review-publication/components/admin-review-publication-page.tsx',
    );
    expect(adminPage).not.toMatch(/xlsx/i);
  });

  it('strips payload in normalization and never renders payload_json in admin/teacher pages', () => {
    const normalize = read(
      'src/features/teaching-review-publication/normalize-review-publication.ts',
    );
    expect(normalize).toContain('payload');
    const admin = read(
      'src/features/admin/teaching-review-publication/components/admin-review-publication-page.tsx',
    );
    const teacher = read(
      'src/features/teacher/teaching-review-publication/components/teacher-review-publication-page.tsx',
    );
    expect(admin).not.toMatch(/payload_json/);
    expect(teacher).not.toMatch(/payload_json/);
  });

  it('uses BFF teaching family paths and dedicated binary download allowlist', () => {
    const download = read(
      'src/features/teaching-review-publication/review-publication-download.ts',
    );
    expect(download).toContain('/admin/teaching/');
    expect(download).toContain('/teacher/teaching/');
    expect(download).toContain('path_not_allowed');
  });

  it('documents reclose via close_scope (no separate reclose route)', () => {
    const api = read(
      'src/features/admin/teaching-review-publication/api/admin-review-publication-api.ts',
    );
    expect(api).toContain('teachingPeriodClosureClose');
    expect(api).not.toMatch(/reclose/);
  });
});
