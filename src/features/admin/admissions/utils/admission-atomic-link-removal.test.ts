import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('atomic admission create path — no post-create link-student', () => {
  it('Student360CreatePage does not call linkAdmissionStudent after create', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/features/admin/students/components/student-360-shell.tsx'),
      'utf8',
    );
    expect(src).not.toContain('linkAdmissionStudent');
    expect(src).toContain('notifyAdmissionsQueriesInvalidated');
    expect(src).toContain('isAdmissionConverted');
    expect(src).toContain('fetchAdmission');
  });

  it('wizard create scope passes admissionId into student create payload', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/features/admin/students/components/student-create-wizard.tsx'),
      'utf8',
    );
    expect(src).toContain('admissionId: admissionBanner?.admissionId ?? null');
    expect(src).toContain('parseAdmissionConversionFromCreateResponse');
    expect(src).not.toMatch(/linkAdmissionStudent\s*\(/);
  });
});
