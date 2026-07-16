import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  resolveNewAdmissionsCount,
  resolveOpenAdmissionsCount,
  resolveApplicationStatusCount,
} from './admissions-dashboard-cards';
import {
  applyApplicationStatusFilter,
  buildAdmissionListServerQuery,
  buildRegisteredVisibilityQuery,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import { resolveEffectiveHideConverted } from './filter-admission-list-items';
import type { AdmissionsDashboard } from '@/types/admission';

function admissionsDashboard(
  patch: Partial<AdmissionsDashboard> = {},
): AdmissionsDashboard {
  return {
    total_open: 0,
    new_count: 0,
    visit_pending_count: 0,
    under_review_count: 0,
    accepted_count: 0,
    offer_sent_count: 0,
    confirmed_count: 0,
    lost_count: 0,
    today_appointments: 0,
    overdue_next_actions: 0,
    ...patch,
  };
}

function base(patch: Partial<AdmissionWorkspaceListState> = {}): AdmissionWorkspaceListState {
  return {
    workspace: 'follow_up',
    statusFilter: '',
    followStage: '',
    awaitingSub: '',
    postSub: 'awaiting',
    closedSub: 'rejected',
    hideConverted: true,
    page: 1,
    view: 'kanban',
    ...patch,
  };
}

describe('admissions pre-commit counts / registered / status-nav / services', () => {
  it('resolves open from total_open only (no client sum)', () => {
    const dash = admissionsDashboard({
      total_open: 61,
      application_status_counts: {
        new: 30,
        follow_up: 9,
        registered: 18,
      },
    });
    expect(resolveOpenAdmissionsCount(dash)).toBe(61);
    // Incomplete dashboard probe: open count requires a numeric total_open.
    const withoutOpen = admissionsDashboard();
    Reflect.deleteProperty(withoutOpen, 'total_open');
    expect(resolveOpenAdmissionsCount(withoutOpen)).toBeNull();
  });

  it('resolves new from application_status_counts over inflated new_count', () => {
    const dash = admissionsDashboard({
      new_count: 43,
      application_status_counts: { new: 30 },
      application_status_new_count: 30,
    });
    expect(resolveNewAdmissionsCount(dash)).toBe(30);
    expect(resolveApplicationStatusCount(dash, 'new')).toBe(30);
  });

  it('hide_registered query clears when status=registered even if hideConverted true', () => {
    expect(
      buildRegisteredVisibilityQuery(base({ hideConverted: true, statusFilter: 'registered' })),
    ).toEqual({});
    expect(
      buildAdmissionListServerQuery(base({ statusFilter: 'registered', hideConverted: true })),
    ).not.toHaveProperty('hide_registered');
    expect(
      resolveEffectiveHideConverted({ hideConverted: true, statusFilter: 'registered' }),
    ).toBe(false);
  });

  it('selecting registered clears hide and sets show_registered URL', () => {
    const next = applyApplicationStatusFilter(base({ hideConverted: true }), 'registered');
    expect(next.hideConverted).toBe(false);
    expect(next.statusFilter).toBe('registered');
    expect(next.page).toBe(1);
    expect(workspaceListStateToSearchParams(next).get('show_registered')).toBe('1');
    expect(workspaceListStateToSearchParams(next).get('application_status')).toBe('registered');
    expect(buildAdmissionListServerQuery(next)).not.toHaveProperty('hide_registered');
  });

  it('leaving registered does not secretly re-enable hideConverted', () => {
    const fromRegistered = applyApplicationStatusFilter(
      base({ hideConverted: false, statusFilter: 'registered' }),
      '',
    );
    expect(fromRegistered.hideConverted).toBe(false);
    expect(workspaceListStateToSearchParams(fromRegistered).get('show_registered')).toBe('1');
  });

  it('status nav keeps primary chips mounted and uses dropdown not carousel inline', () => {
    const src = readFileSync(
      resolve(__dirname, '../components/admissions-status-nav.tsx'),
      'utf8',
    );
    expect(src).toContain('admissions-status-nav__primary');
    expect(src).toContain('admissions-status-nav__more-panel');
    expect(src).not.toContain('more-inline');
    expect(src).toContain('moreCurrent');
    expect(src).toContain('Escape');
  });

  it('services toolbar overflow is visible so popover can open', () => {
    const css = readFileSync(resolve(__dirname, '../admissions.css'), 'utf8');
    expect(css).toMatch(/\.admissions-list-toolbar\s*\{[^}]*overflow:\s*visible/s);
    expect(css).toMatch(/\.admissions-list-toolbar--compact\s*\{[^}]*overflow:\s*visible/s);
  });

  it('dashboard executive prefers admissions dashboard open-scope helper', () => {
    const src = readFileSync(
      resolve(__dirname, '../../dashboard/admin-executive-dashboard.tsx'),
      'utf8',
    );
    expect(src).toContain('hide_registered: 1');
    expect(src).toContain('resolveOpenAdmissionsCount');
    expect(src).toContain('resolveNewAdmissionsCount');
  });

  it('hides toggle URL trigger is push-capable', () => {
    const src = readFileSync(
      resolve(__dirname, '../components/admissions-list-page.tsx'),
      'utf8',
    );
    expect(src).toContain('user_hide_registered_toggle');
    expect(src).toContain('dashboardData.total_open');
  });
});
