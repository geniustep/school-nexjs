import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('guardian detach relationship UI smoke', () => {
  it('uses detach terminology in student and parent detach flows', () => {
    const studentCard = readFileSync(
      resolve('src/features/admin/students/components/guardian-relationship-card.tsx'),
      'utf8',
    );
    const parentSection = readFileSync(
      resolve('src/features/admin/parents/components/parent-relationships-section.tsx'),
      'utf8',
    );
    const dialog = readFileSync(
      resolve('src/features/admin/students/components/guardian-remove-dialog.tsx'),
      'utf8',
    );
    const apiHelper = readFileSync(
      resolve('src/features/admin/students/utils/guardian-remove-relationship.ts'),
      'utf8',
    );

    expect(studentCard).toContain("t('admin.student360.detachRelationship')");
    expect(parentSection).toContain("t('admin.parentProfile.detachRelationship')");
    expect(parentSection).toContain('canDetachGuardianRelationship');
    expect(dialog).toContain('detachRelationshipTitle');
    expect(dialog).toContain('detachRelationshipSuccess');
    expect(dialog).toContain('detachRelationship409');
    expect(dialog).toContain('buildDetachRelationshipPayload');
    expect(dialog).not.toContain('removeGuardianFromStudent');
    expect(dialog).not.toContain('حذف الولي');
    expect(apiHelper).toContain('reason?: string');
    expect(apiHelper).toContain('studentGuardianRemove');
    expect(apiHelper).not.toContain('studentGuardianEnd');
  });
});
