'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/primitives';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { Ref } from '@/types/api';
import type { CreateAdmissionPayload } from '@/types/admission';
import { createAdmission } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import '../admissions.css';

const EMPTY_FORM: CreateAdmissionPayload = {
  student_name: '',
  student_first_name: '',
  student_last_name: '',
  birth_date: '',
  gender: '',
  previous_school: '',
  massar_code: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_whatsapp: '',
  guardian_email: '',
  relationship: '',
  first_contact_date: '',
  next_action: '',
  next_action_date: '',
  internal_notes: '',
};

export function AdmissionCreatePage() {
  const t = useT();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const [form, setForm] = useState<CreateAdmissionPayload>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelsState = useAdminResource<Ref[]>(endpoints.admin.levels, { page_size: 100 });
  const classesState = useAdminResource<import('@/types/class').SchoolClass[]>(
    endpoints.admin.classes,
    { page_size: 100 },
  );
  const studentOptionsState = useStudentOptions();

  const levels = useMemo(
    () => (Array.isArray(levelsState.data) ? levelsState.data : []),
    [levelsState.data],
  );
  const classes = useMemo(
    () => (Array.isArray(classesState.data) ? classesState.data : []),
    [classesState.data],
  );
  const academicYears = studentOptionsState.options?.academicYears ?? [];

  const lookupError =
    levelsState.error?.message ??
    classesState.error?.message ??
    studentOptionsState.error?.message ??
    null;

  function updateField<K extends keyof CreateAdmissionPayload>(
    key: K,
    value: CreateAdmissionPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null) return;
    setSubmitting(true);
    setError(null);

    const payload: CreateAdmissionPayload = { ...form };
    if (activeSchoolId) payload.school_id = activeSchoolId;

    for (const key of Object.keys(payload) as (keyof CreateAdmissionPayload)[]) {
      const val = payload[key];
      if (val === '' || val === undefined) delete payload[key];
    }

    const res = await createAdmission(payload, { active_school_id: activeSchoolId });
    setSubmitting(false);

    if (res.success) {
      router.push(`/admin/admissions/${res.data.id}`);
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  return (
    <div className="admissions-page">
      <PageHeader
        title={t('admin.admissions.create.title')}
        subtitle={t('admin.admissions.create.subtitle')}
        actions={
          <Link href="/admin/admissions" className="btn">
            {t('common.back')}
          </Link>
        }
      />

      <form className="card admissions-section" onSubmit={handleSubmit}>
        {lookupError && (
          <div className="alert alert--warning" role="status">
            {lookupError}
          </div>
        )}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <h2 className="admissions-section__title">{t('admin.admissions.create.studentSection')}</h2>
        <div className="admissions-form-grid">
          <div className="field">
            <label htmlFor="student_name">{t('admin.admissions.fields.studentName')} *</label>
            <input
              id="student_name"
              className="input"
              required
              value={form.student_name ?? ''}
              onChange={(e) => updateField('student_name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="student_first_name">{t('admin.admissions.fields.firstName')}</label>
            <input
              id="student_first_name"
              className="input"
              value={form.student_first_name ?? ''}
              onChange={(e) => updateField('student_first_name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="student_last_name">{t('admin.admissions.fields.lastName')}</label>
            <input
              id="student_last_name"
              className="input"
              value={form.student_last_name ?? ''}
              onChange={(e) => updateField('student_last_name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="birth_date">{t('admin.admissions.fields.birthDate')}</label>
            <input
              id="birth_date"
              type="date"
              className="input"
              value={form.birth_date ?? ''}
              onChange={(e) => updateField('birth_date', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="gender">{t('admin.admissions.fields.gender')}</label>
            <select
              id="gender"
              className="input"
              value={form.gender ?? ''}
              onChange={(e) => updateField('gender', e.target.value)}
            >
              <option value="">—</option>
              <option value="male">{t('admin.admissions.gender.male')}</option>
              <option value="female">{t('admin.admissions.gender.female')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="requested_level_id">{t('admin.admissions.fields.requestedLevel')}</label>
            <select
              id="requested_level_id"
              className="input"
              value={form.requested_level_id ?? ''}
              onChange={(e) =>
                updateField('requested_level_id', e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">—</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="requested_class_id">{t('admin.admissions.fields.requestedClass')}</label>
            <select
              id="requested_class_id"
              className="input"
              value={form.requested_class_id ?? ''}
              onChange={(e) =>
                updateField('requested_class_id', e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">—</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="academic_year_id">{t('admin.admissions.fields.academicYear')}</label>
            <select
              id="academic_year_id"
              className="input"
              value={form.academic_year_id ?? ''}
              onChange={(e) =>
                updateField('academic_year_id', e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">—</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="previous_school">{t('admin.admissions.fields.previousSchool')}</label>
            <input
              id="previous_school"
              className="input"
              value={form.previous_school ?? ''}
              onChange={(e) => updateField('previous_school', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="massar_code">{t('admin.admissions.fields.massarCode')}</label>
            <input
              id="massar_code"
              className="input"
              value={form.massar_code ?? ''}
              onChange={(e) => updateField('massar_code', e.target.value)}
            />
          </div>
        </div>

        <h2 className="admissions-section__title">{t('admin.admissions.create.guardianSection')}</h2>
        <div className="admissions-form-grid">
          <div className="field">
            <label htmlFor="guardian_name">{t('admin.admissions.fields.guardianName')}</label>
            <input
              id="guardian_name"
              className="input"
              value={form.guardian_name ?? ''}
              onChange={(e) => updateField('guardian_name', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="guardian_phone">{t('admin.admissions.fields.guardianPhone')}</label>
            <input
              id="guardian_phone"
              className="input"
              dir="ltr"
              value={form.guardian_phone ?? ''}
              onChange={(e) => updateField('guardian_phone', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="guardian_whatsapp">{t('admin.admissions.fields.guardianWhatsapp')}</label>
            <input
              id="guardian_whatsapp"
              className="input"
              dir="ltr"
              value={form.guardian_whatsapp ?? ''}
              onChange={(e) => updateField('guardian_whatsapp', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="guardian_email">{t('admin.admissions.fields.guardianEmail')}</label>
            <input
              id="guardian_email"
              type="email"
              className="input"
              dir="ltr"
              value={form.guardian_email ?? ''}
              onChange={(e) => updateField('guardian_email', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="relationship">{t('admin.admissions.fields.relationship')}</label>
            <input
              id="relationship"
              className="input"
              value={form.relationship ?? ''}
              onChange={(e) => updateField('relationship', e.target.value)}
            />
          </div>
        </div>

        <h2 className="admissions-section__title">{t('admin.admissions.create.followUpSection')}</h2>
        <div className="admissions-form-grid">
          <div className="field">
            <label htmlFor="first_contact_date">{t('admin.admissions.fields.firstContactDate')}</label>
            <input
              id="first_contact_date"
              type="date"
              className="input"
              value={form.first_contact_date ?? ''}
              onChange={(e) => updateField('first_contact_date', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="next_action">{t('admin.admissions.fields.nextAction')}</label>
            <input
              id="next_action"
              className="input"
              value={form.next_action ?? ''}
              onChange={(e) => updateField('next_action', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="next_action_date">{t('admin.admissions.fields.nextActionDate')}</label>
            <input
              id="next_action_date"
              type="date"
              className="input"
              value={form.next_action_date ?? ''}
              onChange={(e) => updateField('next_action_date', e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="internal_notes">{t('admin.admissions.fields.internalNotes')}</label>
          <textarea
            id="internal_notes"
            className="input"
            rows={3}
            value={form.internal_notes ?? ''}
            onChange={(e) => updateField('internal_notes', e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('common.submitting') : t('admin.admissions.create.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
