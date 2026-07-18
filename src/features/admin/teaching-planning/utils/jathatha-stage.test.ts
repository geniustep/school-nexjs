import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TEACHING_PLANNING_COMING_SOON_CARDS,
  TEACHING_PLANNING_HUB_CARDS,
  TEACHING_PLANNING_IMPLEMENTED_HREFS,
  teachingPlanningComingSoonHasLiveRoute,
} from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { endpoints } from '@/lib/api/endpoints';
import { assertBffRoutePolicy, BFF_ADMIN_FAMILIES } from '@/lib/api/bff-route-policy';
import {
  normalizeJathathaContextResponse,
  normalizeJathathaReadiness,
  normalizeReferenceJathathaDetail,
  normalizeSessionOccurrenceSummary,
  normalizeTeacherJathathaDetail,
} from '@/features/admin/teaching-planning/utils/normalize-jathatha';
import { resolveTeacherJathathaPrimaryCta } from '@/features/teacher/jathatha/utils/jathatha-teacher-present';
import {
  canManageReferenceJathathas,
  canReviewTeacherJathathas,
  canSeeReferenceJathathas,
  canSeeTeacherJathathaReview,
  canViewTeachingPlanning,
  TEACHING_JATHATHAS_REVIEW_CAPABILITY,
  TEACHING_REFERENCE_JATHATHAS_MANAGE_CAPABILITY,
} from '@/lib/permissions/teaching-planning';
import type { CurrentUser } from '@/types/user';
import type { SessionOccurrenceSummary } from '@/types/jathatha';

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

describe('jathatha endpoints and BFF', () => {
  it('registers admin and teacher jathatha endpoint helpers', () => {
    expect(endpoints.admin.referenceJathathas).toBe('/admin/reference-jathathas');
    expect(endpoints.admin.referenceJathatha(12)).toBe('/admin/reference-jathathas/12');
    expect(endpoints.admin.referenceJathathaApprove(12)).toContain('/approve');
    expect(endpoints.admin.teacherJathathasAdmin).toBe('/admin/teacher-jathathas');
    expect(endpoints.admin.teacherJathathaRequestCorrection(9)).toContain('/request-correction');
    expect(endpoints.teacher.sessionOccurrences).toBe('/teacher/session-occurrences');
    expect(endpoints.teacher.sessionOccurrenceJathathaContext(3)).toBe(
      '/teacher/session-occurrences/3/jathatha-context',
    );
    expect(endpoints.teacher.jathathas).toBe('/teacher/jathathas');
    expect(endpoints.teacher.jathathaConfirm(4)).toContain('/confirm');
    expect(endpoints.teacher.jathathaCreateCorrection(4)).toContain('/create-correction');
  });

  it('allows jathatha families in BFF policy and keeps them bound', () => {
    expect(BFF_ADMIN_FAMILIES).toContain('reference-jathathas');
    expect(BFF_ADMIN_FAMILIES).toContain('teacher-jathathas');
    expect(assertBffRoutePolicy('/admin/reference-jathathas', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/teacher-jathathas/1/request-correction', 'POST').ok).toBe(
      true,
    );
    expect(assertBffRoutePolicy('/teacher/session-occurrences/1/jathatha-context', 'GET').ok).toBe(
      true,
    );
    expect(assertBffRoutePolicy('/teacher/jathathas/1/mark-ready', 'POST').ok).toBe(true);
    // Actual Delivery / Class Journal / Teaching Progress families are allowed —
    // the admin UI surfaces built on top of them are now implemented.
    expect(BFF_ADMIN_FAMILIES).toContain('actual-deliveries');
    expect(BFF_ADMIN_FAMILIES).toContain('class-journal');
    expect(assertBffRoutePolicy('/admin/actual-deliveries', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/class-journal', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/teaching-progress-summary', 'GET').ok).toBe(true);
  });
});

describe('jathatha normalization', () => {
  it('normalizes nested activities/phases and readiness from backend only', () => {
    const detail = normalizeReferenceJathathaDetail({
      id: 1,
      name: 'Ref J',
      school: { id: 1, name: 'S' },
      reference: { id: 2, name: 'Book' },
      sequence: { id: 3, name: 'Seq' },
      session_template: { id: 4, name: 'Tpl' },
      level: { id: 5, name: 'L' },
      subject: { id: 6, name: 'Math' },
      default_detail_level: 'standard',
      activity_count: 1,
      phase_count: 1,
      planned_duration_minutes: 45,
      state: 'draft',
      version_label: 'v1',
      approved_at: null,
      readiness: { ready: false, blockers: ['jathatha_not_ready'], warnings: ['soft'] },
      activities: [
        {
          sequence_order: 1,
          name: 'Warmup',
          activity_type: 'situation',
          planned_duration_minutes: 10,
          phases: [
            {
              sequence_order: 1,
              phase_type: 'action',
              planned_duration_minutes: 5,
              instruction: 'Do',
            },
          ],
        },
      ],
      allowed_actions: { edit: true, approve: false },
    });
    expect(detail?.activities).toHaveLength(1);
    expect(detail?.activities[0].phases).toHaveLength(1);
    expect(detail?.readiness?.ready).toBe(false);
    expect(detail?.readiness?.blockers).toEqual(['jathatha_not_ready']);
    expect(normalizeJathathaReadiness({ ready: true, blockers: [], warnings: [] })?.ready).toBe(
      true,
    );
    expect(normalizeJathathaReadiness(null)).toBeNull();
  });

  it('extends session occurrence with jathatha fields and context', () => {
    const occurrence = normalizeSessionOccurrenceSummary({
      id: 10,
      date: '2026-07-13',
      start_time: '08:00',
      end_time: '09:00',
      state: 'planned',
      class: { id: 1, name: '6A' },
      subject: { id: 2, name: 'Math' },
      teacher: { id: 3, name: 'T' },
      current_jathatha_id: 77,
      jathatha_state: 'draft',
      jathatha_review_state: 'not_reviewed',
      jathatha_summary: 'Draft prep',
      allowed_actions: { view_jathatha: true, create_jathatha: false },
    });
    expect(occurrence?.current_jathatha_id).toBe(77);
    expect(occurrence?.allowed_actions?.view_jathatha).toBe(true);

    const teacher = normalizeTeacherJathathaDetail({
      id: 77,
      state: 'draft',
      review_state: 'not_reviewed',
      revision_number: 1,
      detail_level: 'compact',
      planned_duration_minutes: 45,
      activities: [],
      attachment_ids: [],
      blockers: [],
      warnings: [],
      session_occurrence: occurrence,
      teacher: { id: 3, name: 'T' },
      class: { id: 1, name: '6A' },
      subject: { id: 2, name: 'Math' },
      offering: { id: 8, name: 'Off' },
      distribution: { id: 9, name: 'Dist' },
      distribution_line: { id: 11, name: 'Line' },
      sequence: null,
      session_template: null,
      reference_jathatha: null,
      readiness: { ready: false, blockers: [], warnings: [] },
      allowed_actions: { edit: true, mark_ready: true },
      revisions: [{ id: 77, revision_number: 1, state: 'draft', is_current: true }],
    });
    expect(teacher?.revisions?.[0].is_current).toBe(true);

    const context = normalizeJathathaContextResponse({
      occurrence,
      assignment: { id: 1, name: 'A' },
      offering: { id: 8, name: 'Off' },
      active_distribution: { id: 9, name: 'Dist' },
      candidate_distribution_lines: [
        { id: 11, name: 'Line', item_type: 'sequence', recommended: true },
      ],
      candidate_session_templates: [{ id: 4, name: 'Tpl', recommended: true }],
      approved_reference_jathatha: null,
      current_teacher_jathatha: null,
      readiness: { ready: false, blockers: ['jathatha_distribution_line_required'], warnings: [] },
      blockers: ['jathatha_distribution_line_required'],
      warnings: [],
      allowed_actions: { create: true },
    });
    expect(context?.candidate_distribution_lines[0].recommended).toBe(true);
    expect(context?.candidate_session_templates).toHaveLength(1);
    expect(context?.blockers).toContain('jathatha_distribution_line_required');
  });
});

describe('teacher today CTA', () => {
  const base: SessionOccurrenceSummary = {
    id: 1,
    date: '2026-07-13',
    start_time: '08:00',
    end_time: '09:00',
    state: 'planned',
    class: { id: 1, name: '6A' },
    subject: { id: 2, name: 'Math' },
    teacher: { id: 3, name: 'T' },
  };

  it('never invents actions without allowed_actions', () => {
    expect(resolveTeacherJathathaPrimaryCta(base)).toBeNull();
  });

  it('maps create/view CTAs from backend actions and states', () => {
    expect(
      resolveTeacherJathathaPrimaryCta({
        ...base,
        allowed_actions: { create_jathatha: true },
      })?.labelKey,
    ).toBe('teacher.jathatha.prepare');
    expect(
      resolveTeacherJathathaPrimaryCta({
        ...base,
        current_jathatha_id: 5,
        jathatha_state: 'draft',
        allowed_actions: { view_jathatha: true },
      })?.labelKey,
    ).toBe('teacher.jathatha.continue');
    expect(
      resolveTeacherJathathaPrimaryCta({
        ...base,
        current_jathatha_id: 5,
        jathatha_state: 'ready',
        allowed_actions: { view_jathatha: true },
      })?.labelKey,
    ).toBe('teacher.jathatha.review');
    expect(
      resolveTeacherJathathaPrimaryCta({
        ...base,
        current_jathatha_id: 5,
        jathatha_state: 'confirmed',
        jathatha_review_state: 'correction_requested',
        allowed_actions: { create_correction: true, view_jathatha: true },
      })?.labelKey,
    ).toBe('teacher.jathatha.createCorrection');
  });
});

describe('jathatha permissions and hub cards', () => {
  it('gates reference and review capabilities', () => {
    expect(canManageReferenceJathathas(user([TEACHING_REFERENCE_JATHATHAS_MANAGE_CAPABILITY]))).toBe(
      true,
    );
    expect(canReviewTeacherJathathas(user([TEACHING_JATHATHAS_REVIEW_CAPABILITY]))).toBe(true);
    expect(canSeeReferenceJathathas(user(['teaching.planning.view']))).toBe(true);
    expect(canSeeTeacherJathathaReview(user([TEACHING_JATHATHAS_REVIEW_CAPABILITY]))).toBe(true);
    expect(canViewTeachingPlanning(user([TEACHING_REFERENCE_JATHATHAS_MANAGE_CAPABILITY]))).toBe(
      true,
    );
    expect(canManageReferenceJathathas(user(['staff.view']))).toBe(false);
  });

  it('exposes live jathatha, delivery, journal and progress hub cards with no coming-soon left', () => {
    const hrefs = TEACHING_PLANNING_HUB_CARDS.map((c) => c.href);
    expect(hrefs).toContain('/admin/teaching-planning/reference-jathathas');
    expect(hrefs).toContain('/admin/teaching-planning/teacher-jathathas');
    expect(hrefs).toContain('/admin/teaching-planning/actual-deliveries');
    expect(hrefs).toContain('/admin/teaching-planning/class-journal');
    expect(hrefs).toContain('/admin/teaching-planning/progress');
    expect(hrefs).toContain('/admin/teaching-planning/assessment-support');
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain(
      '/admin/teaching-planning/reference-jathathas',
    );
    expect(TEACHING_PLANNING_IMPLEMENTED_HREFS).toContain(
      '/admin/teaching-planning/assessment-support',
    );
    expect(teachingPlanningComingSoonHasLiveRoute()).toBe(false);
    expect(TEACHING_PLANNING_COMING_SOON_CARDS).toHaveLength(0);
  });
});

describe('jathatha semantic safety', () => {
  it('documents non-negotiable semantic distinctions and absence of delivery UI', () => {
    const types = readFileSync(join(process.cwd(), 'src/types/jathatha.ts'), 'utf8');
    expect(types).toContain('Reference Jathatha ≠ Teaching Reference');
    expect(types).toContain('Teacher Jathatha ≠ Reference Jathatha');
    expect(types).toContain('Teacher Jathatha ≠ Didactic Sequence Session Template');
    expect(types).toContain('Teacher Jathatha ≠ Actual Delivery Record');
    expect(types).toContain('Teacher Jathatha ≠ Class Teaching Journal');
    expect(types).toContain('Session Occurrence ≠ Weekly Slot');

    const present = readFileSync(
      join(
        process.cwd(),
        'src/features/admin/teaching-planning/utils/teaching-planning-present.ts',
      ),
      'utf8',
    );
    // Actual Delivery Review, Class Journal, and Teaching Progress are now implemented
    // admin surfaces (Backend-authored data only — admin never edits their content).
    expect(present).toContain('Actual Delivery Review, Class Journal, and Teaching Progress ARE implemented');

    const teacherEditor = readFileSync(
      join(process.cwd(), 'src/features/teacher/jathatha/components/teacher-jathatha-editor.tsx'),
      'utf8',
    );
    expect(teacherEditor).not.toMatch(/actual\.delivery|class.?teaching.?journal|teaching.?progress/i);

    const context = readFileSync(
      join(process.cwd(), 'src/features/teacher/jathatha/components/jathatha-context-step.tsx'),
      'utf8',
    );
    expect(context).toMatch(/templateId|setTemplateId|sessionTemplate/);
    expect(context).not.toMatch(/setTemplateId\(.*recommended/);

    const normalizer = readFileSync(
      join(
        process.cwd(),
        'src/features/admin/teaching-planning/utils/normalize-jathatha.ts',
      ),
      'utf8',
    );
    expect(normalizer).not.toMatch(/ready\s*=\s*(true|false)/);
  });
});

describe('jathatha i18n parity', () => {
  it('keeps admin.teachingPlanning.jathatha and teacher.jathatha key parity', () => {
    function flatten(obj: unknown, prefix = ''): string[] {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
          flatten(v, prefix ? `${prefix}.${k}` : k),
        );
      }
      return [prefix];
    }
    const locales = ['ar', 'en', 'fr', 'es'] as const;
    const adminKeys = locales.map((locale) => {
      const raw = JSON.parse(
        readFileSync(join(process.cwd(), `messages/${locale}.json`), 'utf8'),
      );
      return flatten(raw.admin.teachingPlanning.jathatha).sort();
    });
    const teacherKeys = locales.map((locale) => {
      const raw = JSON.parse(
        readFileSync(join(process.cwd(), `messages/${locale}.json`), 'utf8'),
      );
      return flatten(raw.teacher.jathatha).sort();
    });
    for (let i = 1; i < locales.length; i += 1) {
      expect(adminKeys[i]).toEqual(adminKeys[0]);
      expect(teacherKeys[i]).toEqual(teacherKeys[0]);
    }
    expect(adminKeys[0]).toContain('reference.create');
    expect(teacherKeys[0]).toContain('weeklySlotPreview');
    expect(teacherKeys[0]).toContain('confirmImmutable');
  });
});
