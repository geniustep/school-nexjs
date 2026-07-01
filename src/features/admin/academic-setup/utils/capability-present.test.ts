import { describe, expect, it } from 'vitest';
import { resolveCapabilityLabel } from './capability-present';

describe('resolveCapabilityLabel', () => {
  it('translates admission capability codes via i18n map', () => {
    expect(
      resolveCapabilityLabel('ar', { code: 'admission.create', label: 'create' }),
    ).toBe('إنشاء طلب تسجيل');
  });

  it('translates finance social discount code', () => {
    expect(
      resolveCapabilityLabel('ar', {
        code: 'finance.apply_social_discount',
        label: 'Finance — Apply Social Discount',
      }),
    ).toBe('تطبيق خصم اجتماعي');
  });

  it('translates underscore student capability codes', () => {
    expect(
      resolveCapabilityLabel('ar', {
        code: 'link_to_student',
        label: 'link to student',
        category: 'registration',
      }),
    ).toBe('ربط تلميذ بطلب تسجيل');
  });

  it('translates English API labels for guardian links', () => {
    expect(
      resolveCapabilityLabel('ar', {
        code: 'student.manage_student_guardian_links',
        label: 'Manage Student–Guardian Links',
        category: 'registration',
      }),
    ).toBe('إدارة روابط التلميذ وأولياء الأمور');
  });

  it('translates descriptive English API labels for guardians', () => {
    expect(
      resolveCapabilityLabel('ar', {
        code: 'guardian.create',
        label: 'Create Guardians',
        category: 'registration',
      }),
    ).toBe('إنشاء ولي أمر');
    expect(
      resolveCapabilityLabel('ar', {
        code: 'student.update_limited',
        label: 'Update Students (Limited Registration Fields)',
        category: 'registration',
      }),
    ).toBe('تعديل محدود لبيانات التلميذ');
  });
});
