import { describe, expect, it } from 'vitest';
import { translateStudentDepartureMessage } from './student-departure-messages';

describe('student departure financial copy', () => {
  it('uses the clarified Arabic wording', () => {
    expect(translateStudentDepartureMessage('ar', 'admin.student360.departure.financialPolicy')).toBe('معالجة الرسوم عند المغادرة');
    expect(translateStudentDepartureMessage('ar', 'admin.student360.departure.policy.full')).toBe('احتساب الفترة الحالية كاملة');
    expect(translateStudentDepartureMessage('ar', 'admin.student360.departure.policy.prorate')).toBe('الاحتساب حتى تاريخ المغادرة');
    expect(translateStudentDepartureMessage('ar', 'admin.student360.departure.policy.keep')).toBe('الإبقاء على الوضع المالي الحالي');
    expect(translateStudentDepartureMessage('ar', 'admin.student360.departure.policy.unavailable')).toBe('غير متاح لهذه الحالة');
  });

  it.each([
    ['fr', 'Traitement des frais au départ', 'Facturer jusqu’à la date de départ'],
    ['en', 'Departure fee handling', 'Charge through the departure date'],
    ['es', 'Tratamiento de cuotas al salir', 'Cobrar hasta la fecha de salida'],
  ] as const)('keeps the clarified copy available in %s', (locale, title, prorate) => {
    expect(translateStudentDepartureMessage(locale, 'admin.student360.departure.financialPolicy')).toBe(title);
    expect(translateStudentDepartureMessage(locale, 'admin.student360.departure.policy.prorate')).toBe(prorate);
    expect(translateStudentDepartureMessage(locale, 'admin.student360.departure.policy.fullDescription')).toBeTruthy();
    expect(translateStudentDepartureMessage(locale, 'admin.student360.departure.policy.keepDescription')).toBeTruthy();
  });
});
