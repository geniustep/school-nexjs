import { describe, expect, it } from 'vitest';
import {
  resolveAdmissionTerminalReasonPanel,
  resolveClosureReason,
  type AdmissionTerminalReasonSource,
} from './admission-terminal-reason';

/** Raw-like fixture that may include fields the normalized source type omits. */
function terminalSource(
  fields: AdmissionTerminalReasonSource & {
    primary_next_action?: unknown;
  },
): AdmissionTerminalReasonSource {
  return fields;
}

describe('resolveClosureReason', () => {
  it('prefers lost_reason from detail contract', () => {
    expect(
      resolveClosureReason({
        lost_reason: 'Family withdrew',
        last_action: { code: 'close', note: 'Other note' },
      }),
    ).toBe('Family withdrew');
  });

  it('uses last_action.note when last action is close (list payload)', () => {
    expect(
      resolveClosureReason({
        lost_reason: null,
        last_action: {
          code: 'close',
          note: 'أُغلق الطلب التجريبي بعد التحقق من مسار الإغلاق.',
        },
      }),
    ).toBe('أُغلق الطلب التجريبي بعد التحقق من مسار الإغلاق.');
  });

  it('ignores last_action.note when code is not close', () => {
    expect(
      resolveClosureReason({
        lost_reason: false,
        last_action: { code: 'log_contact', note: 'called guardian' },
      }),
    ).toBe('');
  });
});

describe('resolveAdmissionTerminalReasonPanel', () => {
  it('rejected → rejection title keys and rejection.reason text', () => {
    const panel = resolveAdmissionTerminalReasonPanel(
      terminalSource({
        application_status: 'rejected',
        rejection: { is_rejected: true, reason: 'Incomplete documents' },
        primary_next_action: { code: 'reopen' },
      }),
    );
    expect(panel).toMatchObject({
      kind: 'rejected',
      titleKey: 'admin.admissions.terminalReason.rejectionTitle',
      emptyKey: 'admin.admissions.terminalReason.noRejectionReason',
      reason: 'Incomplete documents',
    });
  });

  it('closed → closure title keys and lost_reason / last_action note', () => {
    const panel = resolveAdmissionTerminalReasonPanel(
      terminalSource({
        application_status: 'closed',
        lost_reason: 'Capacity full',
        primary_next_action: { code: 'reopen' },
      }),
    );
    expect(panel).toMatchObject({
      kind: 'closed',
      titleKey: 'admin.admissions.terminalReason.closureTitle',
      emptyKey: 'admin.admissions.terminalReason.noClosureReason',
      reason: 'Capacity full',
    });
  });

  it('does not invent reason from primary_next_action', () => {
    const panel = resolveAdmissionTerminalReasonPanel(
      terminalSource({
        application_status: 'closed',
        lost_reason: null,
        last_action: null,
        primary_next_action: { code: 'reopen', label: 'إعادة فتح' },
      }),
    );
    expect(panel?.reason).toBe('');
    expect(panel?.emptyKey).toBe('admin.admissions.terminalReason.noClosureReason');
  });

  it('rejected without reason uses empty fallback key (caller renders copy)', () => {
    const panel = resolveAdmissionTerminalReasonPanel({
      application_status: 'rejected',
      rejection: { is_rejected: true, reason: null },
    });
    expect(panel?.reason).toBe('');
    expect(panel?.emptyKey).toBe('admin.admissions.terminalReason.noRejectionReason');
  });

  it('non-terminal statuses stay on next-action path (null panel)', () => {
    expect(
      resolveAdmissionTerminalReasonPanel(
        terminalSource({
          application_status: 'follow_up',
          primary_next_action: { code: 'log_contact' },
        }),
      ),
    ).toBeNull();
    expect(
      resolveAdmissionTerminalReasonPanel(
        terminalSource({
          application_status: 'accepted',
          primary_next_action: { code: 'convert_to_student' },
        }),
      ),
    ).toBeNull();
  });
});
