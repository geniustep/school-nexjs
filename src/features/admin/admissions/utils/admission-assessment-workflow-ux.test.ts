import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  FOLLOW_UP_PROCESSING_STAGES,
  LEGACY_STATE_TO_PROCESSING_STAGE,
  mapLegacyListStateParam,
  normalizeAdmissionAssessmentSummary,
  normalizeAdmissionRegistrationRequirements,
  partitionRegistrationRequirements,
  parseAdmissionProcessingStage,
  resolveAssessmentProgress,
  resolveOfferRequired,
  resolveProcessingStage,
  resolveRegistrationReadiness,
  assessmentTypeLabelKey,
  assessmentRecommendationLabelKey,
} from './admission-assessment-workflow-contract';
import { normalizeAdmissionDetail, normalizeAdmissionListItem } from './normalize-admission-record';
import {
  buildAdmissionWorkspaceQuery,
  buildKanbanWorkspaceExtraQuery,
  FOLLOW_UP_WORKSPACE_STATES,
  parseWorkspaceListStateFromSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';
import {
  resolveAdmissionPrimaryAction,
  resolveAdmissionSecondaryActions,
  primaryActionExcludesSecondary,
} from './admission-primary-action';
import {
  resolveAcceptanceRegistrationMode,
  shouldShowOffersList,
} from './admission-acceptance-registration-ux';
import {
  isRawKanbanDropTarget,
  rawKanbanColumnClass,
} from './admission-raw-kanban';
import {
  boardStartScrollLeft,
  computeHorizontalScrollMetrics,
} from './synchronized-horizontal-scroll';
import { evaluateManualStageChange, getAdmissionManualStageOptions } from './admission-stage-options';
import { ADMISSION_TABS, mapLegacyAdmissionTab } from './admission-detail-tabs';
import type { AdmissionDetail } from '@/types/admission';

const require = createRequire(import.meta.url);
const messagesRoot = path.resolve(process.cwd(), 'messages');

function loadMessages(locale: string) {
  return require(path.join(messagesRoot, `${locale}.json`));
}

function baseState(
  overrides: Partial<AdmissionWorkspaceListState> = {},
): AdmissionWorkspaceListState {
  return {
    ...parseWorkspaceListStateFromSearchParams(new URLSearchParams()),
    ...overrides,
  };
}

const ALL_ACTIONS = {
  edit: true,
  change_state: true,
  change_processing_stage: true,
  schedule_appointment: true,
  add_assessment: true,
  decide: true,
  create_offer: true,
  send_offer: true,
  accept_offer: true,
  decline_offer: true,
  get_prefill: true,
  link_student: true,
  reopen: true,
};

describe('API contract + normalization', () => {
  it('1-3. processing_stage from list/detail/family-shaped payloads', () => {
    const list = normalizeAdmissionListItem({
      id: 1,
      student_name: 'A',
      guardian_name: null,
      guardian_phone: null,
      source: null,
      requested_level: null,
      state: 'contacted',
      processing_stage: 'initial_follow_up',
      next_action: null,
      next_action_date: null,
      duplicate_count: 0,
      offer_state: null,
      assigned_user: null,
      priority: null,
    });
    expect(list.processing_stage).toBe('initial_follow_up');

    const detail = normalizeAdmissionDetail({
      id: 2,
      student_name: 'B',
      state: 'new',
      processing_stage: 'assessment_ready',
      allowed_actions: {},
    } as AdmissionDetail);
    expect(detail.processing_stage).toBe('assessment_ready');

    const familyChild = normalizeAdmissionListItem({
      id: 3,
      student_name: 'C',
      guardian_name: null,
      guardian_phone: null,
      source: null,
      requested_level: null,
      state: 'qualified',
      next_action: null,
      next_action_date: null,
      duplicate_count: 0,
      offer_state: null,
      assigned_user: null,
      priority: null,
    });
    expect(familyChild.processing_stage).toBe('assessment_ready');
  });

  it('4-9. assessment/offer/readiness/requirements/next_action typed', () => {
    const detail = normalizeAdmissionDetail({
      id: 4,
      student_name: 'D',
      state: 'under_review',
      assessment_progress: 'in_progress',
      assessment_summary: { required_count: 2, completed_count: 1, progress: 'in_progress' },
      offer_required: true,
      offer_state: 'not_created',
      registration_readiness: 'awaiting_offer_creation',
      registration_requirements: [
        { severity: 'blocking', message: 'need docs' },
        { severity: 'warning', message: 'warn' },
        { severity: 'information', message: 'multi guardian' },
      ],
      next_action: { code: 'create_offer', label: 'Create offer' },
      allowed_actions: {},
    } as AdmissionDetail);
    expect(detail.assessment_progress).toBe('in_progress');
    expect(detail.assessment_summary?.required_count).toBe(2);
    expect(detail.offer_required).toBe(true);
    expect(detail.registration_readiness).toBe('awaiting_offer_creation');
    expect(detail.registration_requirements).toHaveLength(3);
    expect(detail.next_action).toMatchObject({ code: 'create_offer' });
  });

  it('10. Backend fields win over legacy fallback', () => {
    expect(
      resolveProcessingStage({
        processing_stage: 'assessment_ready',
        state: 'contacted',
      }),
    ).toBe('assessment_ready');
    expect(
      resolveAssessmentProgress({
        assessment_progress: 'completed',
        assessment_summary: { progress: 'not_started' },
      }),
    ).toBe('completed');
    expect(
      resolveRegistrationReadiness({
        registration_readiness: 'blocked',
        registration_status: 'ready' as never,
      }),
    ).toBe('blocked');
  });
});

describe('workspaces and kanban', () => {
  it('11-13. status-nav uses application_status kanban columns', () => {
    const all = buildAdmissionWorkspaceQuery(baseState({ statusFilter: '' }));
    expect(all.query.workspace).toBeUndefined();
    expect(all.query.application_status).toBeUndefined();
    expect(all.kanbanColumns).toContain('new');
    expect(all.kanbanColumns).toContain('accepted');
    expect(all.kanbanColumns).toContain('ready_for_registration');

    const follow = buildAdmissionWorkspaceQuery(baseState({ statusFilter: 'follow_up' }));
    expect(follow.query.workspace).toBeUndefined();
    expect(follow.query.application_status).toBe('follow_up');
    expect(follow.kanbanColumns).toEqual(['follow_up']);
    expect(FOLLOW_UP_WORKSPACE_STATES).toEqual([
      'new',
      'follow_up',
      'in_assessment',
    ]);

    const awaiting = buildAdmissionWorkspaceQuery(
      baseState({ statusFilter: 'decision_pending' }),
    );
    expect(awaiting.kanbanColumns).toEqual(['decision_pending']);
    expect(awaiting.query.application_status).toBe('decision_pending');
  });

  it('14-15. kanban extra query omits workspace and application_status', () => {
    const extra = buildKanbanWorkspaceExtraQuery(
      baseState({ statusFilter: 'follow_up' }),
    );
    expect(extra).not.toHaveProperty('workspace');
    expect(extra).not.toHaveProperty('processing_stage');
    expect(extra).not.toHaveProperty('application_status');
    expect(extra).not.toHaveProperty('state');
  });

  it('16-18. dual scroll helpers + multi-select board metrics preserved', () => {
    expect(boardStartScrollLeft(1000, 400, 'rtl')).toBe(600);
    const metrics = computeHorizontalScrollMetrics(100, 1000, 400);
    expect(metrics.overflow).toBe(true);
    expect(metrics.max).toBeGreaterThan(0);
  });

  it('19-22. column colors distinct; drag rules', () => {
    const classes = FOLLOW_UP_WORKSPACE_STATES.map((s) => rawKanbanColumnClass(s));
    expect(new Set(classes).size).toBe(3);
    expect(isRawKanbanDropTarget('in_assessment')).toBe(true);
    expect(isRawKanbanDropTarget('decision_pending')).toBe(true);
    expect(isRawKanbanDropTarget('follow_up')).toBe(true);
    expect(isRawKanbanDropTarget('registered')).toBe(false);
    expect(
      evaluateManualStageChange(
        { processing_stage: 'new' },
        'assessment_in_progress',
      ).apply,
    ).toBe(false);
    expect(
      evaluateManualStageChange(
        { processing_stage: 'new' },
        'initial_follow_up',
      ).apply,
    ).toBe(true);
  });

  it('23-24. registered is table-only while rejected remains kanban-addressable', () => {
    expect(
      buildAdmissionWorkspaceQuery(baseState({ statusFilter: 'registered' })).kanbanAllowed,
    ).toBe(false);
    expect(
      buildAdmissionWorkspaceQuery(baseState({ statusFilter: 'rejected' })).kanbanAllowed,
    ).toBe(true);
  });
});

describe('processing stages + legacy URL', () => {
  it('25-28. legacy mapping', () => {
    expect(LEGACY_STATE_TO_PROCESSING_STAGE.contacted).toBe('initial_follow_up');
    expect(LEGACY_STATE_TO_PROCESSING_STAGE.qualified).toBe('assessment_ready');
    expect(LEGACY_STATE_TO_PROCESSING_STAGE.visit_pending).toBe('initial_follow_up');
    expect(mapLegacyListStateParam('under_review')).toEqual({
      workspace: 'awaiting_decision',
      clearLegacyState: true,
    });
    const parsed = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('state=contacted'),
    );
    expect(parsed.workspace).toBe('follow_up');
    expect(parsed.followStage).toBe('follow_up');
    const under = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('state=under_review'),
    );
    expect(under.workspace).toBe('awaiting_decision');
  });

  it('29-30. canonical options exclude legacy labels', () => {
    const opts = getAdmissionManualStageOptions();
    expect(opts).not.toContain('qualified');
    expect(opts).not.toContain('visit_pending');
    expect(opts).toContain('assessment_ready');
  });
});

describe('assessments', () => {
  it('31-40. progress + recommendation ≠ decision + type labels', () => {
    expect(resolveAssessmentProgress({ assessment_progress: 'not_required' })).toBe(
      'not_required',
    );
    expect(resolveAssessmentProgress({ assessment_progress: 'not_started' })).toBe(
      'not_started',
    );
    const summary = normalizeAdmissionAssessmentSummary({
      progress: 'in_progress',
      completed_count: 1,
      required_count: 3,
    });
    expect(summary?.completed_count).toBe(1);
    expect(summary?.required_count).toBe(3);
    expect(resolveAssessmentProgress({ assessment_progress: 'additional_required' })).toBe(
      'additional_required',
    );
    expect(assessmentRecommendationLabelKey('not_suitable')).toContain(
      'assessmentRecommendations',
    );
    expect(assessmentTypeLabelKey('subject_teacher_assessment')).toContain(
      'subject_teacher_assessment',
    );
    expect(assessmentTypeLabelKey('administrative_interview')).toContain(
      'administrative_interview',
    );
    expect(parseAdmissionProcessingStage('assessment_in_progress')).toBe(
      'assessment_in_progress',
    );
  });
});

describe('journey five steps', () => {
  it('41-51. five steps and offer acceptance ≠ registered', () => {
    const steps = resolveAdmissionJourneySteps({
      processing_stage: 'assessment_in_progress',
      assessment_progress: 'in_progress',
      state: 'under_review',
    });
    expect(steps).toHaveLength(5);
    expect(steps.map((s) => s.id)).toEqual([
      'follow_up',
      'assessment',
      'decision',
      'acceptance',
      'registration',
    ]);
    expect(steps.find((s) => s.id === 'assessment')?.status).toBe('current');

    const decisionReady = resolveAdmissionJourneySteps({
      processing_stage: 'decision_ready',
      assessment_progress: 'ready_for_decision',
      state: 'under_review',
    });
    expect(decisionReady.find((s) => s.id === 'assessment')?.status).toBe('complete');
    expect(decisionReady.find((s) => s.id === 'decision')?.status).toBe('current');

    const rejected = resolveAdmissionJourneySteps({
      decision: { decision: 'rejected', decision_date: null, decision_user: null, decision_notes: null, conditions: null },
      is_school_rejected: true,
      state: 'lost',
    });
    expect(rejected.find((s) => s.id === 'acceptance')?.status).toBe('not_applicable');

    const noOffer = resolveAdmissionJourneySteps({
      decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null },
      offer_required: false,
      offer_state: 'not_applicable',
      registration_readiness: 'ready',
      state: 'accepted',
    });
    expect(noOffer.find((s) => s.id === 'acceptance')?.status).toBe('complete');
    expect(noOffer.find((s) => s.id === 'registration')?.status).toBe('current');

    const offerSent = resolveAdmissionJourneySteps({
      decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null },
      offer_required: true,
      offer_state: 'sent',
      registration_readiness: 'awaiting_offer_response',
      state: 'offer_sent',
    });
    expect(offerSent.find((s) => s.id === 'acceptance')?.status).toBe('current');

    const offerAccepted = resolveAdmissionJourneySteps({
      decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null },
      offer_required: true,
      offer_state: 'accepted',
      registration_readiness: 'ready',
      state: 'confirmed',
    });
    expect(offerAccepted.find((s) => s.id === 'acceptance')?.status).toBe('complete');
    expect(offerAccepted.find((s) => s.id === 'registration')?.status).toBe('current');

    const registered = resolveAdmissionJourneySteps({
      student_id: 9,
      registration_readiness: 'registered',
      offer_state: 'accepted',
      decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null },
      state: 'confirmed',
    });
    expect(registered.find((s) => s.id === 'registration')?.status).toBe('complete');

    const offerOnly = resolveAdmissionJourneySteps({
      decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null },
      offer_required: true,
      offer_state: 'accepted',
      registration_readiness: 'ready',
      state: 'confirmed',
    });
    expect(offerOnly.find((s) => s.id === 'registration')?.status).not.toBe('complete');
  });
});

describe('primary action', () => {
  it('52-62. precedence + single primary', () => {
    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        processing_stage: 'new',
        state: 'new',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('follow_up_start');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        processing_stage: 'initial_follow_up',
        state: 'contacted',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('follow_up_advance');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        processing_stage: 'assessment_ready',
        assessment_progress: 'not_started',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('schedule_assessment');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        processing_stage: 'assessment_in_progress',
        assessment_progress: 'in_progress',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('open_assessments');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        processing_stage: 'decision_ready',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('decide');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        decision: { decision: 'accepted', decision_date: null, decision_user: null, decision_notes: null, conditions: null },
        offer_required: true,
        offer_state: 'not_created',
        registration_readiness: 'awaiting_offer_creation',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('create_offer');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        offer_state: 'sent',
        registration_readiness: 'awaiting_offer_response',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('accept_offer');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        state: 'confirmed',
        registration_readiness: 'ready',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('continue_registration');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        state: 'accepted',
        decision: 'accepted',
        offer_required: false,
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('mark_ready_for_registration');

    expect(
      resolveAdmissionPrimaryAction({
        id: 1,
        student_id: 44,
        registration_readiness: 'registered',
        allowed_actions: ALL_ACTIONS,
      }).key,
    ).toBe('open_student');

    const input = {
      id: 1,
      processing_stage: 'new' as const,
      state: 'new',
      allowed_actions: ALL_ACTIONS,
    };
    const primary = resolveAdmissionPrimaryAction(input);
    const secondary = resolveAdmissionSecondaryActions(input, primary);
    expect(primaryActionExcludesSecondary(primary, secondary)).toBe(true);
  });
});

describe('acceptance and registration UX', () => {
  it('63-75. modes + tab key compatibility', () => {
    expect(ADMISSION_TABS).toContain('offer_registration');
    expect(mapLegacyAdmissionTab('offers')).toBe('offer_registration');

    expect(
      resolveAcceptanceRegistrationMode({
        id: 1,
        student_name: 'x',
        state: 'new',
        allowed_actions: {},
      } as AdmissionDetail),
    ).toBe('before_decision');

    expect(
      shouldShowOffersList(
        resolveAcceptanceRegistrationMode({
          id: 1,
          student_name: 'x',
          state: 'new',
          allowed_actions: {},
        } as AdmissionDetail),
      ),
    ).toBe(false);

    expect(
      resolveAcceptanceRegistrationMode({
        id: 1,
        student_name: 'x',
        state: 'accepted',
        decision: {
          decision: 'accepted',
          decision_date: null,
          decision_user: null,
          decision_notes: null,
          conditions: null,
        },
        offer_required: false,
        offer_state: 'not_applicable',
        allowed_actions: {},
      } as AdmissionDetail),
    ).toBe('accepted_no_offer');

    expect(
      resolveAcceptanceRegistrationMode({
        id: 1,
        student_name: 'x',
        state: 'accepted',
        decision: {
          decision: 'accepted',
          decision_date: null,
          decision_user: null,
          decision_notes: null,
          conditions: null,
        },
        offer_required: true,
        offer_state: 'not_created',
        allowed_actions: {},
      } as AdmissionDetail),
    ).toBe('offer_required_not_created');

    expect(
      resolveAcceptanceRegistrationMode({
        id: 1,
        student_name: 'x',
        state: 'offer_sent',
        decision: {
          decision: 'accepted',
          decision_date: null,
          decision_user: null,
          decision_notes: null,
          conditions: null,
        },
        offer_required: true,
        offer_state: 'sent',
        allowed_actions: {},
      } as AdmissionDetail),
    ).toBe('offer_sent');

    expect(
      resolveAcceptanceRegistrationMode({
        id: 1,
        student_name: 'x',
        state: 'confirmed',
        decision: {
          decision: 'accepted',
          decision_date: null,
          decision_user: null,
          decision_notes: null,
          conditions: null,
        },
        offer_state: 'declined',
        offer_required: true,
        allowed_actions: {},
      } as AdmissionDetail),
    ).toBe('offer_declined');

    expect(resolveOfferRequired({ offer_required: false })).toBe(false);
  });
});

describe('registration requirements + family independence', () => {
  it('76-88. partition + per-child fields', () => {
    const parts = partitionRegistrationRequirements(
      normalizeAdmissionRegistrationRequirements([
        { severity: 'blocking', message: 'a' },
        { severity: 'warning', message: 'b' },
        { severity: 'information', code: 'multi_guardian', message: 'c' },
      ]),
    );
    expect(parts.blocking).toHaveLength(1);
    expect(parts.warning).toHaveLength(1);
    expect(parts.information).toHaveLength(1);

    const childA = normalizeAdmissionListItem({
      id: 10,
      student_name: 'A',
      guardian_name: null,
      guardian_phone: null,
      source: null,
      requested_level: null,
      state: 'new',
      processing_stage: 'new',
      assessment_progress: 'not_started',
      offer_required: false,
      registration_readiness: 'not_applicable',
      next_action: null,
      next_action_date: null,
      duplicate_count: 0,
      offer_state: null,
      assigned_user: null,
      priority: null,
    });
    const childB = normalizeAdmissionListItem({
      id: 11,
      student_name: 'B',
      guardian_name: null,
      guardian_phone: null,
      source: null,
      requested_level: null,
      state: 'accepted',
      processing_stage: 'decision_ready',
      assessment_progress: 'completed',
      offer_required: true,
      registration_readiness: 'awaiting_offer_creation',
      next_action: null,
      next_action_date: null,
      duplicate_count: 0,
      offer_state: 'not_created',
      assigned_user: null,
      priority: null,
    });
    expect(childA.processing_stage).not.toBe(childB.processing_stage);
    expect(childA.assessment_progress).not.toBe(childB.assessment_progress);
    expect(childA.offer_required).not.toBe(childB.offer_required);
    expect(childA.registration_readiness).not.toBe(childB.registration_readiness);

    const pA = resolveAdmissionPrimaryAction({
      ...childA,
      allowed_actions: ALL_ACTIONS,
    });
    const pB = resolveAdmissionPrimaryAction({
      ...childB,
      decision: {
        decision: 'accepted',
        decision_date: null,
        decision_user: null,
        decision_notes: null,
        conditions: null,
      },
      allowed_actions: ALL_ACTIONS,
    });
    expect(pA.key).not.toBe(pB.key);
  });
});

describe('design + i18n', () => {
  it('89-96. locales + original repo markers', () => {
    for (const locale of ['ar', 'en', 'fr', 'es']) {
      const messages = loadMessages(locale);
      expect(messages.admin.admissions.tabs.offer_registration).toBeTruthy();
      expect(messages.admin.admissions.processingStages.initial_follow_up).toBeTruthy();
      expect(messages.admin.admissions.journey.assessment).toBeTruthy();
      expect(messages.admin.admissions.acceptance.beforeDecision).toBeTruthy();
    }
    expect(process.cwd().replace(/\\/g, '/')).toMatch(/school-nexjs$/);
  });
});