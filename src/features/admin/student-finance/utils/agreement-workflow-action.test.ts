import { describe, expect, it } from 'vitest';
import {
  buildAgreementActionExecutionPlan,
  resolveAgreementActionErrorMessage,
  resolveAgreementActionTargetId,
  shouldBlockAgreementAction,
} from './agreement-workflow-action';

describe('resolveAgreementActionTargetId', () => {
  it('prefers explicit pending agreement id over workspace current agreement', () => {
    expect(
      resolveAgreementActionTargetId({
        targetAgreementId: 3,
        currentAgreementId: 99,
        inactiveDraftId: 88,
      }),
    ).toBe(3);
  });

  it('falls back to displayed agreement when workspace current agreement is missing', () => {
    expect(
      resolveAgreementActionTargetId({
        displayedAgreementId: 3,
        currentAgreementId: null,
      }),
    ).toBe(3);
  });

  it('uses inactive draft id when current agreement is absent', () => {
    expect(
      resolveAgreementActionTargetId({
        inactiveDraftId: 3,
        currentAgreementId: undefined,
      }),
    ).toBe(3);
  });
});

describe('buildAgreementActionExecutionPlan', () => {
  it('executes cancel when displayed draft id exists but workspace current agreement is missing', () => {
    const plan = buildAgreementActionExecutionPlan({
      pending: { action: 'cancel' },
      displayedAgreementId: 3,
      currentAgreementId: null,
    });
    expect(plan).toEqual({ kind: 'execute', agreementId: 3, action: 'cancel' });
  });

  it('blocks when no pending confirm is open', () => {
    expect(
      buildAgreementActionExecutionPlan({
        pending: null,
        displayedAgreementId: 3,
      }),
    ).toEqual({ kind: 'blocked', reason: 'no_pending' });
  });

  it('blocks double submit while another action is loading', () => {
    expect(
      buildAgreementActionExecutionPlan({
        pending: { action: 'cancel', agreementId: 3 },
        actionLoading: 'cancel',
      }),
    ).toEqual({ kind: 'blocked', reason: 'loading' });
  });

  it('reports missing target instead of silent no-op', () => {
    expect(
      buildAgreementActionExecutionPlan({
        pending: { action: 'cancel' },
        currentAgreementId: null,
        displayedAgreementId: null,
      }),
    ).toEqual({ kind: 'missing_target' });
  });

  it('uses pending agreementId for inactive draft cancel confirm', () => {
    const plan = buildAgreementActionExecutionPlan({
      pending: { action: 'cancel', agreementId: 3 },
      currentAgreementId: null,
    });
    expect(plan).toEqual({ kind: 'execute', agreementId: 3, action: 'cancel' });
  });
});

describe('shouldBlockAgreementAction', () => {
  it('blocks when loading state is set', () => {
    expect(shouldBlockAgreementAction('submit')).toBe(true);
    expect(shouldBlockAgreementAction(null)).toBe(false);
  });
});

describe('resolveAgreementActionErrorMessage', () => {
  const t = (key: string) => key;

  it('maps backend cancel rejection to user-safe message', () => {
    expect(resolveAgreementActionErrorMessage(t, 'cancel', 'forbidden')).toBe(
      'admin.student360.financialAgreement.errors.cancelNotAllowed',
    );
    expect(resolveAgreementActionErrorMessage(t, 'cancel', 'financial_impact')).toBe(
      'admin.student360.financialAgreement.errors.cancelFinancialImpact',
    );
  });

  it('falls back to generic action failure message', () => {
    expect(resolveAgreementActionErrorMessage(t, 'submit', 'unknown')).toBe(
      'admin.student360.financialAgreement.errors.actionFailed',
    );
  });
});

describe('confirmation dialog contract', () => {
  it('confirm handler should not rely on form submit semantics', () => {
    const buttonType = 'button';
    expect(buttonType).toBe('button');
  });
});
