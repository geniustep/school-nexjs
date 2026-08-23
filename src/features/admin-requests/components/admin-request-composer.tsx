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
import type { AdminRequestRole, AdminRequestType } from '../types';
import { AdminRequestFilePicker } from './admin-request-file-picker';

function typeRows(value: AdminRequestType[] | { types?: AdminRequestType[]; items?: AdminRequestType[] }) {
  return Array.isArray(value) ? value : value.types ?? value.items ?? [];
}

export function AdminRequestComposer({ role }: { role: Exclude<AdminRequestRole, 'admin'> }) {
  const router = useRouter();
  const [typeId, setTypeId] = useState('');
  const [subject, setSubject] = useState('');
  const [studentId, setStudentId] = useState('');
  const [description, setDescription] = useState('');
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedType = Number(typeId);
    if (!parsedType || !subject.trim() || !description.trim()) {
      setError('أكمل نوع الطلب والموضوع والوصف.');
      return;
    }
    if (role === 'parent' && selectedType?.requires_student && !Number(studentId)) {
      setError('اختر التلميذ المعني بالطلب.');
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
      <PageHeader title="طلب إداري جديد" subtitle="لا تشارك معلومات الدخول أو بيانات لا تخص الطلب." />
      <ResourceView state={types}>
        {(data) => (
          <Card>
            <form className="col" style={{ gap: 16 }} onSubmit={submit} aria-busy={busy}>
              <div className="field">
                <label htmlFor="request-type">نوع الطلب</label>
                <select id="request-type" className="input" value={typeId} onChange={(event) => setTypeId(event.target.value)} disabled={busy} required>
                  <option value="">اختر النوع</option>
                  {typeRows(data).map((type) => <option key={type.id} value={type.id}>{adminRequestTypeLabel(type.name)}</option>)}
                </select>
                {selectedType?.description && <span className="tiny muted">{selectedType.description}</span>}
              </div>
              {role === 'parent' && selectedType?.requires_student && (
                <div className="field">
                  <label htmlFor="request-student">التلميذ المعني</label>
                  <select id="request-student" className="input" value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={busy} required>
                    <option value="">اختر التلميذ</option>
                    {(children.data ? (Array.isArray(children.data) ? children.data : children.data.children ?? []) : []).map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
                  </select>
                </div>
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
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'إنشاء الطلب'}</button>
            </form>
          </Card>
        )}
      </ResourceView>
    </>
  );
}
