import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('MobileBottomSheet history contract', () => {
  const sheet = source('src/components/ui/mobile-bottom-sheet.tsx');

  it('removes the synthetic sheet history entry only when still on the opening URL', () => {
    expect(sheet).toContain('const openedHref = window.location.href');
    expect(sheet).toContain('if (window.location.href === openedHref)');
    expect(sheet).toContain('history.back()');
  });

  it('does not make sheet cleanup blindly undo intentional in-sheet navigation', () => {
    expect(sheet).not.toContain(
      'if (historyPushedRef.current) {\n        historyPushedRef.current = false;\n        history.back();',
    );
  });
});
