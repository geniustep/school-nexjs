import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ADMISSION_STATUS_NAV_MORE,
  ADMISSION_STATUS_NAV_PRIMARY,
  applyApplicationStatusFilter,
  buildAdmissionListServerQuery,
  normalizeRequestedServiceIdsCsv,
  parseWorkspaceListStateFromSearchParams,
  resolveStatusNavKanbanColumns,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';

function baseState(
  patch: Partial<AdmissionWorkspaceListState> = {},
): AdmissionWorkspaceListState {
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

describe('admission status-nav Stage 9', () => {
  it('maps after_acceptance / post_acceptance postSub to accepted vs ready', () => {
    const awaiting = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('workspace=after_acceptance&postSub=awaiting'),
    );
    expect(awaiting.statusFilter).toBe('accepted');
    expect(buildAdmissionListServerQuery(awaiting).application_status).toBe('accepted');
    expect(buildAdmissionListServerQuery(awaiting)).not.toHaveProperty('workspace');

    const ready = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('workspace=post_acceptance&postSub=ready'),
    );
    expect(ready.statusFilter).toBe('ready_for_registration');
    expect(buildAdmissionListServerQuery(ready).application_status).toBe(
      'ready_for_registration',
    );
    expect(buildAdmissionListServerQuery(ready).application_status).not.toBe('accepted');
  });

  it('defaults parse with no params to all applications (statusFilter empty)', () => {
    const parsed = parseWorkspaceListStateFromSearchParams(new URLSearchParams());
    expect(parsed.statusFilter).toBe('');
    expect(buildAdmissionListServerQuery(parsed)).not.toHaveProperty('application_status');
    expect(buildAdmissionListServerQuery(parsed)).not.toHaveProperty('workspace');
  });

  it('serializes requested_service_ids as sorted numeric CSV and strips year/source', () => {
    const params = workspaceListStateToSearchParams(
      baseState({
        academicYearId: '9',
        sourceId: '3',
        requestedServiceIds: ['1311', '1310', '1311'],
        statusFilter: 'accepted',
      }),
    );
    expect(params.get('requested_service_ids')).toBe('1310,1311');
    expect(params.get('requested_service_id')).toBeNull();
    expect(params.get('year')).toBeNull();
    expect(params.get('source')).toBeNull();
    expect(params.get('academic_year_id')).toBeNull();
    expect(params.get('workspace')).toBeNull();
    expect(params.get('application_status')).toBe('accepted');
    expect(normalizeRequestedServiceIdsCsv(['20', '3', '20', '10'])).toBe('3,10,20');
  });

  it('resolveStatusNavKanbanColumns includes accepted + ready when all selected', () => {
    const columns = resolveStatusNavKanbanColumns('');
    expect(columns).toContain('accepted');
    expect(columns).toContain('ready_for_registration');
    expect(columns).not.toContain('');
    expect(columns).toEqual(
      ADMISSION_STATUS_NAV_PRIMARY.filter((s) => s !== ''),
    );
    expect(resolveStatusNavKanbanColumns('accepted')).toEqual(['accepted']);
    expect(ADMISSION_STATUS_NAV_MORE).toContain('registered');
  });

  it('applyApplicationStatusFilter clears conflicting subs and keeps services', () => {
    const next = applyApplicationStatusFilter(
      baseState({
        requestedServiceIds: ['5'],
        followStage: 'new',
        page: 4,
      }),
      'ready_for_registration',
    );
    expect(next.statusFilter).toBe('ready_for_registration');
    expect(next.page).toBe(1);
    expect(next.followStage).toBe('');
    expect(next.requestedServiceIds).toEqual(['5']);
  });

  it('list page source no longer renders workspace tabs / post_acceptance bands', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../components/admissions-list-page.tsx'),
      'utf8',
    );
    expect(source).not.toContain('admissions-workspace-tabs');
    expect(source).not.toContain('admissions-post-subfilters');
    expect(source).not.toContain('AdmissionsDashboardSummary');
    expect(source).not.toContain('AdmissionsRequestedServicesCountCards');
    expect(source).toContain('AdmissionsStatusNav');
    expect(source).toContain('user_status_filter');
    expect(source).toContain('urlNavTriggerRef');
    expect(source).toContain('commitServiceFilterState');
  });
});
