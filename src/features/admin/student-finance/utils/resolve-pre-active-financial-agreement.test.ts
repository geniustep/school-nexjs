import { describe, expect, it } from 'vitest';
import {
  buildStudentFinanceAgreementsHref,
  isPreActiveAgreementState,
  resolvePreActiveFinancialAgreement,
  shouldBlockAssignPlanForPreActiveAgreement,
} from './resolve-pre-active-financial-agreement';
import {
  resolveDraftAgreementPresentation,
  shouldSuppressFinanceEmptyState,
} from './resolve-draft-agreement-presentation';
import { resolveAssignErrorMessage } from '@/features/admin/finance/fee-plan-assign-errors';
import type { FinancialAgreement } from '../types';

const draftFromList: FinancialAgreement[] = [
  {
    id: 3,
    student_id: 5,
    state: 'draft',
    number: 'FA/2026/00003',
    academic_year_id: 1,
  },
];

describe('resolvePreActiveFinancialAgreement', () => {
  it('detects draft agreement from financial agreements list', () => {
    expect(
      resolvePreActiveFinancialAgreement({
        agreementsList: draftFromList,
        academicYearId: 1,
      }),
    ).toEqual({ id: 3, state: 'draft', number: 'FA/2026/00003' });
  });

  it('detects pending and approved states', () => {
    expect(isPreActiveAgreementState('pending_approval')).toBe(true);
    expect(isPreActiveAgreementState('approved')).toBe(true);
    expect(isPreActiveAgreementState('active')).toBe(false);
  });

  it('blocks assign-plan when pre-active agreement exists', () => {
    expect(
      shouldBlockAssignPlanForPreActiveAgreement(
        resolvePreActiveFinancialAgreement({ agreementsList: draftFromList }),
      ),
    ).toBe(true);
    expect(shouldBlockAssignPlanForPreActiveAgreement(null)).toBe(false);
  });

  it('builds agreements subtab href for review draft CTA', () => {
    expect(buildStudentFinanceAgreementsHref(5)).toBe(
      '/admin/students/5?tab=finance&financeSubTab=agreements',
    );
  });
});

describe('resolveDraftAgreementPresentation with agreements list', () => {
  it('shows draft card scenario via hasDraftAgreement from list only', () => {
    const presentation = resolveDraftAgreementPresentation({
      agreementsList: draftFromList,
      academicYearId: 1,
    });
    expect(presentation.hasDraftAgreement).toBe(true);
    expect(presentation.agreementId).toBe(3);
    expect(shouldSuppressFinanceEmptyState(presentation)).toBe(true);
  });

  it('does not suppress empty state when no agreement exists', () => {
    const presentation = resolveDraftAgreementPresentation({});
    expect(presentation.hasDraftAgreement).toBe(false);
    expect(shouldSuppressFinanceEmptyState(presentation)).toBe(false);
  });
});

describe('assign-plan duplicate error translation', () => {
  const t = (key: string) => key;

  it('translates raw already-assigned backend message with fallback when no setup context', () => {
    expect(
      resolveAssignErrorMessage(
        'business_error',
        'Fees from this plan were already assigned to the student.',
        t,
      ),
    ).toBe('admin.finance.assignErrors.feesAlreadyAssignedFallback');
  });

  it('maps fee_plan_already_assigned code using setup context', () => {
    expect(resolveAssignErrorMessage('fee_plan_already_assigned', '', t, 'pre_active_agreement')).toBe(
      'admin.finance.assignErrors.draftAgreementBlocksAssignPlan',
    );
  });
});

describe('active agreement unchanged', () => {
  it('does not treat active agreement as pre-active', () => {
    expect(
      resolvePreActiveFinancialAgreement({
        workspaceAgreement: { id: 9, student_id: 5, state: 'active' },
      }),
    ).toBeNull();
  });
});
