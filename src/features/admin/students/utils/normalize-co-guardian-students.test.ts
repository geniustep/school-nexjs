import { describe, expect, it } from 'vitest';
import { normalizeCoGuardianStudentsResponse } from './normalize-co-guardian-students';

describe('normalizeCoGuardianStudentsResponse', () => {
  it('normalizes the candidate_count=2 sample (student 1552) and resolves shared guardian names', () => {
    const data = normalizeCoGuardianStudentsResponse({
      student_id: 1552,
      school_id: 3,
      guardians: [
        {
          guardian_id: 274,
          guardian_name: 'تجربة مستخدم',
          relationship: 'father',
          is_primary: false,
          other_students_count: 2,
          other_students: [
            { student_id: 854, display_name: 'عبد العزيز حميد', status: 'active' },
            { student_id: 1551, display_name: 'QA SETTLE', status: 'active' },
          ],
        },
      ],
      candidates: [
        {
          student_id: 854,
          display_name: 'عبد العزيز حميد',
          level_name: 'السادسة ابتدائي',
          class_name: 'P6A',
          status: 'active',
          shared_guardian_ids: [274],
          evidence: ['same_guardian'],
          is_confirmed_sibling: false,
        },
        {
          student_id: 1551,
          display_name: 'QA SETTLE',
          level_name: 'الأولى إعدادي',
          class_name: 'M1A',
          status: 'active',
          shared_guardian_ids: [274],
          evidence: ['same_guardian'],
          is_confirmed_sibling: false,
        },
      ],
      summary: { guardian_count: 1, candidate_count: 2 },
    });

    expect(data).not.toBeNull();
    expect(data!.summary.guardian_count).toBe(1);
    expect(data!.summary.candidate_count).toBe(2);
    expect(data!.candidates).toHaveLength(2);
    expect(data!.candidates[0].shared_guardian_names).toEqual(['تجربة مستخدم']);
    expect(data!.candidates.every((c) => c.is_confirmed_sibling === false)).toBe(true);
  });

  it('normalizes the empty guardian_count=0 sample (student 1924)', () => {
    const data = normalizeCoGuardianStudentsResponse({
      student_id: 1924,
      school_id: 3,
      guardians: [],
      candidates: [],
      summary: { guardian_count: 0, candidate_count: 0 },
    });

    expect(data).not.toBeNull();
    expect(data!.summary.guardian_count).toBe(0);
    expect(data!.summary.candidate_count).toBe(0);
    expect(data!.candidates).toHaveLength(0);
  });

  it('dedupes duplicate candidates by student_id and unions shared guardians/evidence', () => {
    const data = normalizeCoGuardianStudentsResponse({
      student_id: 1,
      school_id: 3,
      guardians: [
        { guardian_id: 10, guardian_name: 'Guardian A', other_students: [] },
        { guardian_id: 20, guardian_name: 'Guardian B', other_students: [] },
      ],
      candidates: [
        {
          student_id: 99,
          display_name: 'Child',
          shared_guardian_ids: [10],
          evidence: ['same_guardian'],
          is_confirmed_sibling: false,
        },
        {
          student_id: 99,
          display_name: 'Child',
          shared_guardian_ids: [20],
          evidence: ['confirmed_link'],
          is_confirmed_sibling: true,
        },
      ],
      summary: { guardian_count: 2, candidate_count: 2 },
    });

    expect(data!.candidates).toHaveLength(1);
    const merged = data!.candidates[0];
    expect(merged.shared_guardian_ids.sort()).toEqual([10, 20]);
    expect(merged.shared_guardian_names.sort()).toEqual(['Guardian A', 'Guardian B']);
    expect(merged.evidence.sort()).toEqual(['confirmed_link', 'same_guardian']);
    // merge keeps the confirmed flag if any duplicate is confirmed
    expect(merged.is_confirmed_sibling).toBe(true);
  });

  it('falls back to derived counts when summary is missing', () => {
    const data = normalizeCoGuardianStudentsResponse({
      student_id: 5,
      school_id: 3,
      guardians: [{ guardian_id: 1, guardian_name: 'G', other_students: [] }],
      candidates: [
        { student_id: 7, display_name: 'A', shared_guardian_ids: [1], evidence: [], is_confirmed_sibling: false },
      ],
    });

    expect(data!.summary.guardian_count).toBe(1);
    expect(data!.summary.candidate_count).toBe(1);
  });

  it('returns null for non-object payloads', () => {
    expect(normalizeCoGuardianStudentsResponse(null)).toBeNull();
    expect(normalizeCoGuardianStudentsResponse('nope')).toBeNull();
    expect(normalizeCoGuardianStudentsResponse(42)).toBeNull();
  });

  it('drops malformed guardian/candidate entries without ids', () => {
    const data = normalizeCoGuardianStudentsResponse({
      student_id: 1,
      school_id: 3,
      guardians: [{ guardian_name: 'no id' }, { guardian_id: 2, guardian_name: 'ok', other_students: [] }],
      candidates: [{ display_name: 'no id' }, { student_id: 8, shared_guardian_ids: [], evidence: [], is_confirmed_sibling: false }],
      summary: { guardian_count: 1, candidate_count: 1 },
    });

    expect(data!.guardians).toHaveLength(1);
    expect(data!.candidates).toHaveLength(1);
    expect(data!.candidates[0].student_id).toBe(8);
  });
});
