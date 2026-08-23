'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, DefinitionList, PageHeader, SectionHead } from '@/components/ui/primitives';
import {
  createAdminRequestUploadSession,
  postAdminAction,
  postRequesterAction,
  uploadAdminRequestFile,
} from '../api';
import type { AdminRequest, AdminRequestAttachment, AdminRequestRole } from '../types';
import { requestTitle } from '../types';

function AttachmentList({ attachments }: { attachments?: AdminRequestAttachment[] }) {
  if (!attachments?.length) return null;
  return (
    <ul className="col" style={{ gap: 8, paddingInlineStart: 18 }}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a href={`/api/odoo/attachments/${attachment.id}/download`} className="btn btn--ghost btn--sm">
            {attachment.name}
          </a>
          <span className="tiny muted"> · {attachment.mimetype ?? 'file'}{attachment.size ? ` · ${attachment.size} B` : ''}</span>
        </li>
      ))}
    </ul>
  );
}

export function AdminRequestDetailPage({ role, requestId }: { role: AdminRequestRole; requestId: string }) {
  const base = role === 'admin' ? '/admin/admin-requests' : `/${role}/admin-requests`;
  const state = useResource<AdminRequest>(`${base}/${requestId}`, undefined, { keepPreviousData: false });
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: string) {
    setError(null);
    setBusy(true);
    const response = role === 'admin'
      ? await postAdminAction(requestId, action, note.trim() ? { note } : undefined)
      : await postRequesterAction(role, requestId, action as 'submit' | 'cancel');
    setBusy(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    state.reload();
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role === 'admin' || !reply.trim()) return;
    setError(null);
    setBusy(true);
    let uploadSessionId: string | undefined;
    if (files.length) {
      if (files.length > 5) {
        setError('الحد الأقصى خمسة ملفات.');
        setBusy(false);
        return;
      }
      const session = await createAdminRequestUploadSession();
      if (!session.success) {
        setError(session.error.message);
        setBusy(false);
        return;
      }
      uploadSessionId = session.data.public_id;
      for (const file of files) {
        const uploaded = await uploadAdminRequestFile(session.data, file);
        if (!uploaded.success) {
          setError(uploaded.error.message);
          setBusy(false);
          return;
        }
      }
    }
    const response = await postRequesterAction(role, requestId, 'reply', {
      body: reply,
      ...(uploadSessionId ? { upload_session_id: uploadSessionId } : {}),
    });
    setBusy(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setReply('');
    setFiles([]);
    state.reload();
  }

  return (
    <ResourceView state={state}>
      {(request) => (
        <>
          <PageHeader
            title={requestTitle(request)}
            subtitle={request.reference ?? `طلب #${request.id}`}
            actions={<Link href={base} className="btn btn--ghost">العودة إلى القائمة</Link>}
          />
          <Card>
            <div className="between">
              <Badge tone="blue">{request.state}</Badge>
              {request.requester_role && <span className="tiny muted">{request.requester_role}</span>}
            </div>
            <DefinitionList items={[
              { label: 'النوع', value: typeof request.type === 'string' ? request.type : request.type?.name ?? '—' },
              { label: 'تاريخ الإنشاء', value: request.created_at ? new Date(request.created_at).toLocaleString() : '—' },
              { label: 'الوصف', value: request.description ?? '—' },
            ]} />
            <AttachmentList attachments={request.attachments} />
          </Card>

          {!!request.replies?.length && (
            <section className="section">
              <SectionHead title="الردود" />
              <div className="col" style={{ gap: 12 }}>
                {request.replies.map((item) => (
                  <Card key={item.id}>
                    <strong>{item.author_role}</strong>
                    <p>{item.body}</p>
                    <AttachmentList attachments={item.attachments} />
                  </Card>
                ))}
              </div>
            </section>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}

          {role !== 'admin' && request.allowed_actions?.includes('requester_reply') && (
            <section className="section">
              <SectionHead title="إضافة رد" />
              <Card>
                <form className="col" style={{ gap: 12 }} onSubmit={sendReply}>
                  <textarea className="input" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} rows={5} required disabled={busy} />
                  <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} disabled={busy} />
                  <button className="btn btn--primary" disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال الرد'}</button>
                </form>
              </Card>
            </section>
          )}

          <section className="section">
            <SectionHead title="الإجراءات المتاحة" />
            <Card>
              {role === 'admin' && (
                <div className="field">
                  <label htmlFor="request-note">ملاحظة الإجراء</label>
                  <textarea id="request-note" className="input" value={note} onChange={(event) => setNote(event.target.value)} maxLength={4000} rows={3} disabled={busy} />
                </div>
              )}
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {(request.allowed_actions ?? []).filter((action) => action !== 'reply').map((action) => (
                  <button key={action} type="button" className="btn btn--ghost" disabled={busy} onClick={() => act(action)}>
                    {action}
                  </button>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </ResourceView>
  );
}
