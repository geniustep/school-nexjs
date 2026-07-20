import { describe, expect, it } from 'vitest';
import {
  presentLastStatusReasonNote,
  resolveLastStatusReason,
} from './admission-last-status-reason';

const labels: Record<string, string> = {
  'admin.admissions.applicationStatus.new': 'جديد',
  'admin.admissions.applicationStatus.follow_up': 'قيد المتابعة',
  'admin.admissions.applicationStatus.in_assessment': 'قيد التقييم',
  'admin.admissions.applicationStatus.accepted': 'مقبول',
  'admin.admissions.applicationStatus.ready_for_registration': 'جاهز للتسجيل',
  'admin.admissions.lastStatusReason.transition': 'نقل من {from} إلى {to}',
  'admin.admissions.lastStatusReason.transitionWithNote': 'نقل من {from} إلى {to}: {note}',
  'admin.admissions.lastStatusReason.phrases.familyApproved': 'موافقة الأسرة على التسجيل',
  'admin.admissions.lastStatusReason.phrases.acceptedAndFamilyApproved':
    'قبول المدرسة مع تسجيل موافقة الأسرة',
  'admin.admissions.lastStatusReason.phrases.decisionAccepted': 'قرار القبول',
  'admin.admissions.lastStatusReason.phrases.decisionAcceptedWithCondition':
    'قبول بشروط',
};

function t(key: string, vars?: Record<string, string | number>) {
  let out = labels[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}

describe('resolveLastStatusReason', () => {
  it('uses terminal rejection reason when status is rejected', () => {
    expect(
      resolveLastStatusReason({
        application_status: 'rejected',
        rejection: { is_rejected: true, reason: 'مستندات ناقصة' },
        last_action: { code: 'change_status', note: 'نقل سابق' },
      }),
    ).toBe('مستندات ناقصة');
  });

  it('uses last_action.note for change_status', () => {
    expect(
      resolveLastStatusReason({
        application_status: 'follow_up',
        last_action: {
          code: 'change_status',
          note: 'الأسرة طلبت المتابعة الأسبوع القادم',
        },
      }),
    ).toBe('الأسرة طلبت المتابعة الأسبوع القادم');
  });

  it('uses closure lost_reason when closed', () => {
    expect(
      resolveLastStatusReason({
        application_status: 'closed',
        lost_reason: 'انسحاب الأسرة',
      }),
    ).toBe('انسحاب الأسرة');
  });
});

describe('presentLastStatusReasonNote', () => {
  it('translates new → in_assessment machine markers', () => {
    expect(presentLastStatusReasonNote('new → in_assessment:', { t })).toBe(
      'نقل من جديد إلى قيد التقييم',
    );
    expect(presentLastStatusReasonNote('new → in_assessment: غ', { t })).toBe(
      'نقل من جديد إلى قيد التقييم',
    );
    expect(
      presentLastStatusReasonNote('in_assessment → follow_up: تثسن', { t }),
    ).toBe('نقل من قيد التقييم إلى قيد المتابعة: تثسن');
  });

  it('translates previous_status / new_status parenthetical markers', () => {
    expect(
      presentLastStatusReasonNote(
        'Family approved registration. (previous_status=accepted → new_status=ready_for_registration).',
        { t },
      ),
    ).toBe('موافقة الأسرة على التسجيل — نقل من مقبول إلى جاهز للتسجيل');
  });

  it('localizes common English system phrases', () => {
    expect(presentLastStatusReasonNote('Decision made: Accepted.', { t })).toBe('قرار القبول');
    expect(
      presentLastStatusReasonNote('Decision made: Accepted with Condition.\nتجربة مقبول بشروط', {
        t,
      }),
    ).toBe('قبول بشروط — تجربة مقبول بشروط');
  });
});
