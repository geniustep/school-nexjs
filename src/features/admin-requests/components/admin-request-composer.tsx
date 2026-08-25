'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { Card, PageHeader } from '@/components/ui/primitives';
import { ResourceView } from '@/components/states/resource';
import {
  createAdminRequest,
  createAdminRequestUploadSession,
  uploadAdminRequestFile,
} from '../api';
import { adminRequestTypeLabel } from '../presenters';
import type {
  AdminRequestAppointmentPeriod,
  AdminRequestAppointmentSubject,
  AdminRequestAppointmentTargetKind,
  AdminRequestFamilyRole,
  AdminRequestType,
} from '../types';
import { AdminRequestFilePicker } from './admin-request-file-picker';

function typeRows(value: AdminRequestType[] | { types?: AdminRequestType[]; items?: AdminRequestType[] }) {
  return Array.isArray(value) ? value : value.types ?? value.items ?? [];
}

export function AdminRequestComposer({ role }: { role: AdminRequestFamilyRole }) {
  const router = useRouter();
  const [typeId, setTypeId] = useState('');
  const [subject, setSubject] = useState('');
  const [studentId, setStudentId] = useState('');
  const [description, setDescription] = useState('');
  const [targetKind, setTargetKind] = useState<AdminRequestAppointmentTargetKind>('administration');
  const [requestedSubjectId, setRequestedSubjectId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredPeriod, setPreferredPeriod] = useState<AdminRequestAppointmentPeriod>('any');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/${role}/admin-requests`;
  const types = useResource<AdminRequestType[] | { types?: AdminRequestType[]; items?: AdminRequestType[] }>(
    `${base}/types`,
    undefined,
    { keepPreviousData: false },
  );
  const children = useResource<Array<{ id: number; name: string }> | { children?: Array<{ id: number; name: string }> }>(
    role === 'parent' ? '/parent/children' : null,
    undefined,
    { keepPreviousData: false },
  );
  const selectedType = types.data ? typeRows(types.data).find((type) => type.id === Number(typeId)) : undefined;
  const isAppointment = selectedType?.service_kind === 'appointment';
  const needsStudent = role === 'parent' && Boolean(selectedType?.requires_student || isAppointment);
  const appointmentSubjectsPath = isAppointment && targetKind === 'subject_teacher'
    ? role === 'parent'
      ? Number(studentId) ? `${base}/appointment-subjects?student_id=${Number(studentId)}` : null
      : `${base}/appointment-subjects`
    : null;
  const appointmentSubjects = useResource<AdminRequestAppointmentSubject[]>(
    appointmentSubjectsPath,
    undefined,
    { keepPreviousData: false },
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedType = Number(typeId);
    if (!parsedType || !subject.trim() || !description.trim()) {
      setError('أكمل نوع الطلب والموضوع والوصف.');
      return;
    }
    if (needsStudent && !Number(studentId)) {
      setError('اختر التلميذ المعني بالطلب.');
      return;
    }
    if (isAppointment && !preferredDate) {
      setError('اختر التاريخ المفضل للموعد.');
      return;
    }
    if (isAppointment && targetKind === 'subject_teacher' && !Number(requestedSubjectId)) {
      setError('اختر المادة المعنية بالموعد.');
      return;
    }
    if (files.length > 5) {
      setError('الحد الأقصى خمسة ملفات.');
      return;
    }

    setBusy(true);
    let uploadSessionId: string | undefined;
    if (files.length) {
      const session = await createAdminRequestUploadSession();
      if (!session.success) {
        setError(session.error.message);
        setBusy(false);
        return;
      }
      uploadSessionId = session.data.public_id;
      for (const file of files) {
        const upload = await uploadAdminRequestFile(session.data, file);
        if (!upload.success) {
          setError(upload.error.message);
          setBusy(false);
          return;
        }
      }
    }

    const created = await createAdminRequest(role, {
      type_id: parsedType,
      ...(role === 'parent' && Number(studentId) ? { student_id: Number(studentId) } : {}),
      subject,
      description,
      ...(uploadSessionId ? { upload_session_id: uploadSessionId } : {}),
      ...(isAppointment
        ? {
            appointment: {
              target_kind: targetKind,
              preferred_date: preferredDate,
              preferred_period: preferredPeriod,
              ...(targetKind === 'subject_teacher'
                ? { requested_subject_id: Number(requestedSubjectId) }
                : {}),
            },
          }
        : {}),
    });
    setBusy(false);
    if (!created.success) {
      setError(created.error.message);
      return;
    }
    router.replace(`${base}/${created.data.id}`);
  }

  return (
    <>
      <PageHeader
        title="طلب إداري جديد"
        subtitle="عند الإرسال يصل الطلب مباشرة إلى الإدارة للمراجعة."
      />
      <ResourceView state={types}>
        {(data) => (
          <Card>
            <form className="col" style={{ gap: 16 }} onSubmit={submit} aria-busy={busy}>
              <div className="field">
                <label htmlFor="request-type">نوع الطلب</label>
                <select
                  id="request-type"
                  className="input"
                  value={typeId}
                  onChange={(event) => {
                    setTypeId(event.target.value);
                    setTargetKind('administration');
                    setRequestedSubjectId('');
                    setPreferredDate('');
                    setPreferredPeriod('any');
                  }}
                  disabled={busy}
                  required
                >
                  <option value="">اختر النوع</option>
                  {typeRows(data).map((type) => <option key={type.id} value={type.id}>{adminRequestTypeLabel(type.name)}</option>)}
                </select>
              </div>

              {needsStudent && (
                <div className="field">
                  <label htmlFor="request-student">التلميذ المعني</label>
                  <select
                    id="request-student"
                    className="input"
                    value={studentId}
                    onChange={(event) => {
                      setStudentId(event.target.value);
                      setRequestedSubjectId('');
                    }}
                    disabled={busy}
                    required
                  >
                    <option value="">اختر التلميذ</option>
                    {(children.data ? (Array.isArray(children.data) ? children.data : children.data.children ?? []) : []).map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
                  </select>
                </div>
              )}

              {isAppointment && (
                <Card>
                  <div className="col" style={{ gap: 14 }}>
                    <div>
                      <strong>تفاصيل الموعد</strong>
                      <p className="tiny muted" style={{ marginTop: 4 }}>
                        تختار الجهة أو المادة فقط. تعيين الموظف أو الأستاذ يتم داخليًا من طرف المدرسة.
                      </p>
                    </div>
                    <div className="field">
                      <label htmlFor="appointment-target">موعد مع</label>
                      <select
                        id="appointment-target"
                        className="input"
                        value={targetKind}
                        onChange={(event) => {
                          setTargetKind(event.target.value as AdminRequestAppointmentTargetKind);
                          setRequestedSubjectId('');
                        }}
                        disabled={busy}
                      >
                        <option value="administration">الإدارة</option>
                        <option value="subject_teacher">بخصوص مادة دراسية</option>
                      </select>
                    </div>

                    {targetKind === 'subject_teacher' && (
                      <div className="field">
                        <label htmlFor="appointment-subject">المادة</label>
                        <select
                          id="appointment-subject"
                          className="input"
                          value={requestedSubjectId}
                          onChange={(event) => setRequestedSubjectId(event.target.value)}
                          disabled={busy || appointmentSubjects.loading || !appointmentSubjectsPath}
                          required
                        >
                          <option value="">
                            {!appointmentSubjectsPath
                              ? 'اختر التلميذ أولًا'
                              : appointmentSubjects.loading
                                ? 'جارٍ تحميل المواد…'
                                : appointmentSubjects.error
                                  ? 'تعذر تحميل المواد'
                                  : appointmentSubjects.data?.length
                                    ? 'اختر المادة'
                                    : 'لا توجد مواد متاحة لهذا التلميذ'}
                          </option>
                          {(appointmentSubjects.data ?? []).map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                        <span className="tiny muted">تظهر فقط المواد التي يسمح بها سجل التلميذ في المدرسة.</span>
                      </div>
                    )}

                    <div className="field">
                      <label htmlFor="appointment-date">التاريخ المفضل</label>
                      <input
                        id="appointment-date"
                        className="input"
                        type="date"
                        value={preferredDate}
                        onChange={(event) => setPreferredDate(event.target.value)}
                        disabled={busy}
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="appointment-period">الفترة المفضلة</label>
                      <select
                        id="appointment-period"
                        className="input"
                        value={preferredPeriod}
                        onChange={(event) => setPreferredPeriod(event.target.value as AdminRequestAppointmentPeriod)}
                        disabled={busy}
                      >
                        <option value="morning">الصباح</option>
                        <option value="afternoon">بعد الزوال</option>
                        <option value="any">أي وقت مناسب</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )}

              <div className="field">
                <label htmlFor="request-subject">الموضوع</label>
                <input id="request-subject" className="input" value={subject} onChange={(event) => setSubject(event.target.value)} disabled={busy} maxLength={250} required />
              </div>
              <div className="field">
                <label htmlFor="request-description">التفاصيل</label>
                <textarea id="request-description" className="input" value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy} maxLength={4000} rows={7} required />
              </div>
              <div className="field">
                <label>مرفقات اختيارية</label>
                <AdminRequestFilePicker id="request-files" files={files} onChange={setFiles} disabled={busy} />
                <span className="tiny muted">حتى 5 ملفات، بحد أقصى 10 MiB للملف.</span>
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
              </button>
            </form>
          </Card>
        )}
      </ResourceView>
    </>
  );
}
