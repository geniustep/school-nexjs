import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('auto-setup wizard data sync', () => {
  it('reconciles selection without mount reload loop', () => {
    const wizard = readFileSync(
      resolve('src/features/admin/academic-setup/components/auto-setup-wizard.tsx'),
      'utf8',
    );
    expect(wizard).toContain('reconcileSelectedLevelIds');
    expect(wizard).not.toMatch(
      /useEffect\(\(\) => \{[\s\S]*optionsState\.reload\(\)[\s\S]*\}, \[optionsState\.reload/,
    );
  });

  it('stabilizes level options reload callback', () => {
    const hook = readFileSync(
      resolve('src/features/admin/academic-setup/hooks/use-level-options.ts'),
      'utf8',
    );
    expect(hook).toMatch(/useCallback\(\(\) => state\.reload\(\), \[state\.reload\]\)/);
    expect(hook).toContain('useMemo');
  });
});
