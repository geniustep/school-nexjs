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
const densityCss = readFileSync(
  join(componentsDir, 'agreement-amendment-preview-density.css'),
  'utf8',
);
const annualSummaryCss = readFileSync(
  join(componentsDir, 'agreement-amendment-annual-summary.css'),
  'utf8',
);
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

  it('keeps the service chooser compact without an internal scrolling list', () => {
    expect(css).toContain('.student-finance-amendment-line-picker__list');
    expect(css).toContain('max-height: none');
    expect(css).toContain('overflow: visible');
    expect(css).toContain('.student-finance-amendment-line-picker__card--selected');
  });

  it('binds auto-preview when the drawer form actually mounts after being closed', () => {
    expect(autoPreviewSource).toContain(
      'const [formNode, setFormNode] = useState<HTMLFormElement | null>(null)',
    );
    expect(autoPreviewSource).toContain('const rootRef = useCallback((node: T | null) =>');
    expect(autoPreviewSource).toContain('setFormNode(findAmendmentForm(node))');
    expect(autoPreviewSource).toContain('if (!formNode) return');
    expect(autoPreviewSource).toContain("formNode.addEventListener('input'");
    expect(autoPreviewSource).toContain("formNode.addEventListener('change'");
  });

  it('requests preview automatically through the React submit handler without native submitter gates', () => {
    expect(autoPreviewSource).toContain(
      "dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))",
    );
    expect(autoPreviewSource).not.toContain('form.requestSubmit()');
    expect(autoPreviewSource).not.toContain('form.checkValidity()');
    expect(autoPreviewSource).not.toContain('submitter?.disabled');
    expect(autoPreviewSource).not.toContain('BUSY_RETRY_DELAY_MS');
  });

  it('keeps every preview section visible while reducing desktop card height', () => {
    expect(annualSummaryCss).toContain("@import './agreement-amendment-preview-density.css'");
    expect(densityCss).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))');
    expect(densityCss).toContain('.student-finance-amendment-live-preview__period-impacts');
    expect(densityCss).toContain(
      'grid-template-columns: minmax(72px, 0.8fr) minmax(145px, 1.45fr) minmax(82px, 0.75fr) auto',
    );
    expect(densityCss).toContain('.student-finance-amendment-annual-summary__services');
    expect(densityCss).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(densityCss).not.toContain('display: none');
  });
});
