/**
 * Fixture / contract QA for convert matrix + ready filter (no live tenant mutation).
 * TEMPORARY_TEST_DATA: fictional Arabic names.
 */
import { describe, expect, it } from 'vitest';
import {
  applyOperationalCard,
  buildAdmissionListServerQuery,
  parseWorkspaceListStateFromSearchParams,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import {
  resolveDetailPrimaryActionCode,
  shouldShowConvertToStudentAction,
} from './admission-modern-actions';
import { resolveOperationalCardDisplayCount, ADMISSIONS_OPERATIONAL_CARDS } from './admissions-dashboard-cards';
import type { AdmissionDetail, AdmissionListItem } from '@/types/admission';

const TEMPORARY_TEST_DATA = [
  { name: 'نور اليقينسي', status: 'new' },
  { name: 'مريم الفاسي', status: 'follow_up' },
  { name: 'ياسين المراكشي', status: 'in_assessment' },
  { name: 'هند السلاوي', status: 'decision_pending' },
  { name: 'آدم التطواني', status: 'accepted' },
  { name: 'ليلى الوجدي', status: 'ready_for_registration' },
  { name: 'كريم الناظوري', status: 'waitlisted' },
  { name: 'سارة القنيطري', status: 'rejected' },
  { name: 'زياد الرحماني', status: 'closed' },
] as const;

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
    view: 'table',
    ...patch,
  };
}

function fixtureDetail(
  name: string,
  status: string,
  patch: Partial<AdmissionDetail> = {},
): AdmissionDetail {
  return {
    id: Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)),
    student_name: name,
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    application_status: status,
    modern_allowed_actions: [
      { code: 'log_contact', allowed: true },
      { code: 'convert_to_student', allowed: true },
    ],
    primary_next_action: 'log_contact',
    navigation: null,
    student_id: false,
    ...patch,
  } as AdmissionDetail;
}

describe('fixture QA — convert button all unregistered statuses', () => {
  it.each(TEMPORARY_TEST_DATA)(
    '$name ($status): convert visible; primary stays operational',
    ({ name, status }) => {
      const record = fixtureDetail(name, status);
      expect(shouldShowConvertToStudentAction(record)).toBe(true);
      expect(resolveDetailPrimaryActionCode(record)).toBe('log_contact');
    },
  );

  it('registered opens student path only', () => {
    const record = fixtureDetail('محمود المسجل', 'registered', {
      student_id: 501,
      navigation: { student: { id: 501, href: '/admin/students/501', available: true } },
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      primary_next_action: 'convert_to_student',
    });
    expect(shouldShowConvertToStudentAction(record)).toBe(false);
    expect(resolveDetailPrimaryActionCode(record)).toBeNull();
  });
});

describe('fixture QA — ready filter three results', () => {
  const fixtures: AdmissionListItem[] = [
    {
      id: 1,
      student_name: 'ليلى الوجدي',
      application_status: 'ready_for_registration',
    } as AdmissionListItem,
    {
      id: 2,
      student_name: 'أمين الجاهز',
      application_status: 'ready_for_registration',
    } as AdmissionListItem,
    {
      id: 3,
      student_name: 'هدى المسار',
      application_status: 'ready_for_registration',
    } as AdmissionListItem,
    {
      id: 4,
      student_name: 'قبول فقط',
      application_status: 'accepted',
    } as AdmissionListItem,
    {
      id: 5,
      student_name: 'محول',
      application_status: 'registered',
    } as AdmissionListItem,
  ];

  it('request is application_status only; filtered fixtures = 3', () => {
    const state = applyOperationalCard(baseState({ page: 2 }), 'ready_for_registration');
    const query = buildAdmissionListServerQuery(state);
    expect(query).toEqual({
      application_status: 'ready_for_registration',
      hide_registered: 1,
      page: 1,
    });
    expect(query).not.toHaveProperty('workspace');
    expect(query).not.toHaveProperty('state');

    const matching = fixtures.filter(
      (row) => row.application_status === query.application_status,
    );
    expect(matching).toHaveLength(3);
    expect(matching.every((row) => row.application_status === 'ready_for_registration')).toBe(
      true,
    );
    expect(matching.some((row) => row.application_status === 'accepted')).toBe(false);
    expect(matching.some((row) => row.application_status === 'registered')).toBe(false);

    const card = ADMISSIONS_OPERATIONAL_CARDS[1];
    expect(
      resolveOperationalCardDisplayCount(
        {
          total_open: 76,
          new_count: 0,
          visit_pending_count: 0,
          under_review_count: 0,
          accepted_count: 10,
          offer_sent_count: 0,
          confirmed_count: 3,
          lost_count: 0,
          today_appointments: 0,
          overdue_next_actions: 0,
        },
        card,
        { activeCard: 'ready_for_registration', activeListTotal: matching.length },
      ),
    ).toBe(3);
  });

  it('URL + back/forward keep ready status', () => {
    const ready = applyOperationalCard(baseState(), 'ready_for_registration');
    const params = workspaceListStateToSearchParams(ready);
    expect(params.get('application_status')).toBe('ready_for_registration');
    const restored = parseWorkspaceListStateFromSearchParams(params);
    expect(buildAdmissionListServerQuery(restored).application_status).toBe(
      'ready_for_registration',
    );
    const cleared = applyOperationalCard(ready, 'ready_for_registration');
    expect(cleared.workspace).toBe('follow_up');
  });
});
