/**
 * STAGE 17D — Kanban `projection=kanban` integration contracts.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ADMISSIONS_KANBAN_PROJECTION,
  isKanbanListProjection,
  withKanbanListProjection,
} from './admission-kanban-projection';
import { normalizeAdmissionListItem } from './normalize-admission-record';
import {
  formatLastActionSummary,
  actorName,
} from './admission-last-action-display';
import { formatAdmissionReference, refName } from './admission-labels';
import { intersectAllowedStatusTargets } from './admission-modern-actions';
import { resolveAdmissionTerminalReasonPanel } from './admission-terminal-reason';
import { visibleKanbanColumnsForBoard } from './admission-kanban-presentation';
import { normalizeAdmissionRequestedServices } from './admission-requested-services';
import type { AdmissionListItem } from '@/types/admission';

const root = path.join(__dirname, '..');

function read(rel: string) {
  return readFileSync(path.join(root, rel), 'utf8');
}

function lightKanbanRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: 9001,
    name: 'ADM-9001',
    student_name: 'طالب اختبار',
    guardian_name: 'ولي اختبار',
    guardian_phone: '0600000000',
    requested_level: { id: 4, name: 'مستوى اختبار' },
    application_status: 'follow_up',
    allowed_status_targets: ['new', 'in_assessment', 'decision_pending'],
    primary_next_action: 'log_contact',
    next_action_date: null,
    last_action: {
      code: 'log_contact',
      result: 'answered',
      user: 'أخصائي',
      at: '2026-07-14T10:00:00Z',
    },
    requested_services: [
      { id: 1, code: 'transport', name: 'النقل', active: true },
    ],
    ...overrides,
  } as unknown as AdmissionListItem;
}

describe('17D kanban projection=kanban', () => {
  it('1-2. helper attaches projection=kanban and kanban hook uses it for all fetches', () => {
    const q = withKanbanListProjection({
      application_status: 'new',
      page: 1,
      page_size: 30,
    });
    expect(q.projection).toBe(ADMISSIONS_KANBAN_PROJECTION);
    expect(isKanbanListProjection(q)).toBe(true);

    const hook = read('hooks/use-admissions-kanban-board.ts');
    expect(hook).toContain('withKanbanListProjection');
    // Four fetch sites: initial board, initial columns, loadMore board, loadMore column
    expect(hook.match(/withKanbanListProjection\(/g)?.length).toBeGreaterThanOrEqual(4);
    expect(hook).toContain('No silent fallback');
  });

  it('3-7. Table/Detail/Dashboard/options/services paths do not send projection', () => {
    const listPage = read('components/admissions-list-page.tsx');
    const api = read('api/admissions-api.ts');
    const optionsHook = read('hooks/use-admission-options.ts');

    expect(listPage).toContain('useAdmissionsKanbanBoard');
    expect(listPage).toContain('useAdminResource<AdmissionListItem[]>');
    // Table uses useAdminResource with tableParams — no kanban projection helper
    expect(listPage).not.toContain('withKanbanListProjection');
    expect(listPage).not.toMatch(/tableParams[\s\S]{0,200}projection/);

    expect(api).toContain('fetchAdmission(');
    expect(api).not.toContain("projection: 'kanban'");
    expect(api).not.toContain('withKanbanListProjection');

    expect(api).toContain('fetchAdmissionsDashboard');
    expect(optionsHook).toContain('admissionsOptions');
    expect(optionsHook).not.toContain('projection');
    expect(listPage).toContain('admissionsRequestedServices');
    expect(listPage).not.toMatch(
      /admissionsRequestedServices[\s\S]{0,120}projection/,
    );
  });

  it('8. query identity differs between full list and kanban projection', () => {
    const full = { application_status: 'new', page: 1, page_size: 30 };
    const kanban = withKanbanListProjection({ ...full });
    expect(JSON.stringify(full)).not.toBe(JSON.stringify(kanban));
    expect('projection' in full).toBe(false);
    expect(kanban.projection).toBe('kanban');
  });

  it('9-16. lightweight payload normalizes without inventing modern actions', () => {
    const normalized = normalizeAdmissionListItem(lightKanbanRaw());
    expect(normalized.id).toBe(9001);
    expect(normalized.reference).toBe('ADM-9001');
    expect(formatAdmissionReference(normalized.id, normalized.reference)).toBe('ADM-9001');
    expect(normalized.student_name).toBe('طالب اختبار');
    expect(refName(normalized.requested_level)).toBe('مستوى اختبار');
    expect(normalized.allowed_status_targets).toEqual([
      'new',
      'in_assessment',
      'decision_pending',
    ]);
    expect(normalized.modern_allowed_actions).toEqual([]);
    expect(normalized.primary_next_action).toBe('log_contact');
    expect(normalized.requested_services).toHaveLength(1);
    expect(normalized.requested_services?.[0]).toMatchObject({
      id: 1,
      code: 'transport',
      name: 'النقل',
      active: true,
    });

    const noModern = normalizeAdmissionListItem(
      lightKanbanRaw({ modern_allowed_actions: undefined, guardians: undefined }),
    );
    expect(noModern.modern_allowed_actions).toEqual([]);
    expect((noModern as { guardians?: unknown }).guardians).toBeUndefined();

    const levelNull = normalizeAdmissionListItem(
      lightKanbanRaw({ requested_level: false }),
    );
    expect(levelNull.requested_level).toBeNull();
    expect(refName(levelNull.requested_level)).toBe('');

    const lastFalse = normalizeAdmissionListItem(lightKanbanRaw({ last_action: false }));
    expect(lastFalse.last_action).toBeNull();
    expect(formatLastActionSummary(lastFalse.last_action).key).toBe(
      'admin.admissions.lastAction.none',
    );

    const lightAction = normalizeAdmissionListItem(
      lightKanbanRaw({
        last_action: { code: 'log_contact', result: 'answered', user: 'مشرف', at: '2026-01-01' },
      }),
    );
    expect(actorName(lightAction.last_action!)).toBe('مشرف');
    expect(formatLastActionSummary(lightAction.last_action).occurredAt).toBe('2026-01-01');

    const services = normalizeAdmissionRequestedServices([
      { id: 2, code: 'canteen', name: 'المطعم', active: true },
    ]);
    expect(services[0]?.code).toBe('canteen');
  });

  it('17-18. allowed_status_targets drive drag ghosts and bulk intersection', () => {
    const targets = ['follow_up', 'decision_pending'];
    const cols = visibleKanbanColumnsForBoard(
      [
        { id: 'new', total: 1, items: [{ id: 1 }], loading: false },
        { id: 'follow_up', total: 0, items: [], loading: false },
        { id: 'decision_pending', total: 0, items: [], loading: false },
        { id: 'registered', total: 0, items: [], loading: false },
      ],
      { dragging: true, allowedTargetIds: targets },
    );
    expect(cols.map((c) => c.id)).toEqual(['new', 'follow_up', 'decision_pending']);
    expect(cols.find((c) => c.id === 'follow_up')?.isGhost).toBe(true);
    expect(cols.find((c) => c.id === 'registered')).toBeUndefined();

    expect(
      intersectAllowedStatusTargets([
        { allowed_status_targets: ['follow_up', 'accepted'] },
        { allowed_status_targets: ['follow_up', 'rejected'] },
      ]),
    ).toEqual(['follow_up']);
  });

  it('19. registered has empty targets / not draggable by status', () => {
    const normalized = normalizeAdmissionListItem(
      lightKanbanRaw({
        application_status: 'registered',
        allowed_status_targets: [],
      }),
    );
    expect(normalized.allowed_status_targets).toEqual([]);
    expect(normalized.application_status).toBe('registered');
  });

  it('20-21. rejected/closed terminal reasons from projection fields', () => {
    const rejected = resolveAdmissionTerminalReasonPanel(
      normalizeAdmissionListItem(
        lightKanbanRaw({
          application_status: 'rejected',
          rejection: { is_rejected: true, reason: 'سبب رفض تجريبي' },
          primary_next_action: null,
        }),
      ),
    );
    expect(rejected?.kind).toBe('rejected');
    expect(rejected?.reason).toContain('رفض');

    const closed = resolveAdmissionTerminalReasonPanel(
      normalizeAdmissionListItem(
        lightKanbanRaw({
          application_status: 'closed',
          lost_reason: 'سبب إغلاق تجريبي',
          last_action: { code: 'close', note: 'ملاحظة' },
        }),
      ),
    );
    expect(closed?.kind).toBe('closed');
    expect(closed?.reason).toContain('إغلاق');
  });

  it('22-26. actions menu fetches detail on open only; no silent full fallback', () => {
    const menu = read('components/admission-list-actions-menu.tsx');
    expect(menu).toContain('fetchAdmission');
    expect(menu).toContain('if (!detail) await loadDetail()');
    expect(menu).not.toMatch(/useEffect\([\s\S]{0,200}fetchAdmission/);

    const card = read('components/admission-card.tsx');
    expect(card).not.toContain('fetchAdmission');

    const kanban = read('components/admissions-raw-state-kanban.tsx');
    expect(kanban).not.toMatch(/pointermove[\s\S]{0,400}fetchAdmissions/);
    expect(kanban).not.toMatch(/beginPointerDrag[\s\S]{0,400}fetchAdmission/);

    const hook = read('hooks/use-admissions-kanban-board.ts');
    expect(hook).not.toMatch(/projection[\s\S]{0,80}fallback/i);
    expect(hook).not.toMatch(/invalid_admissions_projection[\s\S]{0,200}fetchAdmissions/);
  });

  it('27-30. progressive settle + filters keep projection; no extra design requests', () => {
    const hook = read('hooks/use-admissions-kanban-board.ts');
    expect(hook).toContain('Progressive settle');
    expect(hook).toContain('settledCount === 1');
    expect(hook).toContain('ADMISSIONS_KANBAN_COLUMN_PAGE_SIZE');

    // Filters arrive via resolvedExtraQuery spread inside withKanbanListProjection
    expect(hook).toMatch(/withKanbanListProjection\(\{[\s\S]*?\.\.\.resolvedExtraQuery/);

    const list = read('components/admissions-list-page.tsx');
    expect(list).toContain('secondaryFiltersEnabled');
    expect(list).toContain('kanbanShellReady');
  });
});
