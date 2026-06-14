import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('student-status-summary layout', () => {
  it('uses unified readiness checklist instead of status card grid', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/admin/students/components/student-status-summary.tsx'),
      'utf8',
    );

    expect(source).toContain('student-readiness__list');
    expect(source).not.toContain('student-status-summary__grid');
    expect(source).not.toContain('student-status-item card');
  });
});
