import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentsDir = join(
  process.cwd(),
  'src',
  'features',
  'admin',
  'student-finance',
  'components',
);

const css = readFileSync(join(componentsDir, 'agreement-amendment-studio.css'), 'utf8');
const autoPreviewSource = readFileSync(
  join(componentsDir, 'use-agreement-amendment-auto-preview.ts'),
  'utf8',
);

describe('Finance Amendment Studio live-preview layout contract', () => {
  it('keeps a compact two-column drawer before and after backend preview', () => {
    expect(css).toContain('width: min(1040px, calc(100vw - 48px))');
    expect(css).toContain(
      '.academic-setup-drawer__body:has(> .student-finance-amendment-form)',
    );
    expect(css).toContain(
      '.academic-setup-drawer__body:not(:has(> .student-finance-amendment-preview))::after',
    );
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  });

  it('removes the manual Preview action while preserving the Apply action slot', () => {
    expect(css).toContain("button[type='submit']");
    expect(css).toContain('display: none');
    expect(css).toContain("button[type='button']");
  });

  it('requests preview automatically after form input/change and guards busy preview state', () => {
    expect(autoPreviewSource).toContain("form.addEventListener('input'");
    expect(autoPreviewSource).toContain("form.addEventListener('change'");
    expect(autoPreviewSource).toContain('form.requestSubmit()');
    expect(autoPreviewSource).toContain('submitter?.disabled');
    expect(autoPreviewSource).toContain('BUSY_RETRY_DELAY_MS');
  });
});
