import { describe, expect, it } from 'vitest';
import {
  formatPrefillMessage,
  formatRegistrationRequirementMessage,
  registrationRequirementListKey,
} from './admission-prefill-display';
import {
  formatOfferStateLabelKey,
  translateOfferStateLabel,
} from './admission-status-display';

const arMessages: Record<string, string> = {
  'admin.admissions.prefill.messages.birthDateMissing': 'تاريخ الميلاد غير محدد.',
  'admin.admissions.prefill.messages.familyBatchGuardianBillingHint':
    'ولي من الطلب العائلي متاح؛ عند وجود أكثر من ولي سيتم ربطهم، أكّد مسؤول الفوترة صراحة أثناء التسجيل.',
  'admin.admissions.prefill.messages.familyApplicationMultipleGuardians':
    'طلب التسجيل العائلي يتضمن أكثر من ولي أمر.',
  'admin.admissions.prefill.messages.billingResponsibilityAtRegistrationStart':
    'يتم اختيار مسؤول الفوترة عند بدء التسجيل.',
  'admin.admissions.prefill.messages.identityDocumentMissingFor':
    'وثيقة الهوية ناقصة لـ {name}.',
  'admin.admissions.prefill.messages.identityDocumentMissing':
    'وثيقة هوية ولي الأمر غير مكتملة.',
  'admin.admissions.offerStates.not_applicable': 'غير منطبق',
  'admin.admissions.outcomeSummary.offerNone': 'لا يوجد عرض',
};

function t(key: string, params?: Record<string, string | number>): string {
  const template = arMessages[key] ?? key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (out, [name, value]) => out.replace(`{${name}}`, String(value)),
    template,
  );
}

describe('formatPrefillMessage', () => {
  it('translates known exact English warnings', () => {
    expect(formatPrefillMessage('Birth date is missing.', t)).toBe('تاريخ الميلاد غير محدد.');
  });

  it('translates identity-missing-for-name warnings', () => {
    expect(formatPrefillMessage('Identity document is missing for ولي الامر.', t)).toBe(
      'وثيقة الهوية ناقصة لـ ولي الامر.',
    );
    expect(formatPrefillMessage('Identity document is missing for ولية الامر.', t)).toBe(
      'وثيقة الهوية ناقصة لـ ولية الامر.',
    );
  });

  it('translates family multi-guardian and billing information messages', () => {
    expect(formatPrefillMessage('Family application has multiple guardians.', t)).toBe(
      'طلب التسجيل العائلي يتضمن أكثر من ولي أمر.',
    );
    expect(
      formatPrefillMessage('Billing responsibility is selected when registration starts.', t),
    ).toBe('يتم اختيار مسؤول الفوترة عند بدء التسجيل.');
  });
});

describe('formatRegistrationRequirementMessage', () => {
  it('prefers message translation and keeps unique list keys', () => {
    expect(
      formatRegistrationRequirementMessage(
        {
          code: 'guardian_identity_missing',
          message: 'Identity document is missing for ولي الامر.',
        },
        t,
      ),
    ).toBe('وثيقة الهوية ناقصة لـ ولي الامر.');

    expect(
      formatRegistrationRequirementMessage(
        { code: 'birth_date_missing', message: 'Birth date is missing.' },
        t,
      ),
    ).toBe('تاريخ الميلاد غير محدد.');

    const keyA = registrationRequirementListKey(
      {
        code: 'guardian_identity_missing',
        message: 'Identity document is missing for ولي الامر.',
      },
      0,
      'warning',
    );
    const keyB = registrationRequirementListKey(
      {
        code: 'guardian_identity_missing',
        message: 'Identity document is missing for ولية الامر.',
      },
      1,
      'warning',
    );
    expect(keyA).not.toBe(keyB);
  });
});

describe('offer state labels', () => {
  it('maps not_applicable to a real i18n key', () => {
    expect(formatOfferStateLabelKey('not_applicable')).toBe(
      'admin.admissions.offerStates.not_applicable',
    );
    expect(translateOfferStateLabel('not_applicable', t)).toBe('غير منطبق');
  });

  it('never returns a raw missing key', () => {
    expect(translateOfferStateLabel('unknown_state_xyz', t)).toBe('غير منطبق');
  });
});
