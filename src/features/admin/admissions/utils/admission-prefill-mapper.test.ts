import { describe, expect, it } from 'vitest';
import { mapAdmissionPrefillToStudentProfile } from './admission-prefill-mapper';
import { buildStudentCreatePayload, defaultStudentProfileFormState } from '@/features/admin/students/utils/student-profile';
import type { AdmissionPrefill } from '@/types/admission';

const prefill: AdmissionPrefill = {
  student: {
    first_name: 'QA',
    last_name: 'Test Child',
  },
  guardian: {
    name: 'QA Guardian',
    phone: '0612345678',
    relationship: 'father',
    email: 'guardian@example.com',
  },
  academic: {},
  admission: {},
};

describe('mapAdmissionPrefillToStudentProfile — guardian phone isolation', () => {
  it('maps guardian phone to emergency contact fields only, not student phone/mobile', () => {
    const patch = mapAdmissionPrefillToStudentProfile(prefill);

    expect(patch.emergencyContactName).toBe('QA Guardian');
    expect(patch.emergencyPhone).toBe('0612345678');
    expect(patch.emergencyRelationship).toBe('father');
    expect(patch.phone).toBeUndefined();
    expect(patch.mobile).toBeUndefined();
    expect(patch.email).toBeUndefined();
    expect(patch.guardianEmail).toBe('guardian@example.com');
  });
});

describe('buildStudentCreatePayload — admission prefill wizard scope', () => {
  it('does not send guardian phone as student phone/mobile or emergency_phone when guardian contact is deferred', () => {
    const base = defaultStudentProfileFormState(null);
    const state = {
      ...base,
      ...mapAdmissionPrefillToStudentProfile(prefill),
      firstName: 'QA',
      lastName: 'Test Child',
    };

    const payload = buildStudentCreatePayload(state, null, { deferGuardianContact: true });

    expect(payload.phone).toBeUndefined();
    expect(payload.mobile).toBeUndefined();
    expect(payload.email).toBeUndefined();
    expect(payload.emergency_phone).toBeUndefined();
    expect(payload.emergency_contact_name).toBeUndefined();
    expect(payload.first_name).toBe('QA');
    expect(payload.last_name).toBe('Test Child');
  });

  it('still sends student phone/mobile when explicitly set by the user', () => {
    const base = defaultStudentProfileFormState(null);
    const state = {
      ...base,
      ...mapAdmissionPrefillToStudentProfile(prefill),
      firstName: 'QA',
      lastName: 'Test Child',
      phone: '0620000000',
      mobile: '0630000000',
    };

    const payload = buildStudentCreatePayload(state, null, { deferGuardianContact: true });

    expect(payload.phone).toBe('0620000000');
    expect(payload.mobile).toBe('0630000000');
    expect(payload.emergency_phone).toBeUndefined();
  });

  it('still sends student email when explicitly set by the user', () => {
    const base = defaultStudentProfileFormState(null);
    const state = {
      ...base,
      ...mapAdmissionPrefillToStudentProfile(prefill),
      firstName: 'QA',
      lastName: 'Test Child',
      email: 'student@example.com',
    };

    const payload = buildStudentCreatePayload(state, null, { deferGuardianContact: true });

    expect(payload.email).toBe('student@example.com');
    expect(payload.phone).toBeUndefined();
    expect(payload.mobile).toBeUndefined();
  });
});
