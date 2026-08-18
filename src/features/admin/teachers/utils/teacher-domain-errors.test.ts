import { describe, expect, it } from 'vitest';
import {
  mapTeacherDomainError,
  teacherDomainErrorKey,
  teacherDomainFieldErrors,
} from './teacher-domain-errors';

const t = (key: string) => `tr:${key}`;

describe('teacher-domain-errors', () => {
  it('maps known backend codes to i18n keys', () => {
    expect(teacherDomainErrorKey('assignment_overlap')).toBe(
      'admin.teacherDomain.errors.assignmentOverlap',
    );
    expect(teacherDomainErrorKey('assignment_offering_mismatch')).toBe(
      'admin.teacherDomain.errors.assignmentOfferingMismatch',
    );
    expect(teacherDomainErrorKey('class_subject_mismatch')).toBe(
      'admin.academicSetup.errors.classSubjectMismatch',
    );
    expect(teacherDomainErrorKey('offering_archived')).toBe(
      'admin.teacherDomain.errors.offeringArchived',
    );
    expect(teacherDomainErrorKey('teacher_academic_level_cycle_mismatch')).toBe(
      'admin.teacherDomain.errors.academicLevelCycleMismatch',
    );
    expect(teacherDomainErrorKey('teacher_eligibility_invalid')).toBe(
      'admin.teacherDomain.errors.eligibilityInvalid',
    );
    expect(teacherDomainErrorKey('teacher_language_invalid')).toBe(
      'admin.teacherDomain.errors.languageInvalid',
    );
    expect(teacherDomainErrorKey('teacher_workload_limit_invalid')).toBe(
      'admin.teacherDomain.errors.workloadLimitInvalid',
    );
    expect(teacherDomainErrorKey('teacher_assignment_override_required')).toBe(
      'admin.teacherDomain.eligibleTeachers.errors.overrideRequired',
    );
    expect(teacherDomainErrorKey('teacher_assignment_hard_block')).toBe(
      'admin.teacherDomain.eligibleTeachers.errors.hardBlock',
    );
    expect(mapTeacherDomainError({ code: 'teacher_not_found', message: 'x' }, t)).toBe(
      'tr:admin.teacherDomain.errors.teacherNotFound',
    );
  });

  it('localizes the legacy class-subject mismatch before exposing backend English', () => {
    expect(
      mapTeacherDomainError(
        {
          code: 'unexpected_assignment_error',
          message: 'Subject التربية الإسلامية is not available for class 5APG-2.',
        },
        t,
      ),
    ).toBe('tr:admin.academicSetup.errors.classSubjectMismatch');
  });

  it('sanitizes unknown messages and extracts field errors', () => {
    expect(
      mapTeacherDomainError({ code: 'weird_code', message: 'Safe message' }, t),
    ).toContain('Safe message');
    expect(
      teacherDomainFieldErrors({ reason: 'required', notes: ['too short'] }),
    ).toEqual({ reason: 'required', notes: 'too short' });
  });
});
