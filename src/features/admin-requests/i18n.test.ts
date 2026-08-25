import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n/config';
import { adminRequestMessage, adminRequestMessageKeys } from './i18n';

const LOCALES: Locale[] = ['ar', 'fr', 'en', 'es'];

describe('admin request i18n', () => {
  it('provides every admin-request key in all four supported locales', () => {
    const keys = adminRequestMessageKeys();
    expect(keys.length).toBeGreaterThan(100);

    for (const locale of LOCALES) {
      for (const key of keys) {
        const value = adminRequestMessage(locale, key);
        expect(value.trim(), `${locale}:${key}`).not.toBe('');
        expect(value, `${locale}:${key}`).not.toBe(key);
      }
    }
  });

  it('keeps LTR locale copy free of accidental Arabic fallback text', () => {
    for (const locale of ['fr', 'en', 'es'] as const) {
      const combined = adminRequestMessageKeys()
        .map((key) => adminRequestMessage(locale, key))
        .join('\n');
      expect(combined).not.toMatch(/\p{Script=Arabic}/u);
    }
  });

  it('localizes the appointment journey in every supported locale', () => {
    expect(adminRequestMessage('ar', 'appointment.confirm')).toBe('تأكيد الموعد');
    expect(adminRequestMessage('fr', 'appointment.confirm')).toBe('Confirmer le rendez-vous');
    expect(adminRequestMessage('en', 'appointment.confirm')).toBe('Confirm appointment');
    expect(adminRequestMessage('es', 'appointment.confirm')).toBe('Confirmar cita');

    expect(adminRequestMessage('ar', 'composer.targetSubjectTeacher')).toBe('بخصوص مادة دراسية');
    expect(adminRequestMessage('fr', 'composer.targetSubjectTeacher')).toBe('À propos d’une matière scolaire');
    expect(adminRequestMessage('en', 'composer.targetSubjectTeacher')).toBe('Regarding a school subject');
    expect(adminRequestMessage('es', 'composer.targetSubjectTeacher')).toBe('Sobre una materia escolar');
  });

  it('interpolates dynamic values without changing the locale copy', () => {
    expect(adminRequestMessage('fr', 'list.currentAssignee', { name: 'Samira' })).toBe(
      'Responsable actuel : Samira',
    );
    expect(adminRequestMessage('es', 'detail.requestNumber', { id: 17 })).toBe('Solicitud n.º 17');
  });
});
