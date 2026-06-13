import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const levelGroupPath = resolve(
  'src/features/admin/academic-setup/components/level-class-group.tsx',
);
const cssPath = resolve('src/features/admin/academic-setup/academic-setup-ui.css');

function readLevelGroupSource() {
  return readFileSync(levelGroupPath, 'utf8');
}

describe('level and class visual hierarchy', () => {
  it('renders class rail only when the level is open and has classes', () => {
    const tsx = readLevelGroupSource();
    expect(tsx).toMatch(/open && hasClasses[\s\S]*academic-level-card__body/);
    expect(tsx).toMatch(/academic-level-card__classes-rail[\s\S]*group\.classes\.map/);
    expect(tsx).not.toMatch(/academic-level-card__classes-rail[\s\S]*!hasClasses/);
  });

  it('keeps empty-level hint outside the class rail', () => {
    const tsx = readLevelGroupSource();
    expect(tsx).toMatch(/!hasClasses[\s\S]*academic-level-card__empty-hint/);
    expect(tsx).toMatch(/hasClasses \?[\s\S]*academic-level-card__toggle/);
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

  it('defines parent accent and nested rail connectors in CSS', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain('.academic-level-card::before');
    expect(css).toContain('.academic-level-card__classes-rail::before');
    expect(css).toContain('.academic-class-card::before');
    expect(css).toMatch(/inset-inline-start:\s*0/);
    expect(css).toMatch(/\.academic-level-card__title[\s\S]*font-size:\s*16px/);
    expect(css).toMatch(/\.academic-class-card__name[\s\S]*font-size:\s*13px/);
  });

  it('opens level action menu downward to avoid header clipping', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toMatch(/\.academic-level-card__actions \.academic-setup-level-actions__menu[\s\S]*top:\s*calc\(100% \+ 4px\)/);
    expect(css).toMatch(/\.academic-level-card__header[\s\S]*overflow:\s*visible/);
    expect(css).toContain('.academic-level-card:has(.academic-setup-level-actions__menu)');
  });

  it('opens class action menu downward and keeps level body overflow visible', () => {
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toMatch(/\.academic-class-card \.academic-setup-level-actions__menu[\s\S]*top:\s*calc\(100% \+ 4px\)/);
    expect(css).toMatch(/\.academic-level-card__body[\s\S]*overflow:\s*visible/);
    expect(css).toContain('.academic-class-card:has(.academic-setup-level-actions__menu)');
  });
});
