import { describe, expect, it } from 'vitest';
import { buildStudentEditPhotoHref } from './student-edit-tabs';

describe('buildStudentEditPhotoHref', () => {
  it('points upload photo CTA to the edit photo anchor', () => {
    expect(buildStudentEditPhotoHref(727)).toBe('/admin/students/727/edit#student-photo');
  });
});
