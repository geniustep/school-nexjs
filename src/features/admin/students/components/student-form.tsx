'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/components/ui/toast';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { buildStudentPayload, mapStudentApiError } from '@/features/admin/student-form-utils';
import { studentClassLabel, studentLevelLabel } from '@/features/admin/students/utils/student-academic-labels';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { StudentSummary } from '@/types/student-360';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
    </label>
  );
}

export function StudentForm({
  student,
  onSaved,
  onCancel,
}: {
  student?: StudentSummary;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const levelsState = useResource<Ref[]>(endpoints.admin.levels);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(student?.first_name ?? '');
  const [lastName, setLastName] = useState(student?.last_name ?? '');
  const [code, setCode] = useState(student?.code ?? '');
  const [massarCode, setMassarCode] = useState(student?.massar_code ?? '');
  const [matricule, setMatricule] = useState(student?.matricule ?? '');
  const [classId, setClassId] = useState(String(student?.class?.id ?? ''));
  const [levelId, setLevelId] = useState(String(student?.level?.id ?? ''));
  const [gender, setGender] = useState(student?.gender ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [phone, setPhone] = useState(student?.phone ?? '');
  const [dob, setDob] = useState(student?.date_of_birth ?? '');
  const [admission, setAdmission] = useState(student?.admission_date ?? '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = buildStudentPayload({
      firstName,
      lastName,
      code,
      massarCode,
      matricule,
      classId,
      levelId,
      gender,
      email,
      phone,
      dob,
      admission,
      creating: !student,
    });
    setSaving(true);
    const res = student
      ? await api.post(endpoints.admin.studentUpdate(student.id), payload)
      : await api.post(endpoints.admin.students, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      const id =
        typeof res.data === 'object' && res.data !== null && 'id' in res.data
          ? Number((res.data as { id: number }).id)
          : student?.id ?? 0;
      onSaved(id);
    } else if (!res.success) {
      toast.error(mapStudentApiError(res.error, t));
    }
  }

  return (
    <form className="col student-360-form" style={{ gap: 16 }} onSubmit={submit}>
      <Card>
        <SectionHead title={t('admin.student360.sections.basic')} />
        <div className="student-360-form__grid">
          <Field label={t('admin.firstName')}>
            <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label={t('admin.lastName')}>
            <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
          <Field label={t('admin.massarCode')}>
            <input className="input" value={massarCode} onChange={(e) => setMassarCode(e.target.value)} />
          </Field>
          <Field label={t('admin.matriculeNumber')}>
            <input className="input" value={matricule} onChange={(e) => setMatricule(e.target.value)} />
          </Field>
          <Field label={t('admin.studentCode')}>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label={t('admin.gender')}>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">{t('common.dash')}</option>
              <option value="male">{t('admin.male')}</option>
              <option value="female">{t('admin.female')}</option>
            </select>
          </Field>
          <Field label={t('admin.dateOfBirth')}>
            <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label={t('admin.email')}>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('admin.phone')}>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.sections.enrollment')} />
        <div className="student-360-form__grid">
          <Field label={t('nav.levels')}>
            <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">{t('admin.selectLevel')}</option>
              {(levelsState.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {studentLevelLabel(l as import('@/types/student-360').AcademicLevelOption)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('nav.classes')}>
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">{t('admin.selectClass')}</option>
              {(classesState.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {studentClassLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.admissionDate')}>
            <input className="input" type="date" value={admission} onChange={(e) => setAdmission(e.target.value)} />
          </Field>
        </div>
      </Card>

      {!student && (
        <Card>
          <SectionHead title={t('admin.student360.sections.guardians')} />
          <p className="tiny muted">{t('admin.student360.guardianAfterCreateHint')}</p>
        </Card>
      )}

      <div className="student-360-form__actions row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
