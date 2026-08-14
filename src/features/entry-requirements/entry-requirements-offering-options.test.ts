import { describe, expect, it } from 'vitest';

import type { TeachingOfferingChoice } from '@/features/entry-requirements/entry-requirements-contract';
import {
  approvedTeachingOfferings,
  teachingOfferingSubjects,
  teachingOfferingsForSubject,
} from './entry-requirements-offering-options';

function offering(
  id: number,
  subjectId: number,
  subject: string,
  title: string,
  status: string | null = 'approved',
): TeachingOfferingChoice {
  return {
    id,
    academic_year_id: 2026,
    academic_year: '2026-2027',
    level_id: 6,
    level: 'السادس ابتدائي',
    subject_id: subjectId,
    subject,
    teaching_language_id: 1,
    language: 'العربية',
    track_id: null,
    track: null,
    state: 'active',
    reference: {
      id: id + 100,
      title,
      publisher: null,
      edition: null,
      isbn: null,
      status,
    },
  };
}

describe('entry requirement teaching offering options', () => {
  it('derives subjects only from approved offerings already scoped by year and level', () => {
    const rows = [
      offering(1, 11, 'اللغة العربية', 'كتابي في اللغة العربية'),
      offering(2, 12, 'الرياضيات', 'المفيد في الرياضيات'),
      offering(3, 11, 'اللغة العربية', 'مرجع عربي ثان'),
      offering(4, 13, 'الفرنسية', 'Mes apprentissages', 'draft'),
    ];

    expect(approvedTeachingOfferings(rows).map((row) => row.id)).toEqual([1, 2, 3]);
    expect(teachingOfferingSubjects(rows)).toEqual([
      { id: 11, name: 'اللغة العربية' },
      { id: 12, name: 'الرياضيات' },
    ]);
  });

  it('returns only approved offerings for the selected subject', () => {
    const rows = [
      offering(1, 11, 'اللغة العربية', 'ب'),
      offering(2, 11, 'اللغة العربية', 'أ'),
      offering(3, 12, 'الرياضيات', 'ج'),
    ];

    expect(teachingOfferingsForSubject(rows, 11).map((row) => row.id)).toEqual([2, 1]);
    expect(teachingOfferingsForSubject(rows, '')).toEqual([]);
  });
});
