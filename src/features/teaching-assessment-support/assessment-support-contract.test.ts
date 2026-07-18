import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import {
  TEACHING_ASSESSMENT_SUPPORT_ADMIN_SUMMARY_CAPABILITY,
  TEACHING_SUPPORT_INDIVIDUAL_DETAIL_CAPABILITY,
  canSeeAssessmentSupportIndividualDetail,
  canSeeAssessmentSupportSummary,
} from '@/lib/permissions/teaching-planning';
import type { CurrentUser } from '@/types/user';

function user(caps: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'admin@test.local',
    role: 'admin',
    effective_capabilities: caps,
    permissions: [],
    school: { id: 1, name: 'School' },
  } satisfies CurrentUser;
}

describe('assessment support Odoo 221 endpoints', () => {
  it('registers teacher and admin routes from contract', () => {
    expect(endpoints.teacher.teachingLearningObjectives).toBe(
      '/teacher/teaching/learning-objectives',
    );
    expect(endpoints.teacher.teachingMasteryMatrix).toBe('/teacher/teaching/mastery-matrix');
    expect(endpoints.teacher.teachingMasteryMatrixBatch).toBe(
      '/teacher/teaching/mastery-matrix/batch',
    );
    expect(endpoints.teacher.teachingDifficulties).toBe('/teacher/teaching/difficulties');
    expect(endpoints.teacher.teachingSupportPlans).toBe('/teacher/teaching/support-plans');
    expect(endpoints.teacher.teachingReassessments).toBe('/teacher/teaching/reassessments');
    expect(endpoints.admin.teachingAssessmentSupportSummary).toBe(
      '/admin/teaching/assessment-support/summary',
    );
    expect(endpoints.admin.teachingAssessmentSupportStudent(9)).toBe(
      '/admin/teaching/assessment-support/students/9',
    );
  });

  it('separates admin summary and individual detail capabilities', () => {
    expect(canSeeAssessmentSupportSummary(user([TEACHING_ASSESSMENT_SUPPORT_ADMIN_SUMMARY_CAPABILITY]))).toBe(
      true,
    );
    expect(canSeeAssessmentSupportIndividualDetail(user([TEACHING_ASSESSMENT_SUPPORT_ADMIN_SUMMARY_CAPABILITY]))).toBe(
      false,
    );
    expect(
      canSeeAssessmentSupportIndividualDetail(user([TEACHING_SUPPORT_INDIVIDUAL_DETAIL_CAPABILITY])),
    ).toBe(true);
  });

  it('documents semantic guards in types', () => {
    const types = readFileSync(
      join(process.cwd(), 'src/types/teaching-assessment-support.ts'),
      'utf8',
    );
    expect(types).toContain('Observation ≠ Gradebook');
    expect(types).toContain('Difficulty is manual');
    expect(types).toContain('Support Decision / Plan do not mutate Curriculum Progress');
    expect(types).toContain('Reassessment preserves the original observation');
  });

  it('keeps parent/student portals out of assessment-support routes', () => {
    const teacherPage = readFileSync(
      join(
        process.cwd(),
        'src/features/teacher/teaching-assessment-support/components/teacher-assessment-support-page.tsx',
      ),
      'utf8',
    );
    expect(teacherPage).not.toMatch(/\/parent\//);
    expect(teacherPage).not.toMatch(/\/student\//);
    expect(teacherPage).not.toMatch(/family/);
  });
});

describe('assessment support i18n parity', () => {
  it('keeps teachingAssessmentSupport leaf parity across ar/en/fr/es', () => {
    const locales = ['ar', 'en', 'fr', 'es'] as const;
    const trees = locales.map((locale) =>
      JSON.parse(readFileSync(join(process.cwd(), `messages/${locale}.json`), 'utf8')),
    );
    function leafKeys(obj: unknown, prefix = ''): string[] {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return [prefix];
      return entries.flatMap(([k, v]) =>
        leafKeys(v, prefix ? `${prefix}.${k}` : k),
      );
    }
    const rootKeys = leafKeys(trees[0].teachingAssessmentSupport).sort();
    const teacherKeys = leafKeys(trees[0].teacher.teachingAssessmentSupport).sort();
    const adminKeys = leafKeys(trees[0].admin.teachingPlanning.assessmentSupport).sort();
    for (const tree of trees.slice(1)) {
      expect(leafKeys(tree.teachingAssessmentSupport).sort()).toEqual(rootKeys);
      expect(leafKeys(tree.teacher.teachingAssessmentSupport).sort()).toEqual(teacherKeys);
      expect(leafKeys(tree.admin.teachingPlanning.assessmentSupport).sort()).toEqual(adminKeys);
      expect(tree.admin.teachingPlanning.hub.assessmentSupportTitle).toBeTruthy();
    }
  });
});
