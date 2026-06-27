import { describe, expect, it } from 'vitest';
import type { StudentFinanceWorkspace } from '../types';
import { resolveParallelDraftAgreementsPresentation } from './resolve-parallel-draft-agreements';

describe('resolveParallelDraftAgreementsPresentation', () => {
  it('shows banner when current is active and a parallel draft exists in agreements_summary', () => {
    const workspace = {
      billing_context: { has_active_agreement: true, mode: 'active_agreement' },
      current_agreement: {
        id: 248,
        student_id: 854,
        state: 'active',
        number: 'Special agreement — raqeem 2025-2026',
      },
      agreements_summary: [
        { id: 248, state: 'active', number: 'Special agreement — raqeem 2025-2026' },
        { id: 245, state: 'draft', number: 'FA/2026/00225', source: 'manual' },
      ],
    } as StudentFinanceWorkspace;

    const result = resolveParallelDraftAgreementsPresentation({ workspace, studentId: 854 });

    expect(result.showBanner).toBe(true);
    expect(result.count).toBe(1);
    expect(result.primaryDraftId).toBe(245);
    expect(result.primaryDraftHref).toBe('/admin/finance/agreements/245');
    expect(result.financeHubListHref).toBe('/admin/finance/agreements?student_id=854');
  });

  it('hides banner when only an active agreement exists', () => {
    const workspace = {
      billing_context: { has_active_agreement: true },
      current_agreement: { id: 248, student_id: 854, state: 'active' },
      agreements_summary: [{ id: 248, state: 'active' }],
    } as StudentFinanceWorkspace;

    const result = resolveParallelDraftAgreementsPresentation({ workspace, studentId: 854 });

    expect(result.showBanner).toBe(false);
    expect(result.count).toBe(0);
  });

  it('does not break when current is draft-only without an active agreement', () => {
    const workspace = {
      billing_context: { has_active_agreement: false },
      current_agreement: { id: 245, student_id: 854, state: 'draft', number: 'FA/2026/00225' },
      agreements_summary: [{ id: 245, state: 'draft', number: 'FA/2026/00225' }],
    } as StudentFinanceWorkspace;

    const result = resolveParallelDraftAgreementsPresentation({ workspace, studentId: 854 });

    expect(result.showBanner).toBe(false);
  });

  it('counts multiple parallel drafts and links to the newest draft id', () => {
    const workspace = {
      billing_context: { has_active_agreement: true },
      current_agreement: { id: 248, student_id: 854, state: 'active' },
      agreements_summary: [
        { id: 248, state: 'active' },
        { id: 240, state: 'draft', number: 'FA/2026/00220' },
        { id: 245, state: 'draft', number: 'FA/2026/00225' },
      ],
    } as StudentFinanceWorkspace;

    const result = resolveParallelDraftAgreementsPresentation({ workspace, studentId: 854 });

    expect(result.showBanner).toBe(true);
    expect(result.count).toBe(2);
    expect(result.primaryDraftId).toBe(245);
    expect(result.primaryDraftHref).toBe('/admin/finance/agreements/245');
  });

  it('skips draft already exposed via inactive_agreement', () => {
    const workspace = {
      billing_context: { has_active_agreement: true },
      current_agreement: { id: 248, student_id: 854, state: 'active' },
      inactive_agreement: { id: 245, state: 'draft' },
      agreements_summary: [
        { id: 248, state: 'active' },
        { id: 245, state: 'draft', number: 'FA/2026/00225' },
      ],
    } as StudentFinanceWorkspace;

    const result = resolveParallelDraftAgreementsPresentation({ workspace, studentId: 854 });

    expect(result.showBanner).toBe(false);
  });
});
