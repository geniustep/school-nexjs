import { describe, expect, it } from 'vitest';
import type {
  TeachingOfferingCreatePayload,
  TeachingReferenceCreatePayload,
} from '@/types/teaching-planning';

function referencePayloadComplete(payload: Partial<TeachingReferenceCreatePayload>): boolean {
  return Boolean(
    payload.name?.trim() &&
      payload.school_id &&
      payload.level_id &&
      payload.subject_id &&
      payload.teaching_language_id,
  );
}

function offeringPayloadComplete(payload: Partial<TeachingOfferingCreatePayload>): boolean {
  return Boolean(
    payload.school_id &&
      payload.academic_year_id &&
      payload.level_id &&
      payload.subject_id &&
      payload.teaching_language_id,
  );
}

describe('Teaching Planning Create/Edit payload contracts', () => {
  it('requires Reference identity fields and keeps ISBN/code as plain strings', () => {
    const incomplete: TeachingReferenceCreatePayload = {
      name: '',
      school_id: 1,
      level_id: 2,
      subject_id: 3,
      teaching_language_id: 4,
    };
    expect(referencePayloadComplete(incomplete)).toBe(false);
    const complete: TeachingReferenceCreatePayload = {
      name: 'مرجع',
      school_id: 1,
      level_id: 2,
      subject_id: 3,
      teaching_language_id: 4,
      isbn: '978-1',
      reference_code: 'MATH-P6',
      track_id: null,
    };
    expect(referencePayloadComplete(complete)).toBe(true);
    expect(complete).not.toHaveProperty('class_id');
    expect(complete).not.toHaveProperty('teacher_id');
  });

  it('requires Offering identity without class/teacher and allows optional track/reference/dates', () => {
    const incomplete: TeachingOfferingCreatePayload = {
      school_id: 1,
      academic_year_id: 0,
      level_id: 3,
      subject_id: 4,
      teaching_language_id: 5,
    };
    expect(offeringPayloadComplete(incomplete)).toBe(false);
    const complete: TeachingOfferingCreatePayload = {
      school_id: 1,
      academic_year_id: 2,
      level_id: 3,
      subject_id: 4,
      teaching_language_id: 5,
      track_id: 9,
      reference_id: 12,
      effective_from: '2026-09-01',
      effective_to: '2027-06-30',
      notes: 'note',
    };
    expect(offeringPayloadComplete(complete)).toBe(true);
    expect(complete).not.toHaveProperty('class_id');
    expect(complete).not.toHaveProperty('teacher_id');
  });
});
