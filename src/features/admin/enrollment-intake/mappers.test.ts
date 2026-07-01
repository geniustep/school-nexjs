import { describe, expect, it } from 'vitest';
import { patchStudentProfileFromIntake } from './mappers';

describe('patchStudentProfileFromIntake — guardian phone', () => {
  it('updates emergencyPhone without copying guardian phone to student mobile', () => {
    const patch = patchStudentProfileFromIntake({ guardianPhone: '0612345678' });

    expect(patch.emergencyPhone).toBe('0612345678');
    expect(patch.mobile).toBeUndefined();
    expect(patch.phone).toBeUndefined();
  });

  it('updates guardianEmail without copying to student email', () => {
    const patch = patchStudentProfileFromIntake({ guardianEmail: 'guardian@example.com' });

    expect(patch.guardianEmail).toBe('guardian@example.com');
    expect(patch.email).toBeUndefined();
  });
});
