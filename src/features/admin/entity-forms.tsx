'use client';

import { useState, useMemo } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { buildClassPayload, mapClassApiError, resolveAcademicYearId } from '@/features/admin/class-form-utils';
import { buildStudentPayload, mapStudentApiError } from '@/features/admin/student-form-utils';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { Student } from '@/types/student';
import type { Parent } from '@/types/parent';
import type { Teacher } from '@/types/teacher';
import type { AcademicTrack, TrackOptions } from '@/types/academic-setup';

function FormShell({
  children,
  saving,
  onSubmit,
  onCancel,
}: {
  children: React.ReactNode;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <Card>
      <form className="col" style={{ gap: 12 }} onSubmit={onSubmit}>
        {children}
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Card>
  );
}

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
  student?: Student;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const levelsState = useResource<Ref[]>(endpoints.admin.levels);
  const parentsState = useResource<Parent[]>(endpoints.admin.parents, { page_size: 200 });
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
  const [parentIds, setParentIds] = useState<number[]>(
    student?.parents?.map((p) => p.id) ?? [],
  );

  function toggleParent(id: number) {
    setParentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

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
      parentIds,
      creating: !student,
    });
    setSaving(true);
    const res = student
      ? await api.post(endpoints.admin.studentUpdate(student.id), payload)
      : await api.post(endpoints.admin.students, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as Student).id);
    } else if (!res.success) {
      toast.error(mapStudentApiError(res.error, t));
    }
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.firstName')}>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </Field>
        <Field label={t('admin.lastName')}>
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </Field>
      </div>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.studentCode')}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label={t('admin.massarCode')}>
          <input className="input" value={massarCode} onChange={(e) => setMassarCode(e.target.value)} />
        </Field>
        <Field label={t('admin.matriculeNumber')}>
          <input className="input" value={matricule} onChange={(e) => setMatricule(e.target.value)} />
        </Field>
      </div>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('nav.classes')}>
          <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{t('admin.selectClass')}</option>
            {(classesState.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('nav.levels')}>
          <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">{t('admin.selectLevel')}</option>
            {(levelsState.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('admin.gender')}>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">{t('common.dash')}</option>
            <option value="male">{t('admin.male')}</option>
            <option value="female">{t('admin.female')}</option>
          </select>
        </Field>
      </div>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.dateOfBirth')}>
          <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label={t('admin.admissionDate')}>
          <input className="input" type="date" value={admission} onChange={(e) => setAdmission(e.target.value)} />
        </Field>
        <Field label={t('admin.email')}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('admin.phone')}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      <Field label={t('admin.linkedParents')}>
        <div className="col" style={{ gap: 6, maxHeight: 180, overflow: 'auto' }}>
          {(parentsState.data ?? []).map((p) => (
            <label key={p.id} className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={parentIds.includes(p.id)}
                onChange={() => toggleParent(p.id)}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </Field>
    </FormShell>
  );
}

export function ParentForm({
  parent,
  onSaved,
  onCancel,
}: {
  parent?: Parent;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const studentsState = useResource<Student[]>(endpoints.admin.students, { page_size: 200 });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(parent?.name ?? '');
  const [phone, setPhone] = useState(parent?.phone ?? '');
  const [email, setEmail] = useState(parent?.email ?? '');
  const [relation, setRelation] = useState(parent?.relation ?? 'father');
  const [preferredLanguage, setPreferredLanguage] = useState(parent?.preferred_language ?? 'ar');
  const [notificationOptIn, setNotificationOptIn] = useState(parent?.notification_opt_in ?? true);
  const [studentIds, setStudentIds] = useState<number[]>(
    parent?.children?.map((c) => c.id) ?? [],
  );

  function toggleStudent(id: number) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      relation,
      preferred_language: preferredLanguage,
      notification_opt_in: notificationOptIn,
      student_ids: studentIds,
    };
    setSaving(true);
    const res = parent
      ? await api.post(endpoints.admin.parentUpdate(parent.id), payload)
      : await api.post(endpoints.admin.parents, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as Parent).id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      <Field label={t('admin.fullName')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.phone')}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={t('admin.email')}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('admin.relation')}>
          <select className="input" value={relation} onChange={(e) => setRelation(e.target.value)}>
            <option value="father">{t('admin.father')}</option>
            <option value="mother">{t('admin.mother')}</option>
            <option value="guardian">{t('admin.guardian')}</option>
          </select>
        </Field>
      </div>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.preferredLanguage')}>
          <select className="input" value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}>
            <option value="ar">ar</option>
            <option value="fr">fr</option>
            <option value="en">en</option>
            <option value="es">es</option>
          </select>
        </Field>
        <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 20 }}>
          <input
            type="checkbox"
            checked={notificationOptIn}
            onChange={(e) => setNotificationOptIn(e.target.checked)}
          />
          <span className="tiny">{t('admin.notificationOptIn')}</span>
        </label>
      </div>
      <Field label={t('admin.linkedChildren')}>
        <div className="col" style={{ gap: 6, maxHeight: 180, overflow: 'auto' }}>
          {(studentsState.data ?? []).map((s) => (
            <label key={s.id} className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={studentIds.includes(s.id)}
                onChange={() => toggleStudent(s.id)}
              />
              <span>{getStudentDisplayName(s)}</span>
            </label>
          ))}
        </div>
      </Field>
    </FormShell>
  );
}

export function TeacherForm({
  teacher,
  onSaved,
  onCancel,
}: {
  teacher?: Teacher;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const classesState = useResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useResource<Ref[]>(endpoints.admin.subjects);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(teacher?.name ?? '');
  const [code, setCode] = useState(teacher?.code ?? '');
  const [phone, setPhone] = useState(teacher?.phone ?? '');
  const [email, setEmail] = useState(teacher?.email ?? '');
  const [classIds, setClassIds] = useState<number[]>(teacher?.classes?.map((c) => c.id) ?? []);
  const [subjectIds, setSubjectIds] = useState<number[]>(teacher?.subjects?.map((s) => s.id) ?? []);

  function toggle(id: number, list: number[], set: (v: number[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      class_ids: classIds,
      subject_ids: subjectIds,
    };
    setSaving(true);
    const res = teacher
      ? await api.post(endpoints.admin.teacherUpdate(teacher.id), payload)
      : await api.post(endpoints.admin.teachers, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as Teacher).id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      <Field label={t('admin.fullName')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.code')}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label={t('admin.phone')}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={t('admin.email')}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <Field label={t('nav.classes')}>
        <div className="col" style={{ gap: 6, maxHeight: 120, overflow: 'auto' }}>
          {(classesState.data ?? []).map((c) => (
            <label key={c.id} className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={classIds.includes(c.id)}
                onChange={() => toggle(c.id, classIds, setClassIds)}
              />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label={t('nav.subjects')}>
        <div className="col" style={{ gap: 6, maxHeight: 120, overflow: 'auto' }}>
          {(subjectsState.data ?? []).map((s) => (
            <label key={s.id} className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={subjectIds.includes(s.id)}
                onChange={() => toggle(s.id, subjectIds, setSubjectIds)}
              />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
      </Field>
    </FormShell>
  );
}

export interface ClassDetail {
  id: number;
  name: string;
  code: string | null;
  level: Ref | null;
  level_id?: number;
  track?: Ref | null;
  track_id?: number | null;
  academic_year: string | Ref | { id: number; name: string } | null;
  academic_year_id?: number;
  student_count: number;
  capacity: number | null;
  room_number?: string | null;
  teachers: Ref[];
  subjects: import('@/types/class').Subject[];
  teacher_ids?: number[];
  subject_ids?: number[];
  school?: Ref;
  status: string;
}

export function ClassForm({
  cls,
  onSaved,
  onCancel,
}: {
  cls?: ClassDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const levelsState = useResource<Ref[]>(endpoints.admin.levels);
  const trackOptionsState = useAdminResource<TrackOptions>(endpoints.admin.trackOptions);
  const teachersState = useResource<Teacher[]>(endpoints.admin.teachers, { page_size: 200 });
  const subjectsState = useResource<Ref[]>(endpoints.admin.subjects);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(cls?.name ?? '');
  const [levelId, setLevelId] = useState(String(cls?.level_id ?? cls?.level?.id ?? ''));
  const [trackId, setTrackId] = useState(String(cls?.track_id ?? cls?.track?.id ?? ''));
  const [academicYearId, setAcademicYearId] = useState(resolveAcademicYearId(cls));
  const [capacity, setCapacity] = useState(cls?.capacity != null ? String(cls.capacity) : '');
  const [room, setRoom] = useState(cls?.room_number ?? '');
  const [teacherIds, setTeacherIds] = useState<number[]>(
    cls?.teacher_ids ?? cls?.teachers?.map((te) => te.id) ?? [],
  );
  const [subjectIds, setSubjectIds] = useState<number[]>(
    cls?.subject_ids ?? cls?.subjects?.map((s) => s.id) ?? [],
  );

  const trackLevels = useMemo(
    () => new Set((trackOptionsState.data?.levels ?? []).filter((l) => l.supports_tracks).map((l) => l.id)),
    [trackOptionsState.data],
  );
  const levelSupportsTracks = levelId ? trackLevels.has(Number(levelId)) : false;
  const tracksState = useAdminResource<AcademicTrack[]>(
    levelSupportsTracks ? endpoints.admin.tracks : null,
    levelId ? { level_id: Number(levelId), limit: 200 } : undefined,
  );
  const tracksForLevel = tracksState.data ?? [];

  function handleLevelChange(nextLevelId: string) {
    if (trackId && nextLevelId !== levelId) {
      const hadTrack = trackId.trim().length > 0;
      if (hadTrack && cls && !window.confirm(t('admin.academicSetup.trackClearConfirm'))) {
        return;
      }
      setTrackId('');
    }
    setLevelId(nextLevelId);
  }

  function toggleId(id: number, list: number[], set: (v: number[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !levelId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = buildClassPayload({
      name,
      levelId,
      trackId,
      academicYearId,
      capacity,
      room,
      teacherIds,
      subjectIds,
      creating: !cls,
    });
    setSaving(true);
    const res = cls
      ? await api.post(endpoints.admin.classUpdate(cls.id), payload)
      : await api.post(endpoints.admin.classes, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as ClassDetail).id);
    } else if (!res.success) {
      toast.error(mapClassApiError(res.error, t));
    }
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      <Field label={t('admin.className')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('nav.levels')}>
          <select className="input" value={levelId} onChange={(e) => handleLevelChange(e.target.value)} required>
            <option value="">{t('admin.selectLevel')}</option>
            {(levelsState.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>
        {levelSupportsTracks && (
          <Field label={t('admin.academicSetup.classTrackLabel')}>
            <select
              className="input"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
            >
              <option value="">{t('common.dash')}</option>
              {tracksForLevel.map((tr) => (
                <option key={tr.id} value={tr.id}>{tr.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t('admin.academicYearIdOptional')}>
          <input
            className="input"
            type="number"
            min={1}
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            placeholder={t('admin.academicYearOptionalHint')}
          />
        </Field>
        <Field label={t('admin.capacity')}>
          <input className="input" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </Field>
        <Field label={t('academic.room')}>
          <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
        </Field>
      </div>
      <Field label={t('nav.teachers')}>
        <div className="col" style={{ gap: 6, maxHeight: 160, overflow: 'auto' }}>
          {(teachersState.data ?? []).map((te) => (
            <label key={te.id} className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={teacherIds.includes(te.id)}
                onChange={() => toggleId(te.id, teacherIds, setTeacherIds)}
              />
              <span>{te.name}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label={t('nav.subjects')}>
        <div className="col" style={{ gap: 6, maxHeight: 160, overflow: 'auto' }}>
          {(subjectsState.data ?? []).map((s) => (
            <label key={s.id} className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={subjectIds.includes(s.id)}
                onChange={() => toggleId(s.id, subjectIds, setSubjectIds)}
              />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
      </Field>
    </FormShell>
  );
}

export interface LevelDetail {
  id: number;
  name: string;
  code?: string | null;
  sequence?: number;
  category?: string | null;
  status?: string;
}

export function LevelForm({
  level,
  onSaved,
  onCancel,
}: {
  level?: LevelDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(level?.name ?? '');
  const [code, setCode] = useState(level?.code ?? '');
  const [sequence, setSequence] = useState(String(level?.sequence ?? 10));
  const [category, setCategory] = useState(level?.category ?? 'primary');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      sequence: Number(sequence) || 10,
      category,
    };
    setSaving(true);
    const res = level
      ? await api.post(endpoints.admin.levelUpdate(level.id), payload)
      : await api.post(endpoints.admin.levels, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as LevelDetail).id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      <Field label={t('admin.levelName')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.code')}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label={t('admin.sequence')}>
          <input className="input" type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} />
        </Field>
        <Field label={t('academic.type')}>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
      </div>
    </FormShell>
  );
}

export interface SubjectDetail {
  id: number;
  name: string;
  code?: string | null;
  sequence?: number;
  category?: string | null;
  credit_hours?: number;
  status?: string;
}

export function SubjectForm({
  subject,
  onSaved,
  onCancel,
}: {
  subject?: SubjectDetail;
  onSaved: (id: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(subject?.name ?? '');
  const [code, setCode] = useState(subject?.code ?? '');
  const [sequence, setSequence] = useState(String(subject?.sequence ?? 10));
  const [category, setCategory] = useState(subject?.category ?? 'other');
  const [creditHours, setCreditHours] = useState(String(subject?.credit_hours ?? 1));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      sequence: Number(sequence) || 10,
      category,
      credit_hours: Number(creditHours) || 1,
    };
    setSaving(true);
    const res = subject
      ? await api.post(endpoints.admin.subjectUpdate(subject.id), payload)
      : await api.post(endpoints.admin.subjects, payload);
    setSaving(false);
    if (res.success && res.data) {
      toast.success(t('admin.saveSuccess'));
      onSaved((res.data as SubjectDetail).id);
    } else if (!res.success) {
      toast.error(res.error.message);
    }
  }

  return (
    <FormShell saving={saving} onSubmit={submit} onCancel={onCancel}>
      <Field label={t('admin.subjectName')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <Field label={t('admin.code')}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label={t('admin.sequence')}>
          <input className="input" type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} />
        </Field>
        <Field label={t('academic.type')}>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label={t('admin.creditHours')}>
          <input className="input" type="number" step="0.5" value={creditHours} onChange={(e) => setCreditHours(e.target.value)} />
        </Field>
      </div>
    </FormShell>
  );
}
