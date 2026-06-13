import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('auto-setup wizard mount refresh', () => {
  it('reloads level options when wizard mounts', () => {
    const source = readFileSync(
      resolve('src/features/admin/academic-setup/components/auto-setup-wizard.tsx'),
      'utf8',
    );
    expect(source).toMatch(/optionsState\.reload\(\)/);
    expect(source).toContain('reconcileSelectedLevelIds');
  });
});
