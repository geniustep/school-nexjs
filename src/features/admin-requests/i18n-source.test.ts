import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const UI_FILES = [
  './components/admin-request-list-page.tsx',
  './components/admin-request-composer.tsx',
  './components/admin-request-detail-page.tsx',
  './components/admin-request-file-picker.tsx',
  './components/admin-request-appointment-panel.tsx',
  './components/admin-request-types-settings-page.tsx',
  './presenters.ts',
] as const;

describe('admin request visible-copy discipline', () => {
  it('keeps Arabic UI copy in the locale dictionary instead of hardcoding it in components', () => {
    for (const relativePath of UI_FILES) {
      const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
      expect(source, relativePath).not.toMatch(/\p{Script=Arabic}/u);
    }
  });
});
