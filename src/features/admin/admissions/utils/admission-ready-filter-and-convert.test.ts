/**
 * Ready-for-registration filter + convert_to_student visibility.
 * TEMPORARY_TEST_DATA fixtures only — no live conversion.
 */
import { describe, expect, it } from 'vitest';
import {
  applyOperationalCard,
  buildAdmissionListServerQuery,
  buildAdmissionWorkspaceQuery,
  parseWorkspaceListStateFromSearchParams,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import {
  resolveDetailPrimaryActionCode,
  shouldShowConvertToStudentAction,
} from './admission-modern-actions';
import type { AdmissionDetail } from '@/types/admission';

function baseState(
  patch: Partial<AdmissionWorkspaceListState> = {},
): AdmissionWorkspaceListState {
  return {
    workspace: 'follow_up',
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

function detail(patch: Partial<AdmissionDetail> = {}): AdmissionDetail {
  return {
    id: 1001,
    student_name: 'سلمى العلمي',
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'accepted',
    application_status: 'ready_for_registration',
    modern_allowed_actions: [],
    primary_next_action: null,
    navigation: null,
    student_id: false,
    ...patch,
  } as AdmissionDetail;
}

const UNREGISTERED_STATUSES = [
  'new',
  'follow_up',
  'in_assessment',
  'decision_pending',
  'accepted',
  'ready_for_registration',
  'waitlisted',
  'rejected',
  'closed',
] as const;

describe('ready_for_registration operational filter', () => {
  it('1-2. ready card sends only application_status=ready_for_registration (no workspace/state)', () => {
    const ready = applyOperationalCard(
      baseState({ page: 4, academicYearId: '2', search: 'test' }),
      'ready_for_registration',
    );
    expect(ready.page).toBe(1);
    expect(ready.postSub).toBe('ready');
    expect(ready.workspace).toBe('post_acceptance');
    expect(ready.academicYearId).toBeUndefined();
    expect(ready.search).toBeUndefined();
    const query = buildAdmissionListServerQuery(ready);
    expect(query.application_status).toBe('ready_for_registration');
    expect(query).not.toHaveProperty('workspace');
    expect(query).not.toHaveProperty('state');
    expect(query).not.toHaveProperty('processing_stage');
    expect(query).not.toHaveProperty('registration_readiness');
    expect(query).not.toHaveProperty('academic_year_id');
  });

  it('3-4. ready query cannot widen to accepted or registered', () => {
    const q = buildAdmissionWorkspaceQuery(
      baseState({ workspace: 'post_acceptance', postSub: 'ready' }),
    ).query;
    expect(q.application_status).toBe('ready_for_registration');
    expect(q).not.toHaveProperty('state');
    expect(String(q.application_status)).not.toContain('accepted');
    expect(String(q.application_status)).not.toContain('registered');
  });

  it('5-7. URL persists ready filter; page resets; reload restores', () => {
    const ready = applyOperationalCard(baseState({ page: 3, search: 'مريم' }), 'ready_for_registration');
    const params = workspaceListStateToSearchParams(ready);
    expect(params.get('application_status')).toBe('ready_for_registration');
    expect(params.get('page')).toBeNull();
    const restored = parseWorkspaceListStateFromSearchParams(params);
    expect(restored.statusFilter).toBe('ready_for_registration');
    expect(buildAdmissionWorkspaceQuery(restored).query).toEqual({
      application_status: 'ready_for_registration',
    });
  });

  it('8. back/forward: parsing ready URL does not widen to workspace-only', () => {
    const restored = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams({
        workspace: 'post_acceptance',
        postSub: 'ready',
        application_status: 'ready_for_registration',
      }),
    );
    expect(buildAdmissionListServerQuery(restored).application_status).toBe(
      'ready_for_registration',
    );
    expect(buildAdmissionListServerQuery(restored)).not.toHaveProperty('workspace');
    expect(buildAdmissionListServerQuery(restored)).not.toHaveProperty('state');
  });

  it('KPI cards map to distinct application_status values', () => {
    const awaiting = applyOperationalCard(baseState(), 'awaiting_registration');
    const ready = applyOperationalCard(baseState(), 'ready_for_registration');
    const rejected = applyOperationalCard(baseState(), 'school_rejected');
    expect(buildAdmissionListServerQuery(awaiting).application_status).toBe('accepted');
    expect(buildAdmissionListServerQuery(ready).application_status).toBe(
      'ready_for_registration',
    );
    expect(buildAdmissionListServerQuery(rejected).application_status).toBe('rejected');
    expect(buildAdmissionListServerQuery(awaiting)).not.toHaveProperty('registration_status');
    expect(buildAdmissionListServerQuery(rejected)).not.toHaveProperty('decision');
    expect(buildAdmissionListServerQuery(ready)).not.toHaveProperty('state');
  });
});

describe('convert_to_student visibility matrix (all unregistered)', () => {
  it.each(UNREGISTERED_STATUSES)(
    '%s + convert allowed → show convert (not status-restricted)',
    (status) => {
      const record = detail({
        application_status: status,
        modern_allowed_actions: [
          { code: 'log_contact', allowed: true },
          { code: 'convert_to_student', allowed: true },
        ],
        primary_next_action: 'log_contact',
      });
      expect(shouldShowConvertToStudentAction(record)).toBe(true);
      expect(resolveDetailPrimaryActionCode(record)).not.toBe('start_registration');
    },
  );

  it('accepted + family primary + convert allowed → family primary, convert still shown', () => {
    const record = detail({
      application_status: 'accepted',
      modern_allowed_actions: [
        { code: 'record_family_approval', allowed: true },
        { code: 'convert_to_student', allowed: true },
      ],
      primary_next_action: 'convert_to_student',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(true);
    expect(resolveDetailPrimaryActionCode(record)).toBe('record_family_approval');
  });

  it('ready + convert as primary → primary is convert', () => {
    const record = detail({
      application_status: 'ready_for_registration',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      primary_next_action: 'convert_to_student',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(true);
    expect(resolveDetailPrimaryActionCode(record)).toBe('convert_to_student');
  });

  it('ready + convert allowed but primary is complete_assessment → convert secondary only', () => {
    const record = detail({
      application_status: 'ready_for_registration',
      modern_allowed_actions: [
        { code: 'complete_assessment', allowed: true },
        { code: 'convert_to_student', allowed: true },
      ],
      primary_next_action: 'complete_assessment',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(true);
    expect(resolveDetailPrimaryActionCode(record)).toBe('complete_assessment');
  });

  it('ready + convert as primary only (missing from allowed list) → still show', () => {
    const record = detail({
      application_status: 'ready_for_registration',
      modern_allowed_actions: [],
      primary_next_action: { code: 'convert_to_student' },
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(true);
    expect(resolveDetailPrimaryActionCode(record)).toBe('convert_to_student');
  });

  it('object-keyed modern_allowed_actions supports convert', () => {
    const record = detail({
      application_status: 'new',
      modern_allowed_actions: {
        convert_to_student: { allowed: true },
        log_contact: { allowed: true },
      } as never,
      primary_next_action: 'log_contact',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(true);
  });

  it('convert explicitly blocked → hide', () => {
    const record = detail({
      application_status: 'follow_up',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: false }],
      primary_next_action: 'convert_to_student',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(false);
    expect(resolveDetailPrimaryActionCode(record)).not.toBe('convert_to_student');
  });

  it('registered → no convert', () => {
    const record = detail({
      application_status: 'registered',
      student_id: 55,
      navigation: { student: { id: 55, href: '/admin/students/55', available: true } },
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      primary_next_action: 'convert_to_student',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(false);
    expect(resolveDetailPrimaryActionCode(record)).toBeNull();
  });

  it('linked student_id → no convert even if Backend allowed', () => {
    const record = detail({
      application_status: 'accepted',
      student_id: 88,
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(false);
  });

  it('never uses start_registration as primary or convert surrogate', () => {
    const record = detail({
      application_status: 'ready_for_registration',
      modern_allowed_actions: [{ code: 'start_registration', allowed: true }],
      primary_next_action: 'start_registration',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(false);
    expect(resolveDetailPrimaryActionCode(record)).toBeNull();
  });

  it('does not hardcode convert from ready status alone without Backend signal', () => {
    const record = detail({
      application_status: 'ready_for_registration',
      modern_allowed_actions: [],
      primary_next_action: null,
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(false);
  });

  it('does not require family approval / processing_stage / registration_readiness', () => {
    const record = detail({
      application_status: 'new',
      processing_stage: 'new',
      registration_readiness: 'not_ready',
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      primary_next_action: 'log_contact',
    } as never);
    expect(shouldShowConvertToStudentAction(record)).toBe(true);
  });
});
