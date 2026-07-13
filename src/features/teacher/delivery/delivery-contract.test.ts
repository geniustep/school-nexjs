import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertBffRoutePolicy } from '@/lib/api/bff-route-policy';
import { endpoints } from '@/lib/api/endpoints';
import {
  canReviewActualDeliveries,
  canSeeActualDeliveryReview,
  canSeeClassJournal,
  canSeeTeachingProgress,
  canViewActualDeliveries,
  canViewClassJournal,
  canViewTeachingProgress,
  TEACHING_CLASS_JOURNAL_VIEW_CAPABILITY,
  TEACHING_DELIVERIES_REVIEW_CAPABILITY,
  TEACHING_DELIVERIES_VIEW_CAPABILITY,
  TEACHING_PROGRESS_VIEW_CAPABILITY,
} from '@/lib/permissions/teaching-planning';
import {
  defaultDeviationType,
  isSameDistributionLine,
  requiresDeviationReason,
  resolveTeacherDeliveryPrimaryCta,
  syncCompletionPercent,
} from '@/features/teacher/delivery/utils/delivery-teacher-present';
import {
  normalizeActualDeliveryDetail,
  normalizeClassJournalEntryDetail,
  normalizeDeliveryContextResponse,
  normalizeTeachingProgressSummary,
} from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';
import type { CurrentUser } from '@/types/user';
import type { SessionOccurrenceSummary } from '@/types/jathatha';

const root = process.cwd();
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

function user(caps: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    login: 'admin@test',
    role: 'admin',
    effective_capabilities: caps,
    permissions: [],
  } as CurrentUser;
}

function occurrence(overrides: Partial<SessionOccurrenceSummary> = {}): SessionOccurrenceSummary {
  return {
    id: 9,
    date: '2026-07-13',
    start_time: '09:00',
    end_time: '10:00',
    state: 'held',
    class: { id: 2, name: '6A' },
    subject: { id: 3, name: 'Math' },
    teacher: { id: 4, name: 'Ada' },
    allowed_actions: {},
    ...overrides,
  };
}

describe('delivery endpoints and BFF policy', () => {
  it('registers official teacher and admin delivery/journal/progress helpers', () => {
    expect(endpoints.teacher.sessionOccurrenceDeliveryContext(9)).toBe(
      '/teacher/session-occurrences/9/delivery-context',
    );
    expect(endpoints.teacher.actualDeliveries).toBe('/teacher/actual-deliveries');
    expect(endpoints.teacher.actualDeliveryConfirm(3)).toBe('/teacher/actual-deliveries/3/confirm');
    expect(endpoints.teacher.classJournal).toBe('/teacher/class-journal');
    expect(endpoints.teacher.teachingProgress).toBe('/teacher/teaching-progress');
    expect(endpoints.teacher.teachingProgressSummary).toBe('/teacher/teaching-progress-summary');
    expect(endpoints.admin.actualDeliveries).toBe('/admin/actual-deliveries');
    expect(endpoints.admin.actualDeliveryMarkReviewed(3)).toBe(
      '/admin/actual-deliveries/3/mark-reviewed',
    );
    expect(endpoints.admin.classJournal).toBe('/admin/class-journal');
    expect(endpoints.admin.teachingProgressLines).toBe('/admin/teaching-progress-lines');
    expect(endpoints.admin.teachingProgressSummary).toBe('/admin/teaching-progress-summary');
  });

  it('allows BFF families for delivery, journal and progress', () => {
    expect(assertBffRoutePolicy('/teacher/actual-deliveries', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/teacher/actual-deliveries/1/confirm', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/teacher/class-journal/2', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/teacher/teaching-progress-summary', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/teacher/session-occurrences/9/delivery-context', 'GET').ok).toBe(
      true,
    );
    expect(assertBffRoutePolicy('/admin/actual-deliveries', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/actual-deliveries/1/request-correction', 'POST').ok).toBe(
      true,
    );
    expect(assertBffRoutePolicy('/admin/class-journal', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/teaching-progress-lines', 'GET').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/teaching-progress-summary', 'GET').ok).toBe(true);
  });
});

describe('delivery normalization', () => {
  it('normalizes delivery context without inventing a delivered line', () => {
    const ctx = normalizeDeliveryContextResponse({
      occurrence: {
        id: 9,
        date: '2026-07-13',
        start_time: '09:00',
        end_time: '10:00',
        state: 'held',
        class: { id: 1, name: '6A' },
        subject: { id: 2, name: 'Math' },
        teacher: { id: 3, name: 'Ada' },
      },
      planned_distribution_line: { id: 10, name: 'Unit 1', sequence_order: 1 },
      remaining_distribution_lines: [
        { id: 10, name: 'Unit 1', sequence_order: 1 },
        { id: 11, name: 'Unit 2', sequence_order: 2, completed: true },
      ],
      current_delivery: null,
      readiness: { ready_for_confirmation: false, blockers: ['delivery_content_required'], warnings: [] },
      blockers: ['delivery_content_required'],
      warnings: [],
      allowed_actions: { create: true },
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.current_delivery).toBeNull();
    expect(ctx!.planned_distribution_line?.id).toBe(10);
    expect(ctx!.remaining_distribution_lines).toHaveLength(2);
    expect(ctx!.readiness?.ready_for_confirmation).toBe(false);
  });

  it('normalizes actual delivery detail with activities and revision defaults', () => {
    const detail = normalizeActualDeliveryDetail({
      id: 5,
      state: 'draft',
      review_state: 'not_reviewed',
      teacher: { id: 1, name: 'Ada' },
      class: { id: 2, name: '6A' },
      subject: { id: 3, name: 'Math' },
      offering: { id: 4, name: 'Offering' },
      activities: [
        {
          sequence_order: 1,
          name: 'Warm-up',
          result_state: 'completed',
          actual_duration_minutes: 10,
        },
      ],
      blockers: [],
      warnings: ['note'],
    });
    expect(detail?.id).toBe(5);
    expect(detail?.revision_no).toBe(0);
    expect(detail?.activities).toHaveLength(1);
    expect(detail?.activities[0].result_state).toBe('completed');
  });

  it('normalizes journal and progress as read-oriented payloads', () => {
    const journal = normalizeClassJournalEntryDetail({
      id: 7,
      state: 'current',
      teacher: { id: 1, name: 'Ada' },
      class: { id: 2, name: '6A' },
      subject: { id: 3, name: 'Math' },
      journal_text: 'Done',
      source_delivery_id: 5,
    });
    expect(journal?.state).toBe('current');
    expect(journal?.source_delivery_id).toBe(5);

    const summary = normalizeTeachingProgressSummary({
      coverage_percent: 42,
      planned_lines: 10,
      completed_lines: 3,
      delayed_lines: 1,
      next_remaining_lines: [{ id: 11, status: 'not_started', class: null, subject: null, offering: null }],
    });
    expect(summary?.coverage_percent).toBe(42);
    expect(summary?.next_remaining_lines).toHaveLength(1);
  });
});

describe('delivery present helpers', () => {
  it('never invents CTAs without allowed_actions', () => {
    expect(resolveTeacherDeliveryPrimaryCta(occurrence())).toBeNull();
  });

  it('maps create_delivery / draft continue / view confirmed from Backend actions', () => {
    expect(
      resolveTeacherDeliveryPrimaryCta(
        occurrence({ allowed_actions: { create_delivery: true } }),
      )?.labelKey,
    ).toBe('teacher.delivery.register');
    expect(
      resolveTeacherDeliveryPrimaryCta(
        occurrence({
          current_delivery_id: 5,
          delivery_state: 'draft',
          allowed_actions: { view_delivery: true },
        }),
      )?.labelKey,
    ).toBe('teacher.delivery.continue');
    expect(
      resolveTeacherDeliveryPrimaryCta(
        occurrence({
          current_delivery_id: 5,
          delivery_state: 'confirmed',
          allowed_actions: { view_delivery: true },
        }),
      )?.labelKey,
    ).toBe('teacher.delivery.view');
  });

  it('syncs completion percent with completion state', () => {
    expect(syncCompletionPercent('completed', 40)).toBe(100);
    expect(syncCompletionPercent('not_completed', 40)).toBe(0);
    expect(syncCompletionPercent('partial', 0)).toBe(1);
    expect(syncCompletionPercent('partial', 150)).toBe(99);
  });

  it('requires deviation reason only when planned ≠ delivered', () => {
    expect(isSameDistributionLine(10, 10)).toBe(true);
    expect(defaultDeviationType(10, 10)).toBe('none');
    expect(requiresDeviationReason(10, 10, 'none')).toBe(false);
    expect(defaultDeviationType(10, 11)).toBe('teacher_decision');
    expect(requiresDeviationReason(10, 11, 'teacher_decision')).toBe(true);
    expect(requiresDeviationReason(10, 11, 'none')).toBe(false);
  });
});

describe('delivery permissions', () => {
  it('gates admin capabilities without granting system admin implicitly', () => {
    const bare = user(['view_classes']);
    expect(canViewActualDeliveries(bare)).toBe(false);
    expect(canReviewActualDeliveries(bare)).toBe(false);
    expect(canViewClassJournal(bare)).toBe(false);
    expect(canViewTeachingProgress(bare)).toBe(false);
    expect(canSeeActualDeliveryReview(bare)).toBe(false);
    expect(canSeeClassJournal(bare)).toBe(false);
    expect(canSeeTeachingProgress(bare)).toBe(false);

    expect(canViewActualDeliveries(user([TEACHING_DELIVERIES_VIEW_CAPABILITY]))).toBe(true);
    expect(canReviewActualDeliveries(user([TEACHING_DELIVERIES_REVIEW_CAPABILITY]))).toBe(true);
    expect(canViewClassJournal(user([TEACHING_CLASS_JOURNAL_VIEW_CAPABILITY]))).toBe(true);
    expect(canViewTeachingProgress(user([TEACHING_PROGRESS_VIEW_CAPABILITY]))).toBe(true);
  });
});

describe('delivery semantic and route safety', () => {
  it('documents semantic guards on the delivery contract', () => {
    const types = source('src/types/teaching-delivery.ts');
    expect(types).toContain('Teacher Jathatha ≠ Actual Delivery Record');
    expect(types).toContain('Actual Delivery Record ≠ Class Teaching Journal Entry');
    expect(types).toContain('Class Teaching Journal Entry ≠ Teaching Progress');
    expect(types).toContain('Annual Distribution Line ≠ Actual Delivery Record');
    expect(types).toContain('Journal is generated and read-only');
    expect(types).toContain('Progress is derived and read-only');
  });

  it('keeps journal and progress surfaces read-only (no write UI)', () => {
    const journalFiles = [
      'src/features/teacher/delivery/components/teacher-class-journal-list.tsx',
      'src/features/teacher/delivery/components/teacher-class-journal-detail.tsx',
      'src/features/admin/teaching-planning/components/class-journal-list-page.tsx',
      'src/features/admin/teaching-planning/components/class-journal-detail-view.tsx',
    ];
    const progressFiles = [
      'src/features/teacher/delivery/components/teacher-teaching-progress-list.tsx',
      'src/features/teacher/delivery/components/teacher-teaching-progress-detail.tsx',
      'src/features/admin/teaching-planning/components/teaching-progress-list-page.tsx',
      'src/features/admin/teaching-planning/components/teaching-progress-detail-view.tsx',
    ];
    for (const path of [...journalFiles, ...progressFiles]) {
      expect(existsSync(resolve(root, path)), path).toBe(true);
      const text = source(path);
      expect(text).not.toMatch(/\b(onSave|createJournal|updateJournal|deleteJournal|recomputeProgress)\b/);
      expect(text).not.toMatch(/api\.(post|patch|put|delete)\(/i);
    }
  });

  it('keeps admin delivery review content read-only (no teacher content edit)', () => {
    const detail = source(
      'src/features/admin/teaching-planning/components/actual-delivery-review-detail-view.tsx',
    );
    expect(detail).toMatch(/mark-reviewed|MarkReviewed|markActualDeliveryReviewed/i);
    expect(detail).toMatch(/request-correction|RequestCorrection|requestActualDeliveryCorrection/i);
    expect(detail).not.toMatch(/updateActualDelivery|editContent|saveDelivery/i);
  });

  it('does not use compatibility teaching/delivery as the primary UI route', () => {
    const api = source('src/features/teacher/delivery/api/teacher-delivery-api.ts');
    expect(api).toContain('endpoints.teacher.actualDeliveries');
    expect(api).not.toContain('/teacher/teaching/delivery');
    expect(api).not.toContain('/teacher/teaching/progress');
  });

  it('does not duplicate homework or attendance modules inside delivery feature', () => {
    const deliveryDir = [
      'src/features/teacher/delivery/components/delivery-context-step.tsx',
      'src/features/teacher/delivery/components/teacher-delivery-editor.tsx',
    ];
    for (const path of deliveryDir) {
      const text = source(path);
      expect(text).not.toMatch(/createHomework|takeAttendance|homework.?form/i);
    }
  });
});

describe('delivery i18n parity', () => {
  it('keeps teacher.delivery / classJournal / teachingProgress leaf parity across ar/en/fr/es', () => {
    const langs = ['ar', 'en', 'fr', 'es'] as const;
    const messages = Object.fromEntries(
      langs.map((lang) => [
        lang,
        JSON.parse(readFileSync(resolve(root, `messages/${lang}.json`), 'utf8')),
      ]),
    );

    function leafPaths(value: unknown, prefix = ''): string[] {
      if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return prefix ? [prefix] : [];
      }
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        leafPaths(child, prefix ? `${prefix}.${key}` : key),
      );
    }

    for (const ns of ['delivery', 'classJournal', 'teachingProgress'] as const) {
      const base = new Set(leafPaths(messages.en.teacher[ns]));
      expect(base.size).toBeGreaterThan(5);
      for (const lang of langs) {
        const paths = new Set(leafPaths(messages[lang].teacher[ns]));
        for (const key of base) expect(paths.has(key), `${lang} missing teacher.${ns}.${key}`).toBe(true);
        for (const key of paths) expect(base.has(key), `${lang} extra teacher.${ns}.${key}`).toBe(true);
      }
    }

    const ar = JSON.stringify(messages.ar.teacher);
    expect(ar).toContain('التنفيذ الفعلي');
    expect(ar).toContain('دفتر القسم');
    expect(ar).toContain('تقدم التدريس');
  });
});
