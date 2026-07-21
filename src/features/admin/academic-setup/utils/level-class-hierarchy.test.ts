import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const levelGroupPath = resolve(
  'src/features/admin/academic-setup/components/level-class-group.tsx',
);
const panelPath = resolve(
  'src/features/admin/academic-setup/components/classes-level-panel.tsx',
);
const cssPath = resolve('src/features/admin/academic-setup/academic-setup-ui.css');

function readLevelGroupSource() {
  return readFileSync(levelGroupPath, 'utf8');
}

describe('level and class visual hierarchy', () => {
  it('renders class grid only when the selected level has classes', () => {
    const tsx = readLevelGroupSource();
    expect(tsx).toMatch(/hasClasses \?[\s\S]*academic-level-card__body/);
    expect(tsx).toMatch(/academic-classes-workspace__grid[\s\S]*group\.classes\.map/);
    expect(tsx).toContain('academic-classes-empty');
  });

  it('keeps empty-level hint outside the class grid', () => {
    const tsx = readLevelGroupSource();
    expect(tsx).toMatch(/academic-level-card__empty-hint/);
    expect(tsx).toContain('academic-classes-empty');
  });

  it('preserves level and class action entry points', () => {
    const tsx = readLevelGroupSource();
    expect(tsx).toContain('LevelClassActions');
    expect(tsx).toContain('ClassRowActions');
    expect(tsx).toContain('academic-level-card__add-btn');
    expect(tsx).toContain("t('common.view')");
    expect(tsx).toContain('classStatusLabel');
    expect(tsx).toContain('LEVEL_STATUS_TONE');
  });

  it('uses master-detail level chips on the classes panel', () => {
    const panel = readFileSync(panelPath, 'utf8');
    expect(panel).toContain('academic-classes-level-chip');
    expect(panel).toContain('ClassesLevelPanel');
    expect(panel).toContain('LevelClassGroup');
  });

  it('defines workspace accent and class card grid in CSS', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain('.academic-level-card::before');
    expect(css).toContain('.academic-classes-workspace__grid');
    expect(css).toContain('inset-inline-start: 0');
    expect(css).toMatch(/\.academic-level-card__title[\s\S]*font-size:\s*1\.05rem/);
    expect(css).toMatch(/\.academic-class-card__name[\s\S]*font-size:\s*14px/);
  });

  it('opens level action menu downward to avoid header clipping', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toMatch(
      /\.academic-level-card__actions \.academic-setup-level-actions__menu[\s\S]*top:\s*calc\(100% \+ 4px\)/,
    );
    expect(css).toMatch(/\.academic-level-card__header[\s\S]*overflow:\s*visible/);
    expect(css).toContain('.academic-level-card:has(.academic-setup-level-actions__menu)');
  });

  it('opens class action menu upward above sibling grid cards', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toMatch(
      /\.academic-class-card \.academic-setup-level-actions__menu[\s\S]*bottom:\s*calc\(100% \+ 4px\)/,
    );
    expect(css).toMatch(/\.academic-level-card__body[\s\S]*overflow:\s*visible/);
    expect(css).toContain('.academic-class-card:has(.academic-setup-level-actions__menu)');
  });
});
