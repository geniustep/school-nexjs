import { describe, expect, it } from 'vitest';
import {
  adminRequestActionLabel,
  adminRequestErrorLabel,
  adminRequestReviewStateLabel,
  adminRequestRoleLabel,
  adminRequestStateLabel,
  adminRequestTypeLabel,
  staffOptionRows,
} from './presenters';

describe('admin request localized presenters', () => {
  it('keeps the Arabic workflow vocabulary as the default locale', () => {
    expect(adminRequestStateLabel('under_review')).toBe('قيد المراجعة');
    expect(adminRequestStateLabel('resolved')).toBe('تمت المعالجة');
    expect(adminRequestActionLabel('wait_requester')).toBe('طلب معلومات إضافية');
    expect(adminRequestActionLabel('refer')).toBe('إحالة إلى موظف');
    expect(adminRequestActionLabel('staff_reply')).toBe('إرسال الرد إلى الإدارة');
    expect(adminRequestActionLabel('approve_reply')).toBe('اعتماد الرد');
    expect(adminRequestActionLabel('request_reply_changes')).toBe('طلب تعديل الرد');
  });

  it('localizes workflow labels for French, English and Spanish', () => {
    expect(adminRequestStateLabel('under_review', 'fr')).toBe('En cours d’examen');
    expect(adminRequestStateLabel('under_review', 'en')).toBe('Under review');
    expect(adminRequestStateLabel('under_review', 'es')).toBe('En revisión');

    expect(adminRequestActionLabel('wait_requester', 'fr')).toBe('Demander des informations complémentaires');
    expect(adminRequestActionLabel('wait_requester', 'en')).toBe('Request more information');
    expect(adminRequestActionLabel('wait_requester', 'es')).toBe('Solicitar más información');
  });

  it('translates reply review states', () => {
    expect(adminRequestReviewStateLabel('pending_review')).toBe('بانتظار مراجعة الإدارة');
    expect(adminRequestReviewStateLabel('approved')).toBe('معتمد');
    expect(adminRequestReviewStateLabel('changes_requested')).toBe('مطلوب تعديل الرد');
    expect(adminRequestReviewStateLabel('pending_review', 'fr')).toBe('En attente de validation par l’administration');
  });

  it('translates requester and staff roles', () => {
    expect(adminRequestRoleLabel('parent')).toBe('ولي الأمر');
    expect(adminRequestRoleLabel('student')).toBe('التلميذ');
    expect(adminRequestRoleLabel('admin')).toBe('الإدارة');
    expect(adminRequestRoleLabel('teacher')).toBe('الأستاذ');
    expect(adminRequestRoleLabel('staff')).toBe('الموظف');
    expect(adminRequestRoleLabel('parent', 'en')).toBe('Parent/guardian');
    expect(adminRequestRoleLabel('student', 'fr')).toBe('Élève');
    expect(adminRequestRoleLabel('teacher', 'es')).toBe('Profesor');
  });

  it('localizes workflow API errors instead of leaking backend English messages', () => {
    expect(adminRequestErrorLabel({
      code: 'admin_request_resolution_required',
      message: 'Resolution summary is required.',
    })).toBe('اكتب ملخص المعالجة قبل إنهاء الطلب.');
    expect(adminRequestErrorLabel({
      code: 'admin_request_forbidden',
      message: 'Not allowed to perform this action.',
    })).toBe('لا تملك صلاحية تنفيذ هذا الإجراء.');
    expect(adminRequestErrorLabel({ code: 'admin_request_review_required' })).toBe(
      'هذا الإجراء غير متاح قبل مراجعة الإدارة للرد الحالي.',
    );
    expect(adminRequestErrorLabel({ code: 'admin_request_stale_action' })).toBe(
      'تغيّرت حالة الرد. حدّث الصفحة ثم أعد المحاولة.',
    );
    expect(adminRequestErrorLabel({ code: 'admin_request_review_outcome_required' })).toBe(
      'اختر نتيجة اعتماد الرد.',
    );
    expect(adminRequestErrorLabel({ code: 'admin_request_review_reason_required' })).toBe(
      'اكتب سبب طلب تعديل الرد.',
    );
    expect(adminRequestErrorLabel({ code: 'admin_request_reply_not_found' })).toBe(
      'تعذر العثور على الرد المطلوب.',
    );
    expect(adminRequestErrorLabel({ code: 'unknown', message: 'Opaque backend error' })).toBe(
      'تعذر تنفيذ الإجراء. تحقق من البيانات ثم أعد المحاولة.',
    );
    expect(adminRequestErrorLabel({ code: 'unknown', message: 'تعذر إتمام الطلب.' })).toBe(
      'تعذر إتمام الطلب.',
    );
  });

  it('localizes appointment and generic errors for LTR locales', () => {
    expect(adminRequestErrorLabel({ code: 'admin_request_appointment_subject_required' }, 'fr')).toBe(
      'Choisissez la matière concernée par le rendez-vous.',
    );
    expect(adminRequestErrorLabel({ code: 'admin_request_appointment_schedule_invalid' }, 'en')).toBe(
      'The appointment end must be after its start.',
    );
    expect(adminRequestErrorLabel({ code: 'unknown', message: 'تعذر إتمام الطلب.' }, 'es')).toBe(
      'No se pudo realizar la acción. Revise los datos e inténtelo de nuevo.',
    );
  });

  it('hides operational QA markers from seeded request type names in every locale', () => {
    expect(adminRequestTypeLabel('QA Complaint 20260823')).toBe('شكاية');
    expect(adminRequestTypeLabel('QA Inquiry 20260823')).toBe('استفسار');
    expect(adminRequestTypeLabel('QA Appointment 20260823')).toBe('طلب موعد');
    expect(adminRequestTypeLabel('QA Appointment 20260823', 'fr')).toBe('Demande de rendez-vous');
    expect(adminRequestTypeLabel('QA Appointment 20260823', 'en')).toBe('Appointment request');
    expect(adminRequestTypeLabel('QA Appointment 20260823', 'es')).toBe('Solicitud de cita');
  });
});

describe('admin request staff options', () => {
  it('normalizes a direct option list', () => {
    expect(staffOptionRows([{ id: 7, name: 'أحمد الإدريسي', job_title: 'الحراسة العامة' }])).toEqual([
      { id: 7, name: 'أحمد الإدريسي', detail: 'الحراسة العامة' },
    ]);
  });

  it('prefers the linked user id when the endpoint returns a staff record', () => {
    expect(staffOptionRows({ items: [{ id: 17, user_id: [42, 'سلمى العلوي'], display_name: 'سلمى العلوي' }] })).toEqual([
      { id: 42, name: 'سلمى العلوي' },
    ]);
  });

  it('supports wrapped staff option payloads', () => {
    expect(staffOptionRows({ data: { staff: [{ user_id: 12, full_name: 'محمد أمين' }] } })).toEqual([
      { id: 12, name: 'محمد أمين' },
    ]);
  });

  it('supports generic select option payloads with value and label', () => {
    expect(staffOptionRows({ options: [{ value: 31, label: 'ليلى بنعمر' }] })).toEqual([
      { id: 31, name: 'ليلى بنعمر' },
    ]);
  });

  it('supports nested user objects', () => {
    expect(staffOptionRows({ items: [{ staff_id: 9, user: { id: 55, name: 'يوسف المرابط' } }] })).toEqual([
      { id: 55, name: 'يوسف المرابط' },
    ]);
  });
});
