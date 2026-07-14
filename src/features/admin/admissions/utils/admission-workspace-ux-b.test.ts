import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  resolveAdmissionPrimaryAction,
  resolveAdmissionSecondaryActions,
  primaryActionExcludesSecondary,
} from './admission-primary-action';
import { resolveAdmissionJourneySteps } from './admission-journey-steps';
import {
  ADMISSION_TABS,
  mapLegacyAdmissionTab,
  parseAdmissionTab,
  shouldCanonicalizeAdmissionTab,
} from './admission-detail-tabs';
import {
  getAdmissionManualStageOptions,
  isAdmissionManualStage,
} from './admission-stage-options';
import { resolveFamilyBatchMixedSummary } from './admission-status-display';

const require = createRequire(import.meta.url);
const messagesRoot = path.resolve(process.cwd(), 'messages');

function loadMessages(locale: string) {
  return require(path.join(messagesRoot, `${locale}.json`));
}

const ALL_ACTIONS = {
  edit: true,
  change_state: true,
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

describe('resolveAdmissionPrimaryAction', () => {
  it('1. registered → open student', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'confirmed',
      student_id: 99,
      registration_status: 'registered',
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('open_student');
    expect(action.target).toEqual({ kind: 'href', href: '/admin/students/99' });
  });

  it('2. registered does not show continue registration', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'confirmed',
      student_id: 99,
      registration_status: 'registered',
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).not.toBe('continue_registration');
  });

  it('3. confirmed without student → continue registration', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'confirmed',
      student_id: false,
      registration_status: 'awaiting_registration',
      decision: 'accepted',
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('continue_registration');
  });

  it('4. confirmed is not a manual stage option', () => {
    expect(isAdmissionManualStage('confirmed')).toBe(false);
    expect(getAdmissionManualStageOptions()).not.toContain('confirmed');
  });

  it('5. offer sent → accept offer when allowed', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'offer_sent',
      decision: 'accepted',
      offer_state: 'sent',
      offers: [{ id: 3, state: 'sent' }],
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('accept_offer');
  });

  it('6. accepted without offer → mark ready for registration', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'accepted',
      decision: 'accepted',
      offer_state: false,
      offer_required: false,
      registration_status: 'awaiting_registration',
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('mark_ready_for_registration');
  });

  it('7. draft offer → send offer when allowed', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'accepted',
      decision: 'accepted',
      offer_state: 'draft',
      offers: [{ id: 2, state: 'draft' }],
      registration_status: 'awaiting_registration',
      allowed_actions: { ...ALL_ACTIONS, create_offer: false },
    });
    expect(action.key).toBe('send_offer');
  });

  it('8. awaiting decision → decide', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'under_review',
      admission_workspace: 'awaiting_decision',
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('decide');
  });

  it('9. needs_reassessment → assessments when decide blocked', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'under_review',
      decision: 'needs_reassessment',
      admission_workspace: 'awaiting_decision',
      allowed_actions: { ...ALL_ACTIONS, decide: false, add_assessment: true },
    });
    expect(action.key).toBe('open_assessments');
  });

  it('10. new → start initial follow-up', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'new',
      processing_stage: 'new',
      admission_workspace: 'follow_up',
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('follow_up_start');
    expect(action.suggestedState).toBe('initial_follow_up');
  });

  it('11. rejected → view rejection', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'lost',
      decision: 'rejected',
      is_school_rejected: true,
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('view_rejection');
  });

  it('12. rejected + reopen allowed → reopen secondary', () => {
    const primary = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'lost',
      decision: 'rejected',
      is_school_rejected: true,
      allowed_actions: ALL_ACTIONS,
    });
    const secondary = resolveAdmissionSecondaryActions(
      {
        id: 10,
        state: 'lost',
        decision: 'rejected',
        is_school_rejected: true,
        allowed_actions: ALL_ACTIONS,
      },
      primary,
    );
    expect(secondary.some((s) => s.key === 'reopen')).toBe(true);
  });

  it('13. closed non-rejected is not school rejection primary', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'cancelled',
      decision: false,
      allowed_actions: ALL_ACTIONS,
    });
    expect(action.key).toBe('readonly');
    expect(action.key).not.toBe('view_rejection');
  });

  it('14. allowed_actions=false blocks action', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'under_review',
      admission_workspace: 'awaiting_decision',
      allowed_actions: { decide: false },
    });
    expect(action.key).not.toBe('decide');
  });

  it('15. always exactly one primary', () => {
    const action = resolveAdmissionPrimaryAction({
      id: 10,
      state: 'qualified',
      processing_stage: 'assessment_ready',
      allowed_actions: ALL_ACTIONS,
    });
    expect(action).toBeTruthy();
    expect(action.key).toBeTruthy();
  });

  it('16. primary key not repeated in secondary', () => {
    const input = {
      id: 10,
      state: 'under_review',
      admission_workspace: 'awaiting_decision' as const,
      allowed_actions: ALL_ACTIONS,
    };
    const primary = resolveAdmissionPrimaryAction(input);
    const secondary = resolveAdmissionSecondaryActions(input, primary);
    expect(primaryActionExcludesSecondary(primary, secondary)).toBe(true);
  });
});

describe('resolveAdmissionJourneySteps', () => {
  it('17. exposes five steps', () => {
    const steps = resolveAdmissionJourneySteps({ state: 'new' });
    expect(steps).toHaveLength(5);
    expect(steps.map((s) => s.id)).toEqual([
      'follow_up',
      'assessment',
      'decision',
      'acceptance',
      'registration',
    ]);
  });

  it('18. decision pending without decision', () => {
    const steps = resolveAdmissionJourneySteps({ state: 'under_review' });
    expect(steps.find((s) => s.id === 'decision')?.status).toBe('current');
  });

  it('19. accepted marks decision complete', () => {
    const steps = resolveAdmissionJourneySteps({
      state: 'accepted',
      decision: 'accepted',
    });
    expect(steps.find((s) => s.id === 'decision')?.status).toBe('complete');
  });

  it('20. rejected makes acceptance and registration not applicable', () => {
    const steps = resolveAdmissionJourneySteps({
      state: 'lost',
      decision: 'rejected',
      is_school_rejected: true,
    });
    expect(steps.find((s) => s.id === 'acceptance')?.status).toBe('not_applicable');
    expect(steps.find((s) => s.id === 'registration')?.status).toBe('not_applicable');
  });

  it('21. offer sent makes acceptance current', () => {
    const steps = resolveAdmissionJourneySteps({
      state: 'offer_sent',
      decision: 'accepted',
      offer_state: 'sent',
      offer_required: true,
    });
    expect(steps.find((s) => s.id === 'acceptance')?.status).toBe('current');
  });

  it('22. confirmed makes registration current/ready', () => {
    const steps = resolveAdmissionJourneySteps({
      state: 'confirmed',
      decision: 'accepted',
      offer_state: 'accepted',
      registration_status: 'awaiting_registration',
    });
    expect(steps.find((s) => s.id === 'registration')?.status).toBe('current');
  });

  it('23. registered makes registration complete', () => {
    const steps = resolveAdmissionJourneySteps({
      state: 'confirmed',
      student_id: 5,
      registration_status: 'registered',
      decision: 'accepted',
    });
    expect(steps.find((s) => s.id === 'registration')?.status).toBe('complete');
  });

  it('24. offer accepted alone does not mark registered', () => {
    const steps = resolveAdmissionJourneySteps({
      state: 'accepted',
      decision: 'accepted',
      offer_state: 'accepted',
      registration_status: 'awaiting_registration',
    });
    expect(steps.find((s) => s.id === 'registration')?.status).not.toBe('complete');
  });
});

describe('manual stages and tabs', () => {
  it('26-28. manual stages only; no confirmed/registered', () => {
    const stages = getAdmissionManualStageOptions();
    expect(stages).toEqual([
      'new',
      'initial_follow_up',
      'assessment_ready',
    ]);
    expect(stages).not.toContain('confirmed');
    expect(stages).not.toContain('registered');
    expect(stages).not.toContain('accepted');
    expect(stages).not.toContain('visit_pending');
    expect(stages).not.toContain('qualified');
  });

  it('30. six tabs or fewer', () => {
    expect(ADMISSION_TABS.length).toBeLessThanOrEqual(6);
    expect(ADMISSION_TABS).toEqual([
      'summary',
      'family_data',
      'assessments_appointments',
      'decision',
      'offer_registration',
      'history',
    ]);
  });

  it('31-35. legacy tab mapping', () => {
    expect(mapLegacyAdmissionTab('guardians')).toBe('family_data');
    expect(mapLegacyAdmissionTab('appointments')).toBe('assessments_appointments');
    expect(mapLegacyAdmissionTab('offers')).toBe('offer_registration');
    expect(mapLegacyAdmissionTab('registration')).toBe('offer_registration');
    expect(mapLegacyAdmissionTab('timeline')).toBe('history');
    expect(parseAdmissionTab('guardians')).toBe('family_data');
  });

  it('36. no canonicalize loop for already canonical tabs', () => {
    expect(shouldCanonicalizeAdmissionTab('family_data', 'family_data')).toBe(false);
    expect(shouldCanonicalizeAdmissionTab('guardians', 'family_data')).toBe(true);
    expect(shouldCanonicalizeAdmissionTab(null, 'summary')).toBe(false);
  });
});

describe('family independence', () => {
  it('38-40. each child primary is independent', () => {
    const registered = resolveAdmissionPrimaryAction({
      id: 1,
      state: 'confirmed',
      student_id: 11,
      registration_status: 'registered',
      allowed_actions: ALL_ACTIONS,
    });
    const awaiting = resolveAdmissionPrimaryAction({
      id: 2,
      state: 'accepted',
      decision: 'accepted',
      registration_status: 'awaiting_registration',
      allowed_actions: ALL_ACTIONS,
    });
    const rejected = resolveAdmissionPrimaryAction({
      id: 3,
      state: 'lost',
      decision: 'rejected',
      is_school_rejected: true,
      allowed_actions: ALL_ACTIONS,
    });
    expect(registered.key).toBe('open_student');
    expect(awaiting.key).toBe('mark_ready_for_registration');
    expect(rejected.key).toBe('view_rejection');
    expect(registered.key).not.toBe(awaiting.key);
    expect(rejected.key).not.toBe(awaiting.key);
  });

  it('41-42. mixed vs unified family summary', () => {
    expect(
      resolveFamilyBatchMixedSummary([
        { state: 'confirmed', registration_status: 'registered', student_id: 1 },
        {
          state: 'accepted',
          decision: 'accepted',
          registration_status: 'awaiting_registration',
        },
      ]),
    ).toBe('mixed');
    expect(
      resolveFamilyBatchMixedSummary([
        { state: 'confirmed', registration_status: 'registered', student_id: 1 },
        { state: 'confirmed', registration_status: 'registered', student_id: 2 },
      ]),
    ).toBe('uniform');
  });
});

describe('i18n Phase B keys', () => {
  it('51. journey/primary/tab keys exist in ar/en/fr/es', () => {
    for (const locale of ['ar', 'en', 'fr', 'es'] as const) {
      const m = loadMessages(locale);
      const adm = m.admin.admissions;
      expect(adm.journey.title).toBeTruthy();
      expect(adm.journey.followUp).toBeTruthy();
      expect(adm.primaryAction.title).toBeTruthy();
      expect(adm.primaryAction.createOffer).toBeTruthy();
      expect(adm.primaryAction.markReady).toBeTruthy();
      expect(adm.actions.markReadySuccess).toBeTruthy();
      expect(adm.decisions.accepted).toBeTruthy();
      expect(adm.tabs.summary).toBeTruthy();
      expect(adm.tabs.family_data).toBeTruthy();
      expect(adm.tabs.offer_registration).toBeTruthy();
      expect(adm.states.under_review).toBeTruthy();
    }
    expect(loadMessages('ar').admin.admissions.states.under_review).toBe('قيد الدراسة');
  });
});
