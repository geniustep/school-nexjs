import { describe, expect, it, vi } from 'vitest';
import type { BillingResponsibilityOutcome } from '@/types/billing-responsibility';
import {
  composePostCreateBillingOutcomeResolution,
  resolvePostCreateBillingOutcome,
} from './resolve-post-create-billing-outcome';

const unresolvedInitial: BillingResponsibilityOutcome = {
  metadata: {
    mode: 'guardian',
    status: 'unresolved',
    source: 'guardian_unresolved',
  },
  collectionAllowed: false,
};

const resolvedAfterLink: BillingResponsibilityOutcome = {
  metadata: {
    mode: 'guardian',
    status: 'resolved',
    source: 'guardian_explicit',
  },
  collectionAllowed: true,
};

const resolvedStudentExplicit: BillingResponsibilityOutcome = {
  metadata: {
    mode: 'student',
    status: 'resolved',
    source: 'student_explicit',
  },
  collectionAllowed: null,
};

describe('composePostCreateBillingOutcomeResolution', () => {
  it('T1 — stale outcome regression: link resolves to final resolved outcome', () => {
    const result = composePostCreateBillingOutcomeResolution(unresolvedInitial, {
      guardianLinkSucceeded: true,
      refreshedOutcome: resolvedAfterLink,
      refreshFailed: false,
    });

    expect(result.billingResponsibilityUnresolved).toBe(false);
    expect(result.showUnresolvedWarningToast).toBe(false);
    expect(result.finalOutcome.metadata?.status).toBe('resolved');
  });

  it('T2 — still unresolved after link keeps warning and block', () => {
    const result = composePostCreateBillingOutcomeResolution(unresolvedInitial, {
      guardianLinkSucceeded: true,
      refreshedOutcome: unresolvedInitial,
      refreshFailed: false,
    });

    expect(result.billingResponsibilityUnresolved).toBe(true);
    expect(result.showUnresolvedWarningToast).toBe(true);
    expect(result.finalOutcome.metadata?.status).toBe('unresolved');
  });

  it('T3 — no guardian link retains initial unresolved outcome', () => {
    const result = composePostCreateBillingOutcomeResolution(unresolvedInitial, {
      guardianLinkSucceeded: false,
      refreshedOutcome: null,
      refreshFailed: false,
    });

    expect(result.billingResponsibilityUnresolved).toBe(true);
    expect(result.showUnresolvedWarningToast).toBe(true);
    expect(result.finalOutcome).toEqual(unresolvedInitial);
  });

  it('T4 — refresh failure stays conservative without definite unresolved toast', () => {
    const result = composePostCreateBillingOutcomeResolution(unresolvedInitial, {
      guardianLinkSucceeded: true,
      refreshedOutcome: null,
      refreshFailed: true,
    });

    expect(result.billingResponsibilityUnresolved).toBe(true);
    expect(result.showUnresolvedWarningToast).toBe(false);
    expect(result.showRefreshVerificationToast).toBe(true);
    expect(result.finalOutcome).toEqual(unresolvedInitial);
  });

  it('T8 — unresolved control keeps block true', () => {
    const result = composePostCreateBillingOutcomeResolution(unresolvedInitial, {
      guardianLinkSucceeded: false,
      refreshedOutcome: null,
      refreshFailed: false,
    });

    expect(result.billingResponsibilityUnresolved).toBe(true);
  });
});

describe('resolvePostCreateBillingOutcome', () => {
  it('T5 — student explicit path does not call guardian refresh', async () => {
    const fetchAuthoritative = vi.fn();

    const result = await resolvePostCreateBillingOutcome(
      {
        studentId: 42,
        initialOutcome: resolvedStudentExplicit,
        guardianLinkSucceeded: false,
        activeSchoolId: 3,
      },
      fetchAuthoritative,
    );

    expect(fetchAuthoritative).not.toHaveBeenCalled();
    expect(result.billingResponsibilityUnresolved).toBe(false);
    expect(result.showUnresolvedWarningToast).toBe(false);
    expect(result.finalOutcome).toEqual(resolvedStudentExplicit);
  });

  it('T6 — guardian link failure does not refresh authoritative state', async () => {
    const fetchAuthoritative = vi.fn();

    const result = await resolvePostCreateBillingOutcome(
      {
        studentId: 42,
        initialOutcome: unresolvedInitial,
        guardianLinkSucceeded: false,
        activeSchoolId: 3,
      },
      fetchAuthoritative,
    );

    expect(fetchAuthoritative).not.toHaveBeenCalled();
    expect(result.billingResponsibilityUnresolved).toBe(true);
    expect(result.showRefreshVerificationToast).toBe(false);
  });

  it('T7 — resolved post-link passes false billingResponsibilityUnresolved', async () => {
    const fetchAuthoritative = vi.fn(async () => resolvedAfterLink);

    const result = await resolvePostCreateBillingOutcome(
      {
        studentId: 42,
        initialOutcome: unresolvedInitial,
        guardianLinkSucceeded: true,
        activeSchoolId: 3,
      },
      fetchAuthoritative,
    );

    expect(fetchAuthoritative).toHaveBeenCalledWith(42, 3);
    expect(result.billingResponsibilityUnresolved).toBe(false);
    expect(result.showUnresolvedWarningToast).toBe(false);
  });

  it('refreshes authoritative state only after successful guardian link', async () => {
    const fetchAuthoritative = vi.fn(async () => resolvedAfterLink);

    await resolvePostCreateBillingOutcome(
      {
        studentId: 99,
        initialOutcome: unresolvedInitial,
        guardianLinkSucceeded: true,
        activeSchoolId: 3,
      },
      fetchAuthoritative,
    );

    expect(fetchAuthoritative).toHaveBeenCalledOnce();
  });
});
