import { describe, expect, it } from 'vitest';
import type { SiblingLine } from '@/types/sibling-line';
import {
  buildSiblingLinesAppendOnlyPayload,
  buildStudentEditUpdatePayload,
  filterStudentEditPayloadBySection,
  hasForbiddenStudentUpdateKeys,
  pickStudentEditSectionPayload,
  STUDENT_UPDATE_FORBIDDEN_KEYS,
} from './student-edit-payload';
import { defaultStudentProfileFormState } from './student-profile';
import type { StudentOptions } from '@/types/student-360';

const options: StudentOptions = {
  genders: [{ value: 'male', label: 'Male' }],
  studentStatuses: [{ value: 'active', label: 'Active' }],
  registrationTypes: [{ value: 'new', label: 'New' }],
  emergencyRelationships: [{ value: 'father', label: 'Father' }],
  documentTypes: [],
  documentStates: [],
  bloodTypes: [],
  nationalities: [{ id: 136, name: 'Morocco', code: 'MA' }],
  schools: [{ id: 3, name: 'School A' }],
  academicYears: [{ id: 1, name: '2025-2026' }],
  levels: [{ id: 77, name: 'P1', code: 'P1' }],
  classes: [{ id: 2053, name: 'P1A', level: { id: 77, name: 'P1', code: 'P1' } }],
};

const baseline = defaultStudentProfileFormState(options);

describe('buildStudentEditUpdatePayload', () => {
  it('omits readonly and forbidden keys from update payload', () => {
    const current = {
      ...baseline,
      firstName: 'Youssef',
      phone: '0612345678',
    };
    const payload = buildStudentEditUpdatePayload(current, baseline, []);
    expect(payload.first_name).toBe('Youssef');
    expect(payload.phone).toBe('0612345678');
    expect(hasForbiddenStudentUpdateKeys(payload)).toEqual([]);
    for (const key of ['level_id', 'academic_year_id', 'school_id', 'guardian_relationship_ids']) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it('does not include health fields in main student update', () => {
    const current = { ...baseline, notes: 'ملاحظة إدارية' };
    const payload = buildStudentEditUpdatePayload(current, baseline, []) as Record<string, unknown>;
    expect(payload.blood_type).toBeUndefined();
    expect(payload.has_allergies).toBeUndefined();
    expect(payload.doctor_name).toBeUndefined();
    expect(payload.notes).toBe('ملاحظة إدارية');
  });

  it('does not include guardian relationship ids', () => {
    const payload = buildStudentEditUpdatePayload(
      { ...baseline, guardianEmail: 'parent@example.com' },
      baseline,
      [],
    ) as Record<string, unknown>;
    expect(payload.guardian_relationship_ids).toBeUndefined();
    expect(payload.parent_ids).toBeUndefined();
    expect(payload.guardianEmail).toBeUndefined();
  });

  it('filters payload by section', () => {
    const current = {
      ...baseline,
      firstName: 'Ali',
      massarCode: 'G412252321',
      phone: '0700000000',
    };
    const full = buildStudentEditUpdatePayload(current, baseline, []);
    const personal = filterStudentEditPayloadBySection(full, 'personal');
    expect(personal.first_name).toBe('Ali');
    expect(personal.phone).toBe('0700000000');
    expect(personal.massar_code).toBeUndefined();

    const identity = pickStudentEditSectionPayload(current, baseline, [], 'identity');
    expect(identity.massar_code).toBe('G412252321');
    expect(identity.first_name).toBeUndefined();
  });
});

describe('buildSiblingLinesAppendOnlyPayload', () => {
  const original: SiblingLine[] = [
    { name: 'Sara', relationship: 'sister', sequence: 1 },
  ];

  it('returns only newly appended lines', () => {
    const current: SiblingLine[] = [
      ...original,
      { name: 'Omar', relationship: 'brother', sequence: 2 },
    ];
    const appended = buildSiblingLinesAppendOnlyPayload(current, original);
    expect(appended).toHaveLength(1);
    expect(appended?.[0].name).toBe('Omar');
  });

  it('returns undefined when existing lines were modified', () => {
    const current: SiblingLine[] = [
      { name: 'Sara Updated', relationship: 'sister', sequence: 1 },
    ];
    expect(buildSiblingLinesAppendOnlyPayload(current, original)).toBeUndefined();
  });

  it('does not treat sibling_lines as full replacement in edit payload', () => {
    const current = {
      ...baseline,
      hasSiblings: true,
      siblingLines: [
        ...original,
        { name: 'Omar', relationship: 'brother', sequence: 2 },
      ],
    };
    const originalState = { ...baseline, hasSiblings: true, siblingLines: original };
    const payload = buildStudentEditUpdatePayload(current, originalState, original);
    expect(payload.sibling_lines).toHaveLength(1);
    expect(payload.sibling_lines?.[0].name).toBe('Omar');
  });

  it('omits sibling_lines when only existing lines were removed', () => {
    const current = { ...baseline, hasSiblings: false, siblingLines: [] };
    const originalState = { ...baseline, hasSiblings: true, siblingLines: original };
    const payload = buildStudentEditUpdatePayload(current, originalState, original);
    expect(payload.sibling_lines).toBeUndefined();
  });
});

describe('STUDENT_UPDATE_FORBIDDEN_KEYS', () => {
  it('documents health and guardian keys as forbidden', () => {
    expect(STUDENT_UPDATE_FORBIDDEN_KEYS).toContain('blood_type');
    expect(STUDENT_UPDATE_FORBIDDEN_KEYS).toContain('guardian_relationship_ids');
    expect(STUDENT_UPDATE_FORBIDDEN_KEYS).toContain('image_1920');
  });
});
