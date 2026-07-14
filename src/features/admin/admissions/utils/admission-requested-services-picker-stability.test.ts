import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sectionSource = readFileSync(
  resolve(__dirname, '../components/admission-requested-services-section.tsx'),
  'utf8',
);

describe('admission requested-services picker stability contract', () => {
  it('exposes stable edit / editor / save test ids for one-click UI automation', () => {
    expect(sectionSource).toContain('data-testid="admission-requested-services-edit"');
    expect(sectionSource).toContain('data-testid="admission-requested-services-editor"');
    expect(sectionSource).toContain('data-testid="admission-requested-services-save"');
    expect(sectionSource).toContain('data-testid="admission-requested-services-cancel"');
  });

  it('prefetches catalog before edit and keeps editor shell while loading', () => {
    expect(sectionSource).toContain('fetchAdmissionRequestedServices');
    expect(sectionSource).toContain('catalogLoading');
    expect(sectionSource).toContain('admission-requested-services-picker--loading');
    expect(sectionSource).toContain('editorRef.current.focus');
  });

  it('does not gate the editor shell on catalog completion', () => {
    // Editor region mounts on editing; picker/loading lives inside.
    expect(sectionSource).toMatch(
      /editing && editable \?[\s\S]*admission-requested-services-editor/,
    );
  });
});
