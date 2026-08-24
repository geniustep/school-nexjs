'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import { ResourceView } from '@/components/states/resource';
import { Badge, Card, DefinitionList, PageHeader, SectionHead } from '@/components/ui/primitives';
import {
  createAdminRequestUploadSession,
  postAdminAction,
  postRequesterAction,
  postStaffAction,
  uploadAdminRequestFile,
} from '../api';
import {
  adminRequestActionLabel,
  adminRequestRoleLabel,
  adminRequestStateLabel,
  adminRequestTypeLabel,
  staffOptionRows,
} from '../presenters';
import type { AdminRequest, AdminRequestAttachment, AdminRequestRole } from '../types';
import {
  adminRequestApiBase,
  adminRequestUiBase,
  requestTitle,
} from '../types';
import { AdminRequestFilePicker } from './admin-request-file-picker';

function AttachmentList({ attachments }: { attachments?: AdminRequestAttachment[] }) {
  if (!attachments?.length) return null;
  return (
    <ul className="col" style={{ gap: 8, paddingInlineStart: 18 }}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a href={`/api/odoo/attachments/${attachment.id}/download`} className="btn btn--ghost btn--sm">
            {attachment.name}
          </a>
          <span className="tiny muted">
            {' · '}{attachment.mimetype ?? 'ملف'}
            {attachment.size ? ` · ${attachment.size.toLocaleString('ar-MA')} بايت` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

function isFamilyRole(role: AdminRequestRole): role is 'parent' | 'student' {
  return role === 'parent' || role === 'student';
}

export function AdminRequestDetailPage({ role, requestId }: { role: AdminRequestRole; requestId: string }) {
  const apiBase = adminRequestApiBase(role);
  const uiBase = adminRequestUiBase(role);
  const state = useResource<AdminRequest>(`${apiBase}/${requestId}`, undefined, { keepPreviousData: false });
  const staffOptions = useResource<unknown>(role === 'admin' ? endpoints.admin.staffOptions : null, undefined, {
    keepPreviousData: false,
  });
  const [reply, setReply] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const staffRows = staffOptions.data ? staffOptionRows(staffOptions.data) : [];

  async function act(action: string) {
    setError(null);
    if (role === 'admin' && action === 'refer' && !Number(assigneeId)) {
      setError('اختر الموظف المسؤول قبل إحالة الطلب.');
      return;
    }

    setBusy(true);
    const response = role === 'admin'
      ? await postAdminAction(
          requestId,
          action,
          action === 'resolve'
            ? { resolution_summary: note }
            : action === 'refer'
              ? { assigned_user_id: Number(assigneeId) }
              : note.trim() ? { reason: note } : undefined,
        )
      : role === 'staff'
        ? await postStaffAction(
            requestId,
            action as 'wait_requester' | 'resolve',
            action === 'resolve'
              ? { resolution_summary: note }
              : note.trim() ? { reason: note } : undefined,
          )
        : await postRequesterAction(role, requestId, action as 'submit' | 'cancel');
    setBusy(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setNote('');
    state.reload();
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFamilyRole(role) || !reply.trim()) return;
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
    setReplyOpen(false);
    state.reload();
  }

  return (
    <ResourceView state={state}>
      {(request) => {
        const requestTypeName = typeof request.type === 'string' ? request.type : request.type?.name;
        const actions = request.allowed_actions ?? [];
        const canRequesterReply = isFamilyRole(role) && (actions.includes('reply') || actions.includes('requester_reply'));
        const visibleActions = actions.filter(
          (action) =>
            action !== 'reply' &&
            action !== 'requester_reply' &&
            action !== 'start_review' &&
            action !== 'start_processing',
        );
        const createdAt = request.created_at ?? request.create_date;
        const waitingRequester = request.state === 'waiting_requester' || request.state === 'wait_requester';
        const isOperator = role === 'admin' || role === 'staff';
        const details = [
          { label: 'النوع', value: adminRequestTypeLabel(requestTypeName) },
          { label: 'تاريخ الإنشاء', value: createdAt ? new Date(createdAt).toLocaleString('ar-MA') : '—' },
          { label: 'الوصف', value: request.description ?? '—' },
          ...(request.assigned?.name
            ? [{ label: 'المسؤول الحالي', value: request.assigned.name }]
            : []),
          ...(request.assigned_at
            ? [{ label: 'تاريخ الإحالة', value: new Date(request.assigned_at).toLocaleString('ar-MA') }]
            : []),
        ];

        return (
          <>
            <PageHeader
              title={requestTitle(request)}
              subtitle={request.reference ?? `طلب #${request.id}`}
              actions={<Link href={uiBase} className="btn btn--ghost">العودة إلى القائمة</Link>}
            />
            <Card>
              <div className="between">
                <Badge tone="blue">{adminRequestStateLabel(request.state)}</Badge>
                {request.requester_role && <span className="tiny muted">{adminRequestRoleLabel(request.requester_role)}</span>}
              </div>
              <DefinitionList items={details} />
              <AttachmentList attachments={request.attachments} />
            </Card>

            {!!request.replies?.length && (
              <section className="section">
                <SectionHead title="الرسائل" />
                <div className="col" style={{ gap: 12 }}>
                  {request.replies.map((item) => (
                    <Card key={item.id}>
                      <strong>{adminRequestRoleLabel(item.author_role)}</strong>
                      <p>{item.body}</p>
                      {item.created_at && <p className="tiny muted">{new Date(item.created_at).toLocaleString('ar-MA')}</p>}
                      <AttachmentList attachments={item.attachments} />
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {error && <div className="form-error" role="alert">{error}</div>}

            {canRequesterReply && !replyOpen && (
              <div className="row" style={{ gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                {waitingRequester && (
                  <span className="tiny muted">الإدارة تنتظر معلومات إضافية منك.</span>
                )}
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setReplyOpen(true)}
                  disabled={busy}
                >
                  {waitingRequester ? 'الرد على الإدارة' : 'إضافة رسالة'}
                </button>
              </div>
            )}

            {canRequesterReply && replyOpen && (
              <section className="section">
                <SectionHead title={waitingRequester ? 'الرد على الإدارة' : 'إضافة رسالة'} />
                <Card>
                  <form className="col" style={{ gap: 12 }} onSubmit={sendReply}>
                    <textarea
                      className="input"
                      aria-label="نص الرسالة"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={4000}
                      rows={5}
                      required
                      disabled={busy}
                      placeholder={waitingRequester ? 'اكتب المعلومات التي طلبتها الإدارة…' : 'اكتب رسالتك الإضافية…'}
                    />
                    <AdminRequestFilePicker id="request-reply-files" files={files} onChange={setFiles} disabled={busy} />
                    <span className="tiny muted">حتى 5 ملفات، بحد أقصى 10 MiB للملف.</span>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn--primary" disabled={busy}>
                        {busy ? 'جارٍ الإرسال…' : 'إرسال الرسالة'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        disabled={busy}
                        onClick={() => {
                          setReplyOpen(false);
                          setReply('');
                          setFiles([]);
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </Card>
              </section>
            )}

            {visibleActions.length > 0 && (
              <section className="section">
                <SectionHead title={role === 'staff' ? 'معالجة الطلب' : 'الإجراءات المتاحة'} />
                <Card>
                  {isOperator && (
                    <div className="col" style={{ gap: 12 }}>
                      <div className="field">
                        <label htmlFor="request-note">ملاحظة الإجراء</label>
                        <textarea
                          id="request-note"
                          className="input"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          maxLength={4000}
                          rows={3}
                          disabled={busy}
                          placeholder="أضف ملاحظة عند الحاجة…"
                        />
                      </div>
                      {role === 'admin' && request.allowed_actions?.includes('refer') && (
                        <div className="field">
                          <label htmlFor="request-assignee">الموظف المسؤول</label>
                          <select
                            id="request-assignee"
                            className="input"
                            value={assigneeId}
                            onChange={(event) => setAssigneeId(event.target.value)}
                            disabled={busy || staffOptions.loading || Boolean(staffOptions.error)}
                          >
                            <option value="">
                              {staffOptions.loading
                                ? 'جارٍ تحميل الموظفين…'
                                : staffOptions.error
                                  ? 'تعذر تحميل قائمة الموظفين'
                                  : staffRows.length
                                    ? 'اختر الموظف المسؤول'
                                    : 'لا يوجد موظفون متاحون'}
                            </option>
                            {staffRows.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name}{staff.detail ? ` — ${staff.detail}` : ''}
                              </option>
                            ))}
                          </select>
                          {staffOptions.error && <span className="tiny form-error">تعذر تحميل قائمة الموظفين. أعد المحاولة بعد تحديث الصفحة.</span>}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: isOperator ? 12 : 0 }}>
                    {visibleActions.map((action) => (
                      <button key={action} type="button" className="btn btn--ghost" disabled={busy} onClick={() => act(action)}>
                        {adminRequestActionLabel(action)}
                      </button>
                    ))}
                  </div>
                </Card>
              </section>
            )}
          </>
        );
      }}
    </ResourceView>
  );
}
