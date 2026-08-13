import { describe, expect, it } from 'vitest';
import { resolveAssessmentProgress, resolveProcessingStage, resolveRegistrationReadiness } from './admission-assessment-workflow-contract';
import { normalizeAdmissionDetail, normalizeAdmissionListItem } from './normalize-admission-record';
import type { AdmissionDetail } from '@/types/admission';

describe('API contract + normalization', () => {
  it('1-3. processing_stage from list/detail/family-shaped payloads', () => {
    const list = normalizeAdmissionListItem({ id: 1, student_name: 'A', guardian_name: null, guardian_phone: null, source: null, requested_level: null, state: 'contacted', processing_stage: 'initial_follow_up', next_action: null, next_action_date: null, duplicate_count: 0, offer_state: null, assigned_user: null, priority: null });
    expect(list.processing_stage).toBe('initial_follow_up');
    const detail = normalizeAdmissionDetail({ id: 2, student_name: 'B', state: 'new', processing_stage: 'assessment_ready', allowed_actions: {} } as AdmissionDetail);
    expect(detail.processing_stage).toBe('assessment_ready');
    const familyChild = normalizeAdmissionListItem({ id: 3, student_name: 'C', guardian_name: null, guardian_phone: null, source: null, requested_level: null, state: 'qualified', next_action: null, next_action_date: null, duplicate_count: 0, offer_state: null, assigned_user: null, priority: null });
    expect(familyChild.processing_stage).toBe('assessment_ready');
  });

  it('4-9. assessment/offer/readiness/requirements/next_action typed', () => {
    const detail = normalizeAdmissionDetail({ id: 4, student_name: 'D', state: 'under_review', assessment_progress: 'in_progress', assessment_summary: { required_count: 2, completed_count: 1, progress: 'in_progress' }, offer_required: true, offer_state: 'not_created', registration_readiness: 'awaiting_offer_creation', registration_requirements: [{ severity: 'blocking', message: 'need docs' }, { severity: 'warning', message: 'warn' }, { severity: 'information', message: 'multi guardian' }], next_action: { code: 'create_offer', label: 'Create offer' }, allowed_actions: {} } as AdmissionDetail);
    expect(detail.assessment_progress).toBe('in_progress');
    expect(detail.assessment_summary?.required_count).toBe(2);
    expect(detail.offer_required).toBe(true);
    expect(detail.registration_readiness).toBe('awaiting_offer_creation');
    expect(detail.registration_requirements).toHaveLength(3);
    expect(detail.next_action).toMatchObject({ code: 'create_offer' });
  });

  it('10. Backend fields win over legacy fallback', () => {
    expect(resolveProcessingStage({ processing_stage: 'assessment_ready', state: 'contacted' })).toBe('assessment_ready');
    expect(resolveAssessmentProgress({ assessment_progress: 'completed', assessment_summary: { progress: 'not_started' } })).toBe('completed');
    expect(resolveRegistrationReadiness({ registration_readiness: 'blocked', registration_status: 'ready' as never })).toBe('blocked');
  });
});
