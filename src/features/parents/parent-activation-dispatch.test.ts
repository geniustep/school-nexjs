import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildParentActivationDispatchBody,
  canStartParentActivationDispatch,
  getParentActivationDispatchCopy,
  getParentActivationDispatchFailureLabel,
  getParentActivationDispatchStatusMeta,
  parentActivationDispatchResultHasSensitiveFields,
  summarizeParentActivationDispatch,
} from './parent-activation-dispatch';
import type { ParentActivationCampaignDispatch } from '@/types/parent-activation-campaign';

function dispatchFixture(
  statuses: string[],
): ParentActivationCampaignDispatch {
  return {
    campaign_id: 8,
    state: 'prepared',
    counts: {
      total: statuses.length,
      queued: statuses.filter((status) => status === 'queued').length,
      already_processed: statuses.filter((status) => status === 'already_processed').length,
      excluded: statuses.filter((status) => status === 'excluded').length,
      failed: statuses.filter((status) => status === 'failed').length,
    },
    results: statuses.map((status, index) => ({
      recipient_id: index + 1,
      parent_id: 100 + index,
      parent_name: `Parent ${index + 1}`,
      status,
      exclusion_reason: status === 'excluded' ? 'communication_not_allowed' : null,
      error_code: status === 'failed' ? 'messaging_rejected' : null,
    })),
  };
}

describe('parent activation campaign dispatch UX contract', () => {
  it('targets the governed campaign dispatch child endpoint', () => {
    expect(`${endpoints.admin.parentActivationCampaign(42)}/dispatch`).toBe(
      '/admin/parent-activation-campaigns/42/dispatch',
    );
  });

  it('builds an exact empty dispatch body with no recipient override', () => {
    const body = buildParentActivationDispatchBody();
    expect(body).toEqual({});
    expect(Object.keys(body)).toEqual([]);
    expect(JSON.stringify(body)).toBe('{}');
  });

  it('disables dispatch when ready is zero or a dispatch is already running', () => {
    expect(canStartParentActivationDispatch(0, false)).toBe(false);
    expect(canStartParentActivationDispatch(3, true)).toBe(false);
    expect(canStartParentActivationDispatch(3, false)).toBe(true);
  });

  it('summarizes queued, already processed, excluded and failed results independently', () => {
    const summary = summarizeParentActivationDispatch(
      dispatchFixture(['queued', 'already_processed', 'excluded', 'failed', 'queued']),
    );
    expect(summary).toEqual({
      total: 5,
      queued: 2,
      alreadyProcessed: 1,
      excluded: 1,
      failed: 1,
      unknown: 0,
    });
  });

  it('keeps partial success visible instead of collapsing it into total failure', () => {
    const summary = summarizeParentActivationDispatch(
      dispatchFixture(['queued', 'failed', 'already_processed']),
    );
    expect(summary.queued + summary.alreadyProcessed).toBe(2);
    expect(summary.failed).toBe(1);
  });

  it('uses a safe fallback for a future unknown status', () => {
    const summary = summarizeParentActivationDispatch(dispatchFixture(['future_state']));
    const meta = getParentActivationDispatchStatusMeta('ar', 'future_state');
    expect(summary.unknown).toBe(1);
    expect(meta).toEqual({ label: 'حالة غير معروفة', tone: 'slate' });
    expect(meta.label).not.toContain('future_state');
  });

  it('never exposes an unknown backend error code in the user-facing label', () => {
    const label = getParentActivationDispatchFailureLabel('ar', 'backend_internal_detail');
    expect(label).toBe(getParentActivationDispatchCopy('ar').genericRecipientFailure);
    expect(label).not.toContain('backend_internal_detail');
  });

  it('maps known messaging failure classes without showing raw codes', () => {
    expect(getParentActivationDispatchFailureLabel('ar', 'entitlement_disabled')).toBe(
      'خدمة الإرسال غير مفعلة لهذه المؤسسة.',
    );
    expect(getParentActivationDispatchFailureLabel('ar', 'messaging_rejected')).toBe(
      'تعذر الوصول إلى خدمة الرسائل أو قبول طلب الإرسال.',
    );
  });

  it('detects forbidden sensitive fields if a future response shape accidentally adds them', () => {
    const safeRow = dispatchFixture(['queued']).results[0];
    expect(parentActivationDispatchResultHasSensitiveFields(safeRow)).toBe(false);
    expect(parentActivationDispatchResultHasSensitiveFields({
      ...safeRow,
      token: 'must-not-render',
    } as typeof safeRow)).toBe(true);
  });
});
