'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { Card, PageHeader } from '@/components/ui/primitives';
import { ResourceView } from '@/components/states/resource';
import {
  createAdminRequest,
  createAdminRequestUploadSession,
  uploadAdminRequestFile,
} from '../api';
import { adminRequestMessage } from '../i18n';
import { adminRequestErrorLabel, adminRequestTypeLabel } from '../presenters';
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
  const { locale } = useLocale();
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
      setError(adminRequestMessage(locale, 'composer.errorRequired'));
      return;
    }
    if (needsStudent && !Number(studentId)) {
      setError(adminRequestMessage(locale, 'composer.errorStudent'));
      return;
    }
    if (isAppointment && !preferredDate) {
      setError(adminRequestMessage(locale, 'composer.errorDate'));
      return;
    }
    if (isAppointment && targetKind === 'subject_teacher' && !Number(requestedSubjectId)) {
      setError(adminRequestMessage(locale, 'composer.errorSubject'));
      return;
    }
    if (files.length > 5) {
      setError(adminRequestMessage(locale, 'composer.errorMaxFiles'));
      return;
    }

    setBusy(true);
    let uploadSessionId: string | undefined;
    if (files.length) {
      const session = await createAdminRequestUploadSession();
      if (!session.success) {
        setError(adminRequestErrorLabel(session.error, locale));
        setBusy(false);
        return;
      }
      uploadSessionId = session.data.public_id;
      for (const file of files) {
        const upload = await uploadAdminRequestFile(session.data, file);
        if (!upload.success) {
          setError(adminRequestErrorLabel(upload.error, locale));
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
      setError(adminRequestErrorLabel(created.error, locale));
      return;
    }
    router.replace(`${base}/${created.data.id}`);
  }

  return (
    <>
      <PageHeader
        title={adminRequestMessage(locale, 'composer.title')}
        subtitle={adminRequestMessage(locale, 'composer.subtitle')}
      />
      <ResourceView state={types}>
        {(data) => (
          <Card>
            <form className="col" style={{ gap: 16 }} onSubmit={submit} aria-busy={busy}>
              <div className="field">
                <label htmlFor="request-type">{adminRequestMessage(locale, 'composer.type')}</label>
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
                  <option value="">{adminRequestMessage(locale, 'composer.selectType')}</option>
                  {typeRows(data).map((type) => (
                    <option key={type.id} value={type.id}>
                      {adminRequestTypeLabel(type.name, locale)}
                    </option>
                  ))}
                </select>
              </div>

              {needsStudent && (
                <div className="field">
                  <label htmlFor="request-student">{adminRequestMessage(locale, 'composer.student')}</label>
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
                    <option value="">{adminRequestMessage(locale, 'composer.selectStudent')}</option>
                    {(children.data ? (Array.isArray(children.data) ? children.data : children.data.children ?? []) : []).map((child) => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {isAppointment && (
                <Card>
                  <div className="col" style={{ gap: 14 }}>
                    <div>
                      <strong>{adminRequestMessage(locale, 'composer.appointmentDetails')}</strong>
                      <p className="tiny muted" style={{ marginTop: 4 }}>
                        {adminRequestMessage(locale, 'composer.appointmentDetailsHint')}
                      </p>
                    </div>
                    <div className="field">
                      <label htmlFor="appointment-target">{adminRequestMessage(locale, 'composer.appointmentWith')}</label>
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
                        <option value="administration">{adminRequestMessage(locale, 'composer.targetAdministration')}</option>
                        <option value="subject_teacher">{adminRequestMessage(locale, 'composer.targetSubjectTeacher')}</option>
                      </select>
                    </div>

                    {targetKind === 'subject_teacher' && (
                      <div className="field">
                        <label htmlFor="appointment-subject">{adminRequestMessage(locale, 'composer.appointmentSubject')}</label>
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
                              ? adminRequestMessage(locale, 'composer.selectStudentFirst')
                              : appointmentSubjects.loading
                                ? adminRequestMessage(locale, 'composer.loadingSubjects')
                                : appointmentSubjects.error
                                  ? adminRequestMessage(locale, 'composer.subjectsLoadFailed')
                                  : appointmentSubjects.data?.length
                                    ? adminRequestMessage(locale, 'composer.selectSubject')
                                    : adminRequestMessage(locale, 'composer.noSubjects')}
                          </option>
                          {(appointmentSubjects.data ?? []).map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                        <span className="tiny muted">{adminRequestMessage(locale, 'composer.subjectEligibilityHint')}</span>
                      </div>
                    )}

                    <div className="field">
                      <label htmlFor="appointment-date">{adminRequestMessage(locale, 'composer.preferredDate')}</label>
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
                      <label htmlFor="appointment-period">{adminRequestMessage(locale, 'composer.preferredPeriod')}</label>
                      <select
                        id="appointment-period"
                        className="input"
                        value={preferredPeriod}
                        onChange={(event) => setPreferredPeriod(event.target.value as AdminRequestAppointmentPeriod)}
                        disabled={busy}
                      >
                        <option value="morning">{adminRequestMessage(locale, 'composer.periodMorning')}</option>
                        <option value="afternoon">{adminRequestMessage(locale, 'composer.periodAfternoon')}</option>
                        <option value="any">{adminRequestMessage(locale, 'composer.periodAny')}</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )}

              <div className="field">
                <label htmlFor="request-subject">{adminRequestMessage(locale, 'composer.subject')}</label>
                <input
                  id="request-subject"
                  className="input"
                  dir="auto"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={busy}
                  maxLength={250}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="request-description">{adminRequestMessage(locale, 'composer.description')}</label>
                <textarea
                  id="request-description"
                  className="input"
                  dir="auto"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={busy}
                  maxLength={4000}
                  rows={7}
                  required
                />
              </div>
              <div className="field">
                <label>{adminRequestMessage(locale, 'composer.attachmentsOptional')}</label>
                <AdminRequestFilePicker id="request-files" files={files} onChange={setFiles} disabled={busy} />
                <span className="tiny muted">{adminRequestMessage(locale, 'composer.attachmentsHint')}</span>
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {adminRequestMessage(locale, busy ? 'composer.sending' : 'composer.submit')}
              </button>
            </form>
          </Card>
        )}
      </ResourceView>
    </>
  );
}
