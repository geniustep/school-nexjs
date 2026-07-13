import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Teacher Jathatha accessibility and resilient resource states', () => {
  it('keeps activities controls labelled, direction-aware, and announces duration overflow', () => {
    const activities = source('src/features/admin/teaching-planning/components/jathatha-activities-editor.tsx');
    expect(activities).toContain('aria-label');
    expect(activities).toContain('aria-expanded');
    expect(activities).toContain('dir="auto"');
    expect(activities).toContain('dir="ltr"');
    expect(activities).toContain('role="status"');
  });

  it('models initial loading separately from refetching for teacher session lists', () => {
    for (const path of [
      'src/features/teacher/jathatha/components/teacher-today-sessions.tsx',
      'src/features/teacher/jathatha/components/teacher-week-sessions.tsx',
    ]) {
      const component = source(path);
      expect(component).toContain('ResourceView');
      expect(component).toContain('initialLoading: loading && data === null');
      expect(component).toContain('fetching: loading && data !== null');
    }
  });

  it('leaves content editing out of the admin review detail', () => {
    const reviewDetail = source('src/features/admin/teaching-planning/components/teacher-jathatha-review-detail-view.tsx');
    expect(reviewDetail).not.toContain("t('common.edit')");
    expect(reviewDetail).not.toContain('t("common.edit")');
  });

  it('never derives the session template selection from a recommended candidate', () => {
    const context = source('src/features/teacher/jathatha/components/jathatha-context-step.tsx');
    expect(context).not.toMatch(/setTemplateId\(\s*(?:template|recommended)/);
    expect(context).toContain('setTemplateId(null)');
    expect(context).toContain('value={templateId ?? \'\'}');
  });
});
